"""Paulispan ERP — Main FastAPI server."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging  # noqa: E402
import os  # noqa: E402
from datetime import datetime, timezone  # noqa: E402

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from auth import (  # noqa: E402
    ROLES,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    set_auth_cookies,
    verify_password,
)
from models import LoginRequest, UserCreate, UserOut  # noqa: E402
from routes_business import router as business_router  # noqa: E402
from routes_operacao import router as ops_router  # noqa: E402

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(title="Paulispan ERP API", version="1.0.0")
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# AUTH ROUTES
# ---------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, response: Response, request: Request):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # brute force lockout
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until")
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em 15 minutos.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        new_count = (attempts.get("count", 0) + 1) if attempts else 1
        locked_until = None
        if new_count >= 5:
            from datetime import timedelta

            locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": new_count, "locked_until": locked_until}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    # Success – clear attempts
    await db.login_attempts.delete_one({"identifier": identifier})

    uid = str(user["_id"])
    access = create_access_token(uid, user["email"], user["role"])
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)

    return {
        "id": uid,
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user["role"],
    }


@api_router.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token ausente")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        from bson import ObjectId

        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        access = create_access_token(str(user["_id"]), user["email"], user["role"])
        new_refresh = create_refresh_token(str(user["_id"]))
        set_auth_cookies(response, access, new_refresh)
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


# ---------------------------------------------------------------------------
# USUÁRIOS (admin)
# ---------------------------------------------------------------------------
@api_router.get("/users")
async def list_users(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Somente admin")
    docs = await db.users.find({}).to_list(200)
    return [
        {
            "id": str(d["_id"]),
            "email": d["email"],
            "name": d.get("name", ""),
            "role": d.get("role"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]


@api_router.post("/users", response_model=UserOut)
async def create_user(payload: UserCreate, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Somente admin")
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Perfil inválido")
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        "email": doc["email"],
        "name": doc["name"],
        "role": doc["role"],
        "created_at": doc["created_at"],
    }


# ---------------------------------------------------------------------------
# HEALTH
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"service": "Paulispan ERP API", "status": "ok"}


# ---------------------------------------------------------------------------
# Include business routes
# ---------------------------------------------------------------------------
api_router.include_router(business_router)
api_router.include_router(ops_router)
app.include_router(api_router)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
frontend_url = os.environ.get("FRONTEND_URL", "*")
origins = [frontend_url] if frontend_url != "*" else ["*"]
# also allow local dev
if "http://localhost:3000" not in origins:
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("paulispan")


# ---------------------------------------------------------------------------
# STARTUP: indexes + admin seed
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier")
        await db.clientes.create_index("codigo")
        await db.clientes.create_index("nome_loja")
        await db.produtos.create_index("sku", unique=True)
        await db.pedidos.create_index("numero", unique=True)
        await db.pedidos.create_index("cliente_id")
        await db.pedidos.create_index("data_pedido")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@paulispan.com.br").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one(
            {
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "name": "Administrador Paulispan",
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            }
        )
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Updated admin password: {admin_email}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
