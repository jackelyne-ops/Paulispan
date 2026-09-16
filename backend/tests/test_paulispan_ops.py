"""Backend tests for Paulispan ERP — Phase 2-5 ops modules."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://paulispan-hub.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@paulispan.com.br"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def ctx(session):
    """Setup: create a cliente, produto and pedido for use across tests."""
    c_payload = {
        "nome_rede": f"TEST_OPS_Rede_{uuid.uuid4().hex[:6]}",
        "nome_loja": f"TEST_OPS_Loja_{uuid.uuid4().hex[:6]}",
        "cidade": "São Paulo", "estado": "SP", "regiao": "Sudeste",
    }
    r = session.post(f"{API}/clientes", json=c_payload, timeout=15)
    assert r.status_code == 200, r.text
    cliente = r.json()

    sku = f"TEST-OPS-SKU-{uuid.uuid4().hex[:6].upper()}"
    p_payload = {"sku": sku, "nome": "TEST_OPS_Bolo", "categoria": "bolo",
                 "preco_venda": 100.0, "custo": 40.0, "peso_liquido_g": 500.0}
    r = session.post(f"{API}/produtos", json=p_payload, timeout=15)
    assert r.status_code == 200, r.text
    produto = r.json()

    ped_payload = {
        "cliente_id": cliente["id"],
        "vendedor": "TEST_OPS",
        "items": [{"produto_id": produto["id"], "qtd": 5, "preco_unit": 100.0, "desconto": 0.0}],
    }
    r = session.post(f"{API}/pedidos", json=ped_payload, timeout=15)
    assert r.status_code == 200, r.text
    pedido = r.json()

    # move pedido to 'entregue' so it counts in analisar receita
    session.patch(f"{API}/pedidos/{pedido['id']}/status", json={"status": "em_producao"}, timeout=10)
    session.patch(f"{API}/pedidos/{pedido['id']}/status", json={"status": "faturado"}, timeout=10)
    session.patch(f"{API}/pedidos/{pedido['id']}/status", json={"status": "em_rota"}, timeout=10)
    session.patch(f"{API}/pedidos/{pedido['id']}/status", json={"status": "entregue"}, timeout=10)

    data = {"cliente": cliente, "produto": produto, "pedido": pedido, "ids_created": {}}
    yield data

    # Cleanup best-effort
    ids = data["ids_created"]
    for path, key in [
        ("visitas", "visitas"), ("ocorrencias", "ocorrencias"),
        ("rotas", "rotas"), ("promotores", "promotores"),
        ("agencias", "agencias"), ("caminhoes", "caminhoes"),
        ("motoristas", "motoristas"), ("devolucoes", "devolucoes"),
    ]:
        for _id in ids.get(key, []):
            session.delete(f"{API}/{path}/{_id}", timeout=10)
    session.delete(f"{API}/pedidos/{pedido['id']}", timeout=10)
    session.delete(f"{API}/produtos/{produto['id']}", timeout=10)
    session.delete(f"{API}/clientes/{cliente['id']}", timeout=10)


# ----------------------------------------------------------------------------
# DEVOLUÇÕES
# ----------------------------------------------------------------------------
def test_devolucao_opcoes(session):
    r = session.get(f"{API}/devolucoes/opcoes", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "motivos" in body and "status" in body
    assert any(m["value"] == "produto_danificado" for m in body["motivos"])


def test_devolucao_criar(session, ctx):
    payload = {
        "pedido_id": ctx["pedido"]["id"],
        "produto_id": ctx["produto"]["id"],
        "qtd": 2, "valor_unit": 100.0,
        "motivo": "produto_danificado",
        "status": "registrada",
    }
    r = session.post(f"{API}/devolucoes", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["valor_total"] == 200.0
    assert body["motivo_label"] == "Produto danificado"
    assert body["cliente_id"] == ctx["cliente"]["id"]
    ctx["ids_created"].setdefault("devolucoes", []).append(body["id"])
    ctx["devolucao_id"] = body["id"]


def test_devolucao_listar(session, ctx):
    r = session.get(f"{API}/devolucoes", timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list)
    match = [d for d in lst if d["id"] == ctx["devolucao_id"]]
    assert len(match) == 1
    assert match[0].get("motivo_label")


def test_devolucao_pedido_invalido(session, ctx):
    r = session.post(f"{API}/devolucoes", json={
        "pedido_id": "507f1f77bcf86cd799439011",
        "produto_id": ctx["produto"]["id"],
        "qtd": 1, "valor_unit": 10.0, "motivo": "outros",
    }, timeout=15)
    assert r.status_code == 400


# ----------------------------------------------------------------------------
# CAMINHÕES
# ----------------------------------------------------------------------------
def test_caminhao_crud(session, ctx):
    payload = {"placa": f"TST-{uuid.uuid4().hex[:4].upper()}", "modelo": "Iveco Daily",
               "tipo": "refrigerado", "capacidade_kg": 3000.0, "status": "ativo"}
    r = session.post(f"{API}/caminhoes", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    ctx["ids_created"].setdefault("caminhoes", []).append(cid)
    ctx["caminhao_id"] = cid

    r = session.get(f"{API}/caminhoes", timeout=10)
    assert r.status_code == 200
    assert any(c["id"] == cid for c in r.json())

    r = session.put(f"{API}/caminhoes/{cid}", json={**payload, "modelo": "Iveco Tector"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["modelo"] == "Iveco Tector"


# ----------------------------------------------------------------------------
# MOTORISTAS
# ----------------------------------------------------------------------------
def test_motorista_crud(session, ctx):
    payload = {"nome": f"TEST_Motorista_{uuid.uuid4().hex[:5]}", "cpf": "123.456.789-00",
               "cnh": "12345678900", "categoria_cnh": "D"}
    r = session.post(f"{API}/motoristas", json=payload, timeout=15)
    assert r.status_code == 200
    mid = r.json()["id"]
    ctx["ids_created"].setdefault("motoristas", []).append(mid)
    ctx["motorista_id"] = mid


# ----------------------------------------------------------------------------
# ROTAS
# ----------------------------------------------------------------------------
def test_rota_criar_com_calculos(session, ctx):
    payload = {
        "nome": f"TEST_Rota_{uuid.uuid4().hex[:5]}",
        "motorista_id": ctx["motorista_id"],
        "caminhao_id": ctx["caminhao_id"],
        "pedido_ids": [ctx["pedido"]["id"]],
        "custo_combustivel": 300.0,
        "custo_pedagio": 50.0,
        "outros_custos": 50.0,
        "regiao": "Sudeste",
    }
    r = session.post(f"{API}/rotas", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["codigo"].startswith("RT-")
    assert body["custo_total"] == 400.0
    assert body["custo_por_pedido"] == 400.0  # 1 pedido
    # Pedido has total = 500.0 (5 x 100)
    assert body["faturamento_transportado"] == 500.0
    assert body["motorista_nome"]
    assert body["caminhao_placa"]
    ctx["ids_created"].setdefault("rotas", []).append(body["id"])
    ctx["rota_id"] = body["id"]


def test_rota_get(session, ctx):
    r = session.get(f"{API}/rotas/{ctx['rota_id']}", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "pedidos" in body and len(body["pedidos"]) == 1


# ----------------------------------------------------------------------------
# AGÊNCIAS + PROMOTORES
# ----------------------------------------------------------------------------
def test_agencia_promotor(session, ctx):
    r = session.post(f"{API}/agencias", json={"nome": f"TEST_Ag_{uuid.uuid4().hex[:5]}"}, timeout=15)
    assert r.status_code == 200
    aid = r.json()["id"]
    ctx["ids_created"].setdefault("agencias", []).append(aid)

    payload = {"nome": f"TEST_Prom_{uuid.uuid4().hex[:5]}", "agencia_id": aid,
               "lojas_ids": [ctx["cliente"]["id"]], "status": "ativo"}
    r = session.post(f"{API}/promotores", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["agencia_nome"]
    ctx["ids_created"].setdefault("promotores", []).append(body["id"])
    ctx["promotor_id"] = body["id"]
    ctx["agencia_id"] = aid

    r = session.get(f"{API}/promotores", timeout=15)
    assert r.status_code == 200
    match = [p for p in r.json() if p["id"] == body["id"]]
    assert match[0]["agencia_nome"]


# ----------------------------------------------------------------------------
# VISITAS
# ----------------------------------------------------------------------------
def test_visita_manual_e_status(session, ctx):
    payload = {
        "promotor_id": ctx["promotor_id"],
        "cliente_id": ctx["cliente"]["id"],
        "data": datetime.now(timezone.utc).isoformat(),
        "horario": "10:00",
        "status": "agendada",
    }
    r = session.post(f"{API}/visitas", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["promotor_nome"]
    assert body["cliente_loja"]
    assert body["agencia_nome"]
    ctx["ids_created"].setdefault("visitas", []).append(body["id"])
    vid = body["id"]

    r = session.patch(f"{API}/visitas/{vid}/status", json={"status": "reagendada"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "reagendada"

    # execute
    exec_payload = {"execucao": {"apresentacao": True, "pesagem": True, "produtos_encontrados": 20,
                                 "qtd_pesada": 15, "observacoes": "TEST"}}
    r = session.post(f"{API}/visitas/{vid}/executar", json=exec_payload, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "realizada"
    assert body["execucao"]["apresentacao"] is True
    assert body["execucao"]["produtos_encontrados"] == 20


def test_visita_gerar_agenda_semanal(session, ctx):
    r = session.post(f"{API}/visitas/gerar-agenda-semanal",
                     json={"semanas": 1,
                           "data_inicio": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")},
                     timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    # Should create 2 visits per loja (segunda + quinta) x 1 semana × 1 loja × 1 promotor
    assert body["criadas"] >= 2
    # cleanup those visitas
    r = session.get(f"{API}/visitas", params={"promotor_id": ctx["promotor_id"]}, timeout=15)
    for v in r.json():
        ctx["ids_created"].setdefault("visitas", []).append(v["id"])


# ----------------------------------------------------------------------------
# OCORRÊNCIAS
# ----------------------------------------------------------------------------
def test_ocorrencia_opcoes(session):
    r = session.get(f"{API}/ocorrencias/opcoes", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert any(t["value"] == "peso_incorreto" for t in body["tipos"])


def test_ocorrencia_crud(session, ctx):
    payload = {
        "cliente_id": ctx["cliente"]["id"],
        "produto_id": ctx["produto"]["id"],
        "promotor_id": ctx["promotor_id"],
        "tipo": "peso_incorreto",
        "quantidade": 3,
        "descricao": "TEST_OPS peso errado",
        "status": "aberta",
    }
    r = session.post(f"{API}/ocorrencias", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tipo_label"] == "Peso incorreto"
    assert body["cliente_loja"]
    assert body["produto_nome"]
    assert body["promotor_nome"]
    oid = body["id"]
    ctx["ids_created"].setdefault("ocorrencias", []).append(oid)

    r = session.patch(f"{API}/ocorrencias/{oid}/status", json={"status": "resolvida"}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "resolvida"
    assert body.get("data_resolucao")


# ----------------------------------------------------------------------------
# ANALISAR
# ----------------------------------------------------------------------------
def test_analisar_sem_filtros(session, ctx):
    r = session.post(f"{API}/analisar", json={}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ["kpis", "top_produtos", "top_clientes", "por_regiao", "faturamento_diario"]:
        assert k in body
    kpis = body["kpis"]
    for k in ["receita", "custo", "devolvido", "lucro", "margem_pct",
              "pedidos_qtd", "entregues", "devolucoes_qtd", "ocorrencias_qtd", "ticket_medio"]:
        assert k in kpis
    # lucro = receita - custo - devolvido
    expected_lucro = round(kpis["receita"] - kpis["custo"] - kpis["devolvido"], 2)
    assert abs(kpis["lucro"] - expected_lucro) < 0.01
    assert kpis["receita"] >= 500.0  # our pedido entregue = 500
    assert kpis["devolvido"] >= 200.0  # our devolucao = 200


def test_analisar_filtro_cliente(session, ctx):
    r = session.post(f"{API}/analisar", json={"cliente_id": ctx["cliente"]["id"]}, timeout=30)
    assert r.status_code == 200
    body = r.json()
    # Our pedido total = 500, custo = 5*40 = 200, devolvido = 200 → lucro = 100
    kpis = body["kpis"]
    assert kpis["receita"] == 500.0
    assert kpis["custo"] == 200.0
    assert kpis["devolvido"] == 200.0
    assert kpis["lucro"] == 100.0
    assert kpis["pedidos_qtd"] == 1
    assert kpis["entregues"] == 1


def test_analisar_filtro_produto_periodo(session, ctx):
    start = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    r = session.post(f"{API}/analisar", json={
        "cliente_id": ctx["cliente"]["id"],
        "produto_id": ctx["produto"]["id"],
        "periodo_start": start, "periodo_end": end,
    }, timeout=30)
    assert r.status_code == 200
    body = r.json()
    assert body["kpis"]["pedidos_qtd"] == 1
    assert len(body["top_produtos"]) >= 1


# ----------------------------------------------------------------------------
# DEVOLUÇÃO delete (removes movement)
# ----------------------------------------------------------------------------
def test_devolucao_delete(session, ctx):
    r = session.delete(f"{API}/devolucoes/{ctx['devolucao_id']}", timeout=15)
    assert r.status_code == 200
    # remove from cleanup list (already deleted)
    if ctx["devolucao_id"] in ctx["ids_created"].get("devolucoes", []):
        ctx["ids_created"]["devolucoes"].remove(ctx["devolucao_id"])
