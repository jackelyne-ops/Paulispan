"""Business routes: clientes, produtos, pedidos, dashboard, financeiro."""
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import get_current_user, require_permission
from models import (
    PEDIDO_STATUS,
    STATUS_CONTA_FATURAMENTO,
    ClienteCreate,
    ClienteOut,
    PedidoCreate,
    PedidoItemOut,
    PedidoOut,
    PedidoStatusUpdate,
    ProdutoCreate,
    ProdutoOut,
)

router = APIRouter()


def _now():
    return datetime.now(timezone.utc)


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")


def _cliente_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


def _produto_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    pv = doc.get("preco_venda", 0) or 0
    cu = doc.get("custo", 0) or 0
    doc["margem_pct"] = round(((pv - cu) / pv * 100), 2) if pv else 0.0
    return doc


def _pedido_out(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ============================================================================
# CLIENTES
# ============================================================================
@router.get("/clientes", response_model=List[ClienteOut])
async def listar_clientes(
    request: Request,
    q: Optional[str] = None,
    status: Optional[str] = None,
    cidade: Optional[str] = None,
    estado: Optional[str] = None,
    user=Depends(require_permission("clientes:read")),
):
    from server import db

    filt: dict = {}
    if q:
        filt["$or"] = [
            {"nome_rede": {"$regex": q, "$options": "i"}},
            {"nome_loja": {"$regex": q, "$options": "i"}},
            {"cnpj": {"$regex": q, "$options": "i"}},
            {"codigo": {"$regex": q, "$options": "i"}},
        ]
    if status:
        filt["status"] = status
    if cidade:
        filt["cidade"] = cidade
    if estado:
        filt["estado"] = estado

    docs = await db.clientes.find(filt).sort("nome_loja", 1).to_list(500)
    return [_cliente_out(d) for d in docs]


@router.post("/clientes", response_model=ClienteOut)
async def criar_cliente(
    payload: ClienteCreate,
    user=Depends(require_permission("clientes")),
):
    from server import db

    now = _now()
    doc = payload.model_dump()
    if not doc.get("codigo"):
        count = await db.clientes.count_documents({})
        doc["codigo"] = f"CLI-{(count + 1):05d}"
    doc["created_at"] = now
    doc["updated_at"] = now
    res = await db.clientes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _cliente_out(doc)


@router.get("/clientes/{cliente_id}", response_model=ClienteOut)
async def get_cliente(cliente_id: str, user=Depends(require_permission("clientes:read"))):
    from server import db

    doc = await db.clientes.find_one({"_id": _oid(cliente_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _cliente_out(doc)


@router.put("/clientes/{cliente_id}", response_model=ClienteOut)
async def atualizar_cliente(
    cliente_id: str,
    payload: ClienteCreate,
    user=Depends(require_permission("clientes")),
):
    from server import db

    update = payload.model_dump()
    update["updated_at"] = _now()
    res = await db.clientes.find_one_and_update(
        {"_id": _oid(cliente_id)}, {"$set": update}, return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _cliente_out(res)


@router.delete("/clientes/{cliente_id}")
async def deletar_cliente(cliente_id: str, user=Depends(require_permission("clientes"))):
    from server import db

    res = await db.clientes.delete_one({"_id": _oid(cliente_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"ok": True}


@router.get("/clientes/{cliente_id}/resumo")
async def resumo_cliente(cliente_id: str, user=Depends(require_permission("clientes:read"))):
    """Painel individual do cliente: histórico, faturamento, lucro, devoluções."""
    from server import db

    cliente = await db.clientes.find_one({"_id": _oid(cliente_id)})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    pedidos = await db.pedidos.find({"cliente_id": cliente_id}).sort("data_pedido", -1).to_list(500)

    total_faturado = 0.0
    total_custo = 0.0
    total_devolvido = 0.0
    qtd_pedidos = len(pedidos)
    qtd_entregas = 0
    qtd_devolucoes = 0

    for p in pedidos:
        if p.get("status") in STATUS_CONTA_FATURAMENTO:
            total_faturado += p.get("total", 0)
            total_custo += p.get("custo_total", 0)
        if p.get("status") == "entregue":
            qtd_entregas += 1
        if p.get("status") in {"cancelado", "nao_entregue"}:
            qtd_devolucoes += 1
            total_devolvido += p.get("total", 0)

    lucro = total_faturado - total_custo
    margem = (lucro / total_faturado * 100) if total_faturado else 0.0
    ticket_medio = (total_faturado / qtd_pedidos) if qtd_pedidos else 0.0

    return {
        "cliente": _cliente_out(cliente),
        "kpis": {
            "faturamento_total": round(total_faturado, 2),
            "custo_total": round(total_custo, 2),
            "lucro": round(lucro, 2),
            "margem_pct": round(margem, 2),
            "qtd_pedidos": qtd_pedidos,
            "qtd_entregas": qtd_entregas,
            "qtd_devolucoes": qtd_devolucoes,
            "valor_devolvido": round(total_devolvido, 2),
            "ticket_medio": round(ticket_medio, 2),
        },
        "pedidos": [_pedido_out(p) for p in pedidos],
    }


# ============================================================================
# PRODUTOS
# ============================================================================
@router.get("/produtos", response_model=List[ProdutoOut])
async def listar_produtos(
    q: Optional[str] = None,
    categoria: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(require_permission("produtos:read")),
):
    from server import db

    filt: dict = {}
    if q:
        filt["$or"] = [
            {"nome": {"$regex": q, "$options": "i"}},
            {"sku": {"$regex": q, "$options": "i"}},
        ]
    if categoria:
        filt["categoria"] = categoria
    if status:
        filt["status"] = status

    docs = await db.produtos.find(filt).sort("nome", 1).to_list(500)
    return [_produto_out(d) for d in docs]


@router.post("/produtos", response_model=ProdutoOut)
async def criar_produto(payload: ProdutoCreate, user=Depends(require_permission("produtos"))):
    from server import db

    exists = await db.produtos.find_one({"sku": payload.sku})
    if exists:
        raise HTTPException(status_code=409, detail="SKU já cadastrado")

    now = _now()
    doc = payload.model_dump()
    # auto compute peso_esperado_balanca if not provided
    if not doc.get("peso_esperado_balanca_g"):
        doc["peso_esperado_balanca_g"] = (doc.get("peso_liquido_g") or 0) + (doc.get("tara_g") or 0)
    doc["created_at"] = now
    doc["updated_at"] = now
    res = await db.produtos.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _produto_out(doc)


@router.get("/produtos/{produto_id}", response_model=ProdutoOut)
async def get_produto(produto_id: str, user=Depends(require_permission("produtos:read"))):
    from server import db

    doc = await db.produtos.find_one({"_id": _oid(produto_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return _produto_out(doc)


@router.put("/produtos/{produto_id}", response_model=ProdutoOut)
async def atualizar_produto(
    produto_id: str, payload: ProdutoCreate, user=Depends(require_permission("produtos"))
):
    from server import db

    update = payload.model_dump()
    if not update.get("peso_esperado_balanca_g"):
        update["peso_esperado_balanca_g"] = (update.get("peso_liquido_g") or 0) + (
            update.get("tara_g") or 0
        )
    update["updated_at"] = _now()
    res = await db.produtos.find_one_and_update(
        {"_id": _oid(produto_id)}, {"$set": update}, return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return _produto_out(res)


@router.delete("/produtos/{produto_id}")
async def deletar_produto(produto_id: str, user=Depends(require_permission("produtos"))):
    from server import db

    res = await db.produtos.delete_one({"_id": _oid(produto_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"ok": True}


# ============================================================================
# PEDIDOS
# ============================================================================
async def _next_pedido_numero(db) -> str:
    count = await db.pedidos.count_documents({})
    return f"PED-{(count + 1):06d}"


async def _build_pedido_items(db, items_in) -> tuple[list, float, float]:
    if not items_in:
        raise HTTPException(status_code=400, detail="Pedido precisa ter ao menos 1 item")

    out_items = []
    subtotal = 0.0
    custo_total = 0.0
    for it in items_in:
        prod = await db.produtos.find_one({"_id": _oid(it.produto_id)})
        if not prod:
            raise HTTPException(status_code=400, detail=f"Produto {it.produto_id} não encontrado")
        item_subtotal = it.qtd * it.preco_unit - (it.desconto or 0)
        item_custo = it.qtd * (prod.get("custo", 0) or 0)
        out_items.append(
            {
                "produto_id": str(prod["_id"]),
                "sku": prod.get("sku", ""),
                "nome": prod.get("nome", ""),
                "qtd": it.qtd,
                "preco_unit": it.preco_unit,
                "custo_unit": prod.get("custo", 0) or 0,
                "desconto": it.desconto or 0,
                "subtotal": round(item_subtotal, 2),
            }
        )
        subtotal += item_subtotal
        custo_total += item_custo
    return out_items, round(subtotal, 2), round(custo_total, 2)


@router.get("/pedidos", response_model=List[PedidoOut])
async def listar_pedidos(
    q: Optional[str] = None,
    status: Optional[str] = None,
    cliente_id: Optional[str] = None,
    user=Depends(require_permission("pedidos:read")),
):
    from server import db

    filt: dict = {}
    if q:
        filt["$or"] = [
            {"numero": {"$regex": q, "$options": "i"}},
            {"cliente_rede": {"$regex": q, "$options": "i"}},
            {"cliente_loja": {"$regex": q, "$options": "i"}},
        ]
    if status:
        filt["status"] = status
    if cliente_id:
        filt["cliente_id"] = cliente_id

    docs = await db.pedidos.find(filt).sort("data_pedido", -1).to_list(500)
    return [_pedido_out(d) for d in docs]


@router.post("/pedidos", response_model=PedidoOut)
async def criar_pedido(payload: PedidoCreate, user=Depends(require_permission("pedidos"))):
    from server import db

    cliente = await db.clientes.find_one({"_id": _oid(payload.cliente_id)})
    if not cliente:
        raise HTTPException(status_code=400, detail="Cliente inválido")

    items, subtotal, custo_total = await _build_pedido_items(db, payload.items)
    total = round(subtotal - (payload.desconto or 0), 2)
    lucro = round(total - custo_total, 2)
    margem_pct = round((lucro / total * 100), 2) if total else 0.0

    now = _now()
    doc = {
        "numero": await _next_pedido_numero(db),
        "cliente_id": str(cliente["_id"]),
        "cliente_rede": cliente.get("nome_rede", ""),
        "cliente_loja": cliente.get("nome_loja", ""),
        "cidade": cliente.get("cidade"),
        "regiao": cliente.get("regiao"),
        "data_pedido": now,
        "data_prevista_entrega": payload.data_prevista_entrega,
        "vendedor": payload.vendedor or user.get("name"),
        "observacoes": payload.observacoes,
        "status": "aguardando",
        "items": items,
        "subtotal": subtotal,
        "desconto": payload.desconto or 0,
        "total": total,
        "custo_total": custo_total,
        "lucro": lucro,
        "margem_pct": margem_pct,
        "created_by": user.get("email"),
        "created_at": now,
        "updated_at": now,
    }
    res = await db.pedidos.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _pedido_out(doc)


@router.get("/pedidos/{pedido_id}", response_model=PedidoOut)
async def get_pedido(pedido_id: str, user=Depends(require_permission("pedidos:read"))):
    from server import db

    doc = await db.pedidos.find_one({"_id": _oid(pedido_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return _pedido_out(doc)


@router.patch("/pedidos/{pedido_id}/status", response_model=PedidoOut)
async def atualizar_status_pedido(
    pedido_id: str,
    payload: PedidoStatusUpdate,
    user=Depends(require_permission("pedidos")),
):
    from server import db

    if payload.status not in PEDIDO_STATUS:
        raise HTTPException(status_code=400, detail="Status inválido")
    res = await db.pedidos.find_one_and_update(
        {"_id": _oid(pedido_id)},
        {"$set": {"status": payload.status, "updated_at": _now()}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return _pedido_out(res)


@router.delete("/pedidos/{pedido_id}")
async def deletar_pedido(pedido_id: str, user=Depends(require_permission("pedidos"))):
    from server import db

    res = await db.pedidos.delete_one({"_id": _oid(pedido_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return {"ok": True}


# ============================================================================
# DASHBOARD
# ============================================================================
@router.get("/dashboard/kpis")
async def dashboard_kpis(user=Depends(require_permission("dashboard"))):
    from server import db

    pedidos = await db.pedidos.find({}).to_list(2000)
    faturamento = 0.0
    custo = 0.0
    pedidos_abertos = 0
    pedidos_entregues = 0
    pedidos_nao_entregues = 0
    devolucoes = 0
    valor_devolvido = 0.0

    for p in pedidos:
        st = p.get("status")
        if st in STATUS_CONTA_FATURAMENTO:
            faturamento += p.get("total", 0)
            custo += p.get("custo_total", 0)
        if st in {"aguardando", "em_producao", "faturado", "em_rota"}:
            pedidos_abertos += 1
        if st == "entregue":
            pedidos_entregues += 1
        if st in {"nao_entregue", "cancelado"}:
            pedidos_nao_entregues += 1
            devolucoes += 1
            valor_devolvido += p.get("total", 0)

    lucro = faturamento - custo
    margem = (lucro / faturamento * 100) if faturamento else 0.0

    clientes_ativos = await db.clientes.count_documents({"status": "ativo"})
    total_produtos = await db.produtos.count_documents({"status": "ativo"})

    # Por status – donut
    status_dist = {s: 0 for s in PEDIDO_STATUS}
    for p in pedidos:
        st = p.get("status", "aguardando")
        status_dist[st] = status_dist.get(st, 0) + 1

    # Top 5 produtos por faturamento
    prod_agg: dict = {}
    for p in pedidos:
        if p.get("status") not in STATUS_CONTA_FATURAMENTO:
            continue
        for it in p.get("items", []):
            key = it["produto_id"]
            entry = prod_agg.setdefault(key, {"nome": it["nome"], "qtd": 0, "faturamento": 0.0})
            entry["qtd"] += it["qtd"]
            entry["faturamento"] += it["subtotal"]
    top_produtos = sorted(prod_agg.values(), key=lambda x: x["faturamento"], reverse=True)[:5]

    # Faturamento por dia (últimos 30 dias)
    from collections import defaultdict

    daily: dict = defaultdict(float)
    for p in pedidos:
        if p.get("status") not in STATUS_CONTA_FATURAMENTO:
            continue
        d = p.get("data_pedido")
        if isinstance(d, datetime):
            key = d.strftime("%Y-%m-%d")
            daily[key] += p.get("total", 0)
    faturamento_diario = [
        {"data": k, "valor": round(v, 2)} for k, v in sorted(daily.items())[-30:]
    ]

    return {
        "faturamento": round(faturamento, 2),
        "custo": round(custo, 2),
        "lucro": round(lucro, 2),
        "margem_pct": round(margem, 2),
        "pedidos_total": len(pedidos),
        "pedidos_abertos": pedidos_abertos,
        "pedidos_entregues": pedidos_entregues,
        "pedidos_nao_entregues": pedidos_nao_entregues,
        "devolucoes_qtd": devolucoes,
        "valor_devolvido": round(valor_devolvido, 2),
        "clientes_ativos": clientes_ativos,
        "produtos_ativos": total_produtos,
        "ticket_medio": round(faturamento / len(pedidos), 2) if pedidos else 0.0,
        "status_distribuicao": status_dist,
        "top_produtos": top_produtos,
        "faturamento_diario": faturamento_diario,
    }


# ============================================================================
# FINANCEIRO (visão simples fase 1)
# ============================================================================
@router.get("/financeiro/resultado")
async def resultado_financeiro(
    cliente_id: Optional[str] = None,
    user=Depends(require_permission("financeiro:read")),
):
    from server import db

    filt: dict = {}
    if cliente_id:
        filt["cliente_id"] = cliente_id
    pedidos = await db.pedidos.find(filt).sort("data_pedido", -1).to_list(1000)

    linhas = []
    total_receita = 0.0
    total_custo = 0.0
    total_desconto = 0.0
    total_devolvido = 0.0
    for p in pedidos:
        contab = p.get("status") in STATUS_CONTA_FATURAMENTO
        devolvido = p.get("status") in {"cancelado", "nao_entregue"}
        receita = p.get("total", 0) if contab else 0.0
        custo = p.get("custo_total", 0) if contab else 0.0
        lucro = receita - custo
        margem = (lucro / receita * 100) if receita else 0.0
        linhas.append(
            {
                "pedido_id": str(p["_id"]),
                "numero": p.get("numero"),
                "cliente": f"{p.get('cliente_rede','')} — {p.get('cliente_loja','')}",
                "data": p.get("data_pedido"),
                "status": p.get("status"),
                "receita": round(receita, 2),
                "custo": round(custo, 2),
                "desconto": round(p.get("desconto", 0), 2),
                "lucro": round(lucro, 2),
                "margem_pct": round(margem, 2),
            }
        )
        total_receita += receita
        total_custo += custo
        total_desconto += p.get("desconto", 0) or 0
        if devolvido:
            total_devolvido += p.get("total", 0)

    lucro_total = total_receita - total_custo
    margem_total = (lucro_total / total_receita * 100) if total_receita else 0.0

    return {
        "totais": {
            "receita": round(total_receita, 2),
            "custo": round(total_custo, 2),
            "desconto": round(total_desconto, 2),
            "devolvido": round(total_devolvido, 2),
            "lucro": round(lucro_total, 2),
            "margem_pct": round(margem_total, 2),
        },
        "linhas": linhas,
    }
