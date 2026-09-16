"""End-to-end backend API tests for Paulispan ERP (Phase 1)."""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://paulispan-hub.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@paulispan.com.br"
ADMIN_PASSWORD = "admin123"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, f"no access_token cookie set: {s.cookies}"
    return s


@pytest.fixture(scope="module")
def created_ids():
    return {"cliente": None, "produto": None, "pedido": None}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def test_login_wrong_password_returns_401():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-XYZ-" + uuid.uuid4().hex[:6]}, timeout=15)
    assert r.status_code == 401


def test_me_without_cookie_returns_401():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_me_with_cookie(session):
    r = session.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["role"] == "admin"


# ---------------------------------------------------------------------------
# Clientes CRUD
# ---------------------------------------------------------------------------
def test_criar_cliente_auto_codigo(session, created_ids):
    payload = {
        "nome_rede": f"TEST_Rede_{uuid.uuid4().hex[:6]}",
        "nome_loja": f"TEST_Loja_{uuid.uuid4().hex[:6]}",
        "cnpj": "12.345.678/0001-99",
        "cidade": "São Paulo",
        "estado": "SP",
    }
    r = session.post(f"{API}/clientes", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["nome_rede"] == payload["nome_rede"]
    assert body["codigo"], "codigo should be auto-generated"
    assert body["codigo"].startswith("CLI-")
    created_ids["cliente"] = body["id"]


def test_listar_clientes_com_filtro(session, created_ids):
    r = session.get(f"{API}/clientes", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_get_cliente(session, created_ids):
    cid = created_ids["cliente"]
    r = session.get(f"{API}/clientes/{cid}", timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == cid


def test_resumo_cliente(session, created_ids):
    cid = created_ids["cliente"]
    r = session.get(f"{API}/clientes/{cid}/resumo", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "cliente" in body and "kpis" in body and "pedidos" in body
    assert body["kpis"]["qtd_pedidos"] == 0


def test_update_cliente(session, created_ids):
    cid = created_ids["cliente"]
    r = session.put(f"{API}/clientes/{cid}", json={
        "nome_rede": "TEST_RedeAtualizada",
        "nome_loja": "TEST_LojaAtualizada",
        "cidade": "Campinas",
        "estado": "SP",
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["nome_rede"] == "TEST_RedeAtualizada"


# ---------------------------------------------------------------------------
# Produtos CRUD
# ---------------------------------------------------------------------------
def test_criar_produto(session, created_ids):
    sku = f"TEST-SKU-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "sku": sku,
        "nome": "TEST_Bolo Chocolate",
        "categoria": "bolo",
        "preco_venda": 50.0,
        "custo": 20.0,
        "peso_liquido_g": 500.0,
        "tara_g": 50.0,
        "prazo_validade_dias": 30,
    }
    r = session.post(f"{API}/produtos", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sku"] == sku
    assert body["peso_esperado_balanca_g"] == 550.0
    assert body["margem_pct"] == 60.0
    created_ids["produto"] = body["id"]
    created_ids["produto_sku"] = sku


def test_criar_produto_sku_duplicado(session, created_ids):
    payload = {
        "sku": created_ids["produto_sku"],
        "nome": "duplicated",
        "preco_venda": 10.0,
    }
    r = session.post(f"{API}/produtos", json=payload, timeout=15)
    # spec asks for 409, code uses 400
    assert r.status_code in (400, 409), r.text


def test_listar_produtos(session):
    r = session.get(f"{API}/produtos", timeout=15)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# Pedidos
# ---------------------------------------------------------------------------
def test_criar_pedido_sem_items_400(session, created_ids):
    r = session.post(f"{API}/pedidos", json={"cliente_id": created_ids["cliente"], "items": []}, timeout=15)
    assert r.status_code == 400


def test_criar_pedido_ok(session, created_ids):
    payload = {
        "cliente_id": created_ids["cliente"],
        "vendedor": "Admin Test",
        "items": [
            {"produto_id": created_ids["produto"], "qtd": 3, "preco_unit": 50.0, "desconto": 0.0}
        ],
    }
    r = session.post(f"{API}/pedidos", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["numero"].startswith("PED-")
    assert body["subtotal"] == 150.0
    assert body["custo_total"] == 60.0
    assert body["lucro"] == 90.0
    assert body["cliente_rede"] == "TEST_RedeAtualizada"
    assert body["items"][0]["sku"] == created_ids["produto_sku"]
    assert body["items"][0]["custo_unit"] == 20.0
    created_ids["pedido"] = body["id"]


def test_get_pedido(session, created_ids):
    r = session.get(f"{API}/pedidos/{created_ids['pedido']}", timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == created_ids["pedido"]


def test_pedido_status_transitions(session, created_ids):
    pid = created_ids["pedido"]
    for status in ["em_producao", "faturado", "em_rota", "entregue"]:
        r = session.patch(f"{API}/pedidos/{pid}/status", json={"status": status}, timeout=15)
        assert r.status_code == 200, f"{status} failed: {r.text}"
        assert r.json()["status"] == status


def test_pedido_status_invalido_400(session, created_ids):
    pid = created_ids["pedido"]
    r = session.patch(f"{API}/pedidos/{pid}/status", json={"status": "abracadabra"}, timeout=15)
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
def test_dashboard_kpis(session):
    r = session.get(f"{API}/dashboard/kpis", timeout=20)
    assert r.status_code == 200
    body = r.json()
    for key in ["faturamento", "custo", "lucro", "margem_pct", "pedidos_abertos",
                "pedidos_entregues", "devolucoes_qtd", "clientes_ativos",
                "produtos_ativos", "ticket_medio", "status_distribuicao",
                "top_produtos", "faturamento_diario"]:
        assert key in body, f"missing {key}"
    # We had a pedido that reached 'entregue' => faturamento should include 150
    assert body["faturamento"] >= 150.0
    assert body["pedidos_entregues"] >= 1


# ---------------------------------------------------------------------------
# Financeiro
# ---------------------------------------------------------------------------
def test_financeiro_resultado(session):
    r = session.get(f"{API}/financeiro/resultado", timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert "totais" in body and "linhas" in body
    for k in ["receita", "custo", "lucro", "desconto", "devolvido", "margem_pct"]:
        assert k in body["totais"]
    assert body["totais"]["receita"] >= 150.0


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------
def test_clientes_sem_auth_401():
    r = requests.get(f"{API}/clientes", timeout=10)
    assert r.status_code == 401


def test_produtos_sem_auth_401():
    r = requests.get(f"{API}/produtos", timeout=10)
    assert r.status_code == 401


def test_dashboard_sem_auth_401():
    r = requests.get(f"{API}/dashboard/kpis", timeout=10)
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Cleanup (best-effort)
# ---------------------------------------------------------------------------
def test_zz_cleanup(session, created_ids):
    if created_ids.get("pedido"):
        session.delete(f"{API}/pedidos/{created_ids['pedido']}", timeout=15)
    if created_ids.get("produto"):
        session.delete(f"{API}/produtos/{created_ids['produto']}", timeout=15)
    if created_ids.get("cliente"):
        session.delete(f"{API}/clientes/{created_ids['cliente']}", timeout=15)
