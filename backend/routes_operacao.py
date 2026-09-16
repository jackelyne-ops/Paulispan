"""Business routes for operational modules: devoluções, logística, promotores, análise."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from auth import get_current_user, require_permission
from models import STATUS_CONTA_FATURAMENTO
from models_ops import (
    MOTIVOS_DEVOLUCAO,
    STATUS_DEVOLUCAO,
    STATUS_OCORRENCIA,
    STATUS_ROTA,
    STATUS_VISITA,
    TIPOS_OCORRENCIA,
    AgenciaCreate,
    AnalisarFiltros,
    CaminhaoCreate,
    DevolucaoCreate,
    MotoristaCreate,
    OcorrenciaCreate,
    PromotorCreate,
    RotaCreate,
    VisitaCreate,
    VisitaExecutar,
)

router = APIRouter()

_MOTIVOS = dict(MOTIVOS_DEVOLUCAO)
_TIPOS_OCC = dict(TIPOS_OCORRENCIA)


def _now():
    return datetime.now(timezone.utc)


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="ID inválido")


def _out(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ============================================================================
# DEVOLUÇÕES
# ============================================================================
@router.get("/devolucoes")
async def listar_devolucoes(
    cliente_id: Optional[str] = None,
    pedido_id: Optional[str] = None,
    produto_id: Optional[str] = None,
    motivo: Optional[str] = None,
    user=Depends(require_permission("pedidos:read")),
):
    from server import db

    filt: dict = {}
    if cliente_id:
        filt["cliente_id"] = cliente_id
    if pedido_id:
        filt["pedido_id"] = pedido_id
    if produto_id:
        filt["produto_id"] = produto_id
    if motivo:
        filt["motivo"] = motivo
    docs = await db.devolucoes.find(filt).sort("data", -1).to_list(1000)
    for d in docs:
        d["motivo_label"] = _MOTIVOS.get(d.get("motivo"), d.get("motivo"))
    return [_out(d) for d in docs]


@router.post("/devolucoes")
async def criar_devolucao(payload: DevolucaoCreate, user=Depends(require_permission("pedidos"))):
    from server import db

    pedido = await db.pedidos.find_one({"_id": _oid(payload.pedido_id)})
    if not pedido:
        raise HTTPException(status_code=400, detail="Pedido inválido")
    produto = await db.produtos.find_one({"_id": _oid(payload.produto_id)})
    if not produto:
        raise HTTPException(status_code=400, detail="Produto inválido")

    if payload.motivo not in _MOTIVOS:
        raise HTTPException(status_code=400, detail="Motivo inválido")
    if payload.status not in STATUS_DEVOLUCAO:
        raise HTTPException(status_code=400, detail="Status inválido")

    valor_total = round(payload.qtd * payload.valor_unit, 2)
    now = _now()
    doc = {
        "pedido_id": str(pedido["_id"]),
        "pedido_numero": pedido.get("numero"),
        "cliente_id": pedido.get("cliente_id"),
        "cliente_rede": pedido.get("cliente_rede"),
        "cliente_loja": pedido.get("cliente_loja"),
        "produto_id": str(produto["_id"]),
        "produto_sku": produto.get("sku"),
        "produto_nome": produto.get("nome"),
        "qtd": payload.qtd,
        "valor_unit": payload.valor_unit,
        "valor_total": valor_total,
        "motivo": payload.motivo,
        "motivo_label": _MOTIVOS[payload.motivo],
        "nf": payload.nf,
        "data": payload.data or now,
        "responsavel": payload.responsavel or user.get("name"),
        "observacoes": payload.observacoes,
        "status": payload.status,
        "created_by": user.get("email"),
        "created_at": now,
    }
    res = await db.devolucoes.insert_one(doc)
    doc["_id"] = res.inserted_id

    # register stock movement (loss)
    await db.estoque_movimentos.insert_one(
        {
            "produto_id": str(produto["_id"]),
            "tipo": "devolucao",
            "qtd": payload.qtd,
            "ref_id": str(res.inserted_id),
            "data": now,
        }
    )
    return _out(doc)


@router.delete("/devolucoes/{devolucao_id}")
async def deletar_devolucao(devolucao_id: str, user=Depends(require_permission("pedidos"))):
    from server import db

    res = await db.devolucoes.delete_one({"_id": _oid(devolucao_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Devolução não encontrada")
    await db.estoque_movimentos.delete_many({"ref_id": devolucao_id})
    return {"ok": True}


@router.get("/devolucoes/opcoes")
async def opcoes_devolucao(user=Depends(get_current_user)):
    return {
        "motivos": [{"value": k, "label": v} for k, v in MOTIVOS_DEVOLUCAO],
        "status": STATUS_DEVOLUCAO,
    }


# ============================================================================
# CAMINHÕES
# ============================================================================
@router.get("/caminhoes")
async def listar_caminhoes(user=Depends(get_current_user)):
    from server import db

    docs = await db.caminhoes.find({}).sort("placa", 1).to_list(200)
    return [_out(d) for d in docs]


@router.post("/caminhoes")
async def criar_caminhao(payload: CaminhaoCreate, user=Depends(get_current_user)):
    from server import db

    doc = payload.model_dump()
    doc["created_at"] = _now()
    res = await db.caminhoes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _out(doc)


@router.put("/caminhoes/{cid}")
async def atualizar_caminhao(cid: str, payload: CaminhaoCreate, user=Depends(get_current_user)):
    from server import db

    doc = await db.caminhoes.find_one_and_update(
        {"_id": _oid(cid)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Caminhão não encontrado")
    return _out(doc)


@router.delete("/caminhoes/{cid}")
async def deletar_caminhao(cid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.caminhoes.delete_one({"_id": _oid(cid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Caminhão não encontrado")
    return {"ok": True}


# ============================================================================
# MOTORISTAS
# ============================================================================
@router.get("/motoristas")
async def listar_motoristas(user=Depends(get_current_user)):
    from server import db

    docs = await db.motoristas.find({}).sort("nome", 1).to_list(200)
    return [_out(d) for d in docs]


@router.post("/motoristas")
async def criar_motorista(payload: MotoristaCreate, user=Depends(get_current_user)):
    from server import db

    doc = payload.model_dump()
    doc["created_at"] = _now()
    res = await db.motoristas.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _out(doc)


@router.put("/motoristas/{mid}")
async def atualizar_motorista(mid: str, payload: MotoristaCreate, user=Depends(get_current_user)):
    from server import db

    doc = await db.motoristas.find_one_and_update(
        {"_id": _oid(mid)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    return _out(doc)


@router.delete("/motoristas/{mid}")
async def deletar_motorista(mid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.motoristas.delete_one({"_id": _oid(mid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    return {"ok": True}


# ============================================================================
# ROTAS
# ============================================================================
async def _enrich_rota(db, doc):
    doc = dict(doc)
    motorista_nome = None
    caminhao_placa = None
    if doc.get("motorista_id"):
        m = await db.motoristas.find_one({"_id": _oid(doc["motorista_id"])})
        motorista_nome = m.get("nome") if m else None
    if doc.get("caminhao_id"):
        c = await db.caminhoes.find_one({"_id": _oid(doc["caminhao_id"])})
        caminhao_placa = c.get("placa") if c else None

    pedidos_ids = doc.get("pedido_ids", [])
    faturamento = 0.0
    if pedidos_ids:
        oids = [_oid(p) for p in pedidos_ids if p]
        cursor = db.pedidos.find({"_id": {"$in": oids}})
        async for p in cursor:
            faturamento += p.get("total", 0) or 0

    custo_total = (
        (doc.get("custo_combustivel", 0) or 0)
        + (doc.get("custo_pedagio", 0) or 0)
        + (doc.get("outros_custos", 0) or 0)
    )
    doc["motorista_nome"] = motorista_nome
    doc["caminhao_placa"] = caminhao_placa
    doc["pedidos_qtd"] = len(pedidos_ids)
    doc["faturamento_transportado"] = round(faturamento, 2)
    doc["custo_total"] = round(custo_total, 2)
    doc["custo_por_pedido"] = round(custo_total / len(pedidos_ids), 2) if pedidos_ids else 0.0
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/rotas")
async def listar_rotas(user=Depends(get_current_user)):
    from server import db

    docs = await db.rotas.find({}).sort("data", -1).to_list(500)
    return [await _enrich_rota(db, d) for d in docs]


@router.post("/rotas")
async def criar_rota(payload: RotaCreate, user=Depends(get_current_user)):
    from server import db

    if payload.status not in STATUS_ROTA:
        raise HTTPException(status_code=400, detail="Status inválido")

    doc = payload.model_dump()
    if not doc.get("codigo"):
        count = await db.rotas.count_documents({})
        doc["codigo"] = f"RT-{(count + 1):04d}"
    doc["created_at"] = _now()
    res = await db.rotas.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await _enrich_rota(db, doc)


@router.get("/rotas/{rid}")
async def get_rota(rid: str, user=Depends(get_current_user)):
    from server import db

    doc = await db.rotas.find_one({"_id": _oid(rid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    rota = await _enrich_rota(db, doc)

    # include pedidos details
    pedidos = []
    for pid in rota.get("pedido_ids", []):
        p = await db.pedidos.find_one({"_id": _oid(pid)})
        if p:
            p["id"] = str(p.pop("_id"))
            pedidos.append(p)
    rota["pedidos"] = pedidos
    return rota


@router.put("/rotas/{rid}")
async def atualizar_rota(rid: str, payload: RotaCreate, user=Depends(get_current_user)):
    from server import db

    doc = await db.rotas.find_one_and_update(
        {"_id": _oid(rid)}, {"$set": payload.model_dump(exclude={"codigo"})}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    return await _enrich_rota(db, doc)


@router.delete("/rotas/{rid}")
async def deletar_rota(rid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.rotas.delete_one({"_id": _oid(rid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rota não encontrada")
    return {"ok": True}


# ============================================================================
# AGÊNCIAS
# ============================================================================
@router.get("/agencias")
async def listar_agencias(user=Depends(get_current_user)):
    from server import db

    docs = await db.agencias.find({}).sort("nome", 1).to_list(200)
    return [_out(d) for d in docs]


@router.post("/agencias")
async def criar_agencia(payload: AgenciaCreate, user=Depends(get_current_user)):
    from server import db

    doc = payload.model_dump()
    doc["created_at"] = _now()
    res = await db.agencias.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _out(doc)


@router.put("/agencias/{aid}")
async def atualizar_agencia(aid: str, payload: AgenciaCreate, user=Depends(get_current_user)):
    from server import db

    doc = await db.agencias.find_one_and_update(
        {"_id": _oid(aid)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Agência não encontrada")
    return _out(doc)


@router.delete("/agencias/{aid}")
async def deletar_agencia(aid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.agencias.delete_one({"_id": _oid(aid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agência não encontrada")
    return {"ok": True}


# ============================================================================
# PROMOTORES
# ============================================================================
async def _enrich_promotor(db, doc):
    doc = dict(doc)
    agencia_nome = None
    if doc.get("agencia_id"):
        a = await db.agencias.find_one({"_id": _oid(doc["agencia_id"])})
        agencia_nome = a.get("nome") if a else None
    doc["agencia_nome"] = agencia_nome
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/promotores")
async def listar_promotores(user=Depends(get_current_user)):
    from server import db

    docs = await db.promotores.find({}).sort("nome", 1).to_list(300)
    return [await _enrich_promotor(db, d) for d in docs]


@router.post("/promotores")
async def criar_promotor(payload: PromotorCreate, user=Depends(get_current_user)):
    from server import db

    doc = payload.model_dump()
    doc["created_at"] = _now()
    res = await db.promotores.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await _enrich_promotor(db, doc)


@router.put("/promotores/{pid}")
async def atualizar_promotor(pid: str, payload: PromotorCreate, user=Depends(get_current_user)):
    from server import db

    doc = await db.promotores.find_one_and_update(
        {"_id": _oid(pid)}, {"$set": payload.model_dump()}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Promotor não encontrado")
    return await _enrich_promotor(db, doc)


@router.delete("/promotores/{pid}")
async def deletar_promotor(pid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.promotores.delete_one({"_id": _oid(pid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotor não encontrado")
    return {"ok": True}


# ============================================================================
# VISITAS + EXECUÇÃO
# ============================================================================
async def _enrich_visita(db, doc):
    doc = dict(doc)
    prom = await db.promotores.find_one({"_id": _oid(doc["promotor_id"])})
    cli = await db.clientes.find_one({"_id": _oid(doc["cliente_id"])})
    prom_nome = prom.get("nome") if prom else "—"
    agencia_nome = None
    if prom and prom.get("agencia_id"):
        a = await db.agencias.find_one({"_id": _oid(prom["agencia_id"])})
        agencia_nome = a.get("nome") if a else None
    doc["promotor_nome"] = prom_nome
    doc["agencia_nome"] = agencia_nome
    doc["cliente_rede"] = cli.get("nome_rede") if cli else ""
    doc["cliente_loja"] = cli.get("nome_loja") if cli else ""
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/visitas")
async def listar_visitas(
    promotor_id: Optional[str] = None,
    cliente_id: Optional[str] = None,
    status: Optional[str] = None,
    user=Depends(get_current_user),
):
    from server import db

    filt: dict = {}
    if promotor_id:
        filt["promotor_id"] = promotor_id
    if cliente_id:
        filt["cliente_id"] = cliente_id
    if status:
        filt["status"] = status
    docs = await db.visitas.find(filt).sort("data", -1).to_list(1000)
    return [await _enrich_visita(db, d) for d in docs]


@router.post("/visitas")
async def criar_visita(payload: VisitaCreate, user=Depends(get_current_user)):
    from server import db

    if payload.status not in STATUS_VISITA:
        raise HTTPException(status_code=400, detail="Status inválido")
    if not await db.promotores.find_one({"_id": _oid(payload.promotor_id)}):
        raise HTTPException(status_code=400, detail="Promotor inválido")
    if not await db.clientes.find_one({"_id": _oid(payload.cliente_id)}):
        raise HTTPException(status_code=400, detail="Cliente inválido")

    doc = payload.model_dump()
    doc["created_at"] = _now()
    res = await db.visitas.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await _enrich_visita(db, doc)


@router.patch("/visitas/{vid}/status")
async def visita_status(vid: str, body: dict, user=Depends(get_current_user)):
    from server import db

    st = body.get("status")
    if st not in STATUS_VISITA:
        raise HTTPException(status_code=400, detail="Status inválido")
    doc = await db.visitas.find_one_and_update(
        {"_id": _oid(vid)}, {"$set": {"status": st}}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Visita não encontrada")
    return await _enrich_visita(db, doc)


@router.post("/visitas/{vid}/executar")
async def visita_executar(vid: str, payload: VisitaExecutar, user=Depends(get_current_user)):
    from server import db

    doc = await db.visitas.find_one_and_update(
        {"_id": _oid(vid)},
        {
            "$set": {
                "execucao": payload.execucao.model_dump(),
                "status": "realizada",
                "executada_em": _now(),
            }
        },
        return_document=True,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Visita não encontrada")
    return await _enrich_visita(db, doc)


@router.delete("/visitas/{vid}")
async def deletar_visita(vid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.visitas.delete_one({"_id": _oid(vid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visita não encontrada")
    return {"ok": True}


@router.post("/visitas/gerar-agenda-semanal")
async def gerar_agenda_semanal(body: dict, user=Depends(get_current_user)):
    """Gera 2 visitas/semana por loja atendida por cada promotor, começando na data_inicio (default: hoje).

    Body: { "data_inicio": "YYYY-MM-DD" (opcional), "semanas": 4 (opcional) }
    """
    from server import db

    semanas = int(body.get("semanas", 4))
    di_str = body.get("data_inicio")
    start = datetime.fromisoformat(di_str) if di_str else _now()
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)

    promotores = await db.promotores.find({"status": "ativo"}).to_list(500)
    criadas = 0
    for prom in promotores:
        for cli_id in prom.get("lojas_ids", []):
            cli = await db.clientes.find_one({"_id": _oid(cli_id)})
            if not cli:
                continue
            for w in range(semanas):
                base = start + timedelta(days=w * 7)
                # segunda e quinta como padrão
                for offset, hora in [(0, "09:00"), (3, "14:00")]:
                    dia = base + timedelta(days=offset)
                    exists = await db.visitas.find_one(
                        {
                            "promotor_id": str(prom["_id"]),
                            "cliente_id": cli_id,
                            "data": dia,
                        }
                    )
                    if exists:
                        continue
                    await db.visitas.insert_one(
                        {
                            "promotor_id": str(prom["_id"]),
                            "cliente_id": cli_id,
                            "data": dia,
                            "horario": hora,
                            "status": "agendada",
                            "observacoes": None,
                            "created_at": _now(),
                        }
                    )
                    criadas += 1
    return {"criadas": criadas, "semanas": semanas}


@router.get("/visitas/opcoes")
async def opcoes_visitas(user=Depends(get_current_user)):
    return {"status": STATUS_VISITA}


# ============================================================================
# OCORRÊNCIAS (Não Conformidades)
# ============================================================================
async def _enrich_ocorrencia(db, doc):
    doc = dict(doc)
    cli = await db.clientes.find_one({"_id": _oid(doc["cliente_id"])})
    doc["cliente_rede"] = cli.get("nome_rede") if cli else ""
    doc["cliente_loja"] = cli.get("nome_loja") if cli else ""
    if doc.get("produto_id"):
        p = await db.produtos.find_one({"_id": _oid(doc["produto_id"])})
        doc["produto_nome"] = p.get("nome") if p else None
    else:
        doc["produto_nome"] = None
    if doc.get("promotor_id"):
        pr = await db.promotores.find_one({"_id": _oid(doc["promotor_id"])})
        doc["promotor_nome"] = pr.get("nome") if pr else None
    else:
        doc["promotor_nome"] = None
    doc["tipo_label"] = _TIPOS_OCC.get(doc.get("tipo"), doc.get("tipo"))
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/ocorrencias")
async def listar_ocorrencias(
    status: Optional[str] = None,
    cliente_id: Optional[str] = None,
    promotor_id: Optional[str] = None,
    user=Depends(get_current_user),
):
    from server import db

    filt: dict = {}
    if status:
        filt["status"] = status
    if cliente_id:
        filt["cliente_id"] = cliente_id
    if promotor_id:
        filt["promotor_id"] = promotor_id
    docs = await db.ocorrencias.find(filt).sort("data", -1).to_list(1000)
    return [await _enrich_ocorrencia(db, d) for d in docs]


@router.post("/ocorrencias")
async def criar_ocorrencia(payload: OcorrenciaCreate, user=Depends(get_current_user)):
    from server import db

    if payload.tipo not in _TIPOS_OCC:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    if payload.status not in STATUS_OCORRENCIA:
        raise HTTPException(status_code=400, detail="Status inválido")
    if not await db.clientes.find_one({"_id": _oid(payload.cliente_id)}):
        raise HTTPException(status_code=400, detail="Cliente inválido")

    doc = payload.model_dump()
    doc["data"] = _now()
    doc["created_by"] = user.get("email")
    res = await db.ocorrencias.insert_one(doc)
    doc["_id"] = res.inserted_id
    return await _enrich_ocorrencia(db, doc)


@router.patch("/ocorrencias/{oid}/status")
async def ocorrencia_status(oid: str, body: dict, user=Depends(get_current_user)):
    from server import db

    st = body.get("status")
    if st not in STATUS_OCORRENCIA:
        raise HTTPException(status_code=400, detail="Status inválido")
    update = {"status": st}
    if st == "resolvida":
        update["data_resolucao"] = _now()
    doc = await db.ocorrencias.find_one_and_update(
        {"_id": _oid(oid)}, {"$set": update}, return_document=True
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return await _enrich_ocorrencia(db, doc)


@router.delete("/ocorrencias/{oid}")
async def deletar_ocorrencia(oid: str, user=Depends(get_current_user)):
    from server import db

    res = await db.ocorrencias.delete_one({"_id": _oid(oid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    return {"ok": True}


@router.get("/ocorrencias/opcoes")
async def opcoes_ocorrencias(user=Depends(get_current_user)):
    return {
        "tipos": [{"value": k, "label": v} for k, v in TIPOS_OCORRENCIA],
        "status": STATUS_OCORRENCIA,
    }


# ============================================================================
# ANALISAR — filtros combinados
# ============================================================================
@router.post("/analisar")
async def analisar(filtros: AnalisarFiltros, user=Depends(get_current_user)):
    from server import db

    # Build pedido filter
    filt_pedidos: dict = {}
    if filtros.cliente_id:
        filt_pedidos["cliente_id"] = filtros.cliente_id
    if filtros.status:
        filt_pedidos["status"] = filtros.status
    if filtros.regiao:
        filt_pedidos["regiao"] = {"$regex": filtros.regiao, "$options": "i"}
    if filtros.cidade:
        filt_pedidos["cidade"] = {"$regex": filtros.cidade, "$options": "i"}
    if filtros.periodo_start or filtros.periodo_end:
        rng: dict = {}
        if filtros.periodo_start:
            rng["$gte"] = filtros.periodo_start
        if filtros.periodo_end:
            rng["$lte"] = filtros.periodo_end
        filt_pedidos["data_pedido"] = rng

    pedidos = await db.pedidos.find(filt_pedidos).to_list(5000)

    # Filter by product/category post-fetch (items are embedded)
    if filtros.produto_id or filtros.categoria:
        produto_ids_valid = None
        if filtros.categoria:
            cats = await db.produtos.find({"categoria": filtros.categoria}).to_list(2000)
            produto_ids_valid = {str(p["_id"]) for p in cats}
        pedidos_filtered = []
        for p in pedidos:
            match = False
            for it in p.get("items", []):
                if filtros.produto_id and it.get("produto_id") == filtros.produto_id:
                    match = True
                    break
                if produto_ids_valid is not None and it.get("produto_id") in produto_ids_valid:
                    match = True
                    break
            if match:
                pedidos_filtered.append(p)
        pedidos = pedidos_filtered

    # If rota filter, restrict pedidos to those in the rota
    if filtros.rota_id:
        r = await db.rotas.find_one({"_id": _oid(filtros.rota_id)})
        if r:
            allowed = set(r.get("pedido_ids") or [])
            pedidos = [p for p in pedidos if str(p["_id"]) in allowed]
        else:
            pedidos = []

    receita = 0.0
    custo = 0.0
    desconto_total = 0.0
    pedidos_qtd = len(pedidos)
    entregues = 0
    devolvidos_flag = 0
    top_prod: dict = defaultdict(lambda: {"nome": "", "qtd": 0.0, "faturamento": 0.0})
    top_clientes: dict = defaultdict(lambda: {"nome": "", "faturamento": 0.0})
    por_regiao: dict = defaultdict(lambda: {"faturamento": 0.0, "lucro": 0.0})
    diario: dict = defaultdict(float)

    for p in pedidos:
        contab = p.get("status") in STATUS_CONTA_FATURAMENTO
        if contab:
            receita += p.get("total", 0) or 0
            custo += p.get("custo_total", 0) or 0
            for it in p.get("items", []):
                key = it["produto_id"]
                top_prod[key]["nome"] = it.get("nome", "")
                top_prod[key]["qtd"] += it.get("qtd", 0)
                top_prod[key]["faturamento"] += it.get("subtotal", 0)
            key_cli = p.get("cliente_id")
            top_clientes[key_cli]["nome"] = f'{p.get("cliente_loja","")} — {p.get("cliente_rede","")}'
            top_clientes[key_cli]["faturamento"] += p.get("total", 0)
            reg = p.get("regiao") or p.get("cidade") or "—"
            por_regiao[reg]["faturamento"] += p.get("total", 0)
            por_regiao[reg]["lucro"] += (p.get("total", 0) or 0) - (p.get("custo_total", 0) or 0)
            d = p.get("data_pedido")
            if isinstance(d, datetime):
                diario[d.strftime("%Y-%m-%d")] += p.get("total", 0)
        desconto_total += p.get("desconto", 0) or 0
        if p.get("status") == "entregue":
            entregues += 1
        if p.get("status") in {"cancelado", "nao_entregue"}:
            devolvidos_flag += 1

    # Devoluções aplicáveis
    filt_dev: dict = {}
    if filtros.cliente_id:
        filt_dev["cliente_id"] = filtros.cliente_id
    if filtros.produto_id:
        filt_dev["produto_id"] = filtros.produto_id
    if filtros.periodo_start or filtros.periodo_end:
        rng: dict = {}
        if filtros.periodo_start:
            rng["$gte"] = filtros.periodo_start
        if filtros.periodo_end:
            rng["$lte"] = filtros.periodo_end
        filt_dev["data"] = rng
    devolucoes = await db.devolucoes.find(filt_dev).to_list(5000)
    devolucoes_qtd = len(devolucoes)
    valor_devolvido = sum(d.get("valor_total", 0) or 0 for d in devolucoes)

    # Ocorrências
    filt_occ: dict = {}
    if filtros.cliente_id:
        filt_occ["cliente_id"] = filtros.cliente_id
    if filtros.promotor_id:
        filt_occ["promotor_id"] = filtros.promotor_id
    ocorrencias = await db.ocorrencias.count_documents(filt_occ)

    lucro = receita - custo - valor_devolvido
    margem = (lucro / receita * 100) if receita else 0.0

    top_produtos_sorted = sorted(top_prod.values(), key=lambda x: x["faturamento"], reverse=True)[:10]
    top_clientes_sorted = sorted(top_clientes.values(), key=lambda x: x["faturamento"], reverse=True)[:10]
    por_regiao_sorted = [
        {"regiao": k, "faturamento": round(v["faturamento"], 2), "lucro": round(v["lucro"], 2)}
        for k, v in sorted(por_regiao.items(), key=lambda x: -x[1]["faturamento"])
    ]
    faturamento_diario = [
        {"data": k, "valor": round(v, 2)} for k, v in sorted(diario.items())
    ]

    return {
        "kpis": {
            "receita": round(receita, 2),
            "custo": round(custo, 2),
            "devolvido": round(valor_devolvido, 2),
            "lucro": round(lucro, 2),
            "margem_pct": round(margem, 2),
            "pedidos_qtd": pedidos_qtd,
            "entregues": entregues,
            "devolucoes_qtd": devolucoes_qtd,
            "ocorrencias_qtd": ocorrencias,
            "ticket_medio": round(receita / pedidos_qtd, 2) if pedidos_qtd else 0.0,
        },
        "top_produtos": [
            {**v, "qtd": round(v["qtd"], 2), "faturamento": round(v["faturamento"], 2)}
            for v in top_produtos_sorted
        ],
        "top_clientes": [
            {**v, "faturamento": round(v["faturamento"], 2)} for v in top_clientes_sorted
        ],
        "por_regiao": por_regiao_sorted,
        "faturamento_diario": faturamento_diario,
    }


# ============================================================================
# DASHBOARD extension (devolucoes counter)
# ============================================================================
@router.get("/pendencias/contadores")
async def pendencias(user=Depends(get_current_user)):
    from server import db

    aguardando = await db.pedidos.count_documents({"status": "aguardando"})
    reentrega = await db.pedidos.count_documents({"status": "reentrega"})
    ocorrencias_abertas = await db.ocorrencias.count_documents({"status": "aberta"})
    devolucoes_registradas = await db.devolucoes.count_documents({"status": "registrada"})
    visitas_pendentes = await db.visitas.count_documents(
        {"status": "agendada", "data": {"$lt": _now()}}
    )
    return {
        "aguardando": aguardando,
        "reentrega": reentrega,
        "ocorrencias_abertas": ocorrencias_abertas,
        "devolucoes_registradas": devolucoes_registradas,
        "visitas_pendentes": visitas_pendentes,
    }
