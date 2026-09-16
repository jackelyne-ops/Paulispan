"""Models for operational modules: devoluções, logística, promotores, análise."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ============================================================================
# DEVOLUÇÕES
# ============================================================================
MOTIVOS_DEVOLUCAO = [
    ("produto_nao_conforme", "Produto não conforme"),
    ("produto_danificado", "Produto danificado"),
    ("produto_incorreto", "Produto incorreto"),
    ("vencimento", "Vencimento próximo/vencido"),
    ("excesso", "Excesso de produto"),
    ("recusa", "Recusa da loja"),
    ("outros", "Outros"),
]

STATUS_DEVOLUCAO = ["registrada", "em_analise", "aprovada", "resolvida", "cancelada"]


class DevolucaoCreate(BaseModel):
    pedido_id: str
    produto_id: str
    qtd: float
    valor_unit: float
    motivo: str = "outros"
    nf: Optional[str] = None
    data: Optional[datetime] = None
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    status: str = "registrada"


class DevolucaoOut(BaseModel):
    id: str
    pedido_id: str
    pedido_numero: str
    cliente_id: str
    cliente_rede: str
    cliente_loja: str
    produto_id: str
    produto_sku: str
    produto_nome: str
    qtd: float
    valor_unit: float
    valor_total: float
    motivo: str
    motivo_label: str
    nf: Optional[str] = None
    data: datetime
    responsavel: Optional[str] = None
    observacoes: Optional[str] = None
    status: str
    created_by: Optional[str] = None
    created_at: datetime


# ============================================================================
# LOGÍSTICA – CAMINHÕES
# ============================================================================
class CaminhaoBase(BaseModel):
    placa: str
    modelo: Optional[str] = None
    capacidade_kg: float = 0.0
    tipo: str = "refrigerado"  # refrigerado | seco
    status: str = "ativo"
    observacoes: Optional[str] = None


class CaminhaoCreate(CaminhaoBase):
    pass


class CaminhaoOut(CaminhaoBase):
    id: str
    created_at: datetime


# ============================================================================
# LOGÍSTICA – MOTORISTAS
# ============================================================================
class MotoristaBase(BaseModel):
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    cnh: Optional[str] = None
    categoria_cnh: Optional[str] = None
    validade_cnh: Optional[str] = None
    status: str = "ativo"
    observacoes: Optional[str] = None


class MotoristaCreate(MotoristaBase):
    pass


class MotoristaOut(MotoristaBase):
    id: str
    created_at: datetime


# ============================================================================
# LOGÍSTICA – ROTAS
# ============================================================================
STATUS_ROTA = [
    "planejada",
    "em_carregamento",
    "em_rota",
    "entregue",
    "parcial",
    "nao_entregue",
    "reentrega",
    "finalizada",
]


class RotaCreate(BaseModel):
    codigo: Optional[str] = None
    nome: str
    regiao: Optional[str] = None
    estado: Optional[str] = None
    cidades: List[str] = Field(default_factory=list)
    data: Optional[datetime] = None
    motorista_id: Optional[str] = None
    caminhao_id: Optional[str] = None
    pedido_ids: List[str] = Field(default_factory=list)
    km_estimado: float = 0.0
    custo_combustivel: float = 0.0
    custo_pedagio: float = 0.0
    outros_custos: float = 0.0
    status: str = "planejada"
    observacoes: Optional[str] = None


class RotaOut(BaseModel):
    id: str
    codigo: str
    nome: str
    regiao: Optional[str] = None
    estado: Optional[str] = None
    cidades: List[str] = Field(default_factory=list)
    data: Optional[datetime] = None
    motorista_id: Optional[str] = None
    motorista_nome: Optional[str] = None
    caminhao_id: Optional[str] = None
    caminhao_placa: Optional[str] = None
    pedido_ids: List[str] = Field(default_factory=list)
    pedidos_qtd: int = 0
    faturamento_transportado: float = 0.0
    km_estimado: float = 0.0
    custo_combustivel: float = 0.0
    custo_pedagio: float = 0.0
    outros_custos: float = 0.0
    custo_total: float = 0.0
    custo_por_pedido: float = 0.0
    status: str
    observacoes: Optional[str] = None
    created_at: datetime


# ============================================================================
# PROMOTORES + AGÊNCIAS
# ============================================================================
class AgenciaCreate(BaseModel):
    nome: str
    contato: Optional[str] = None
    telefone: Optional[str] = None
    status: str = "ativa"


class AgenciaOut(AgenciaCreate):
    id: str
    created_at: datetime


class PromotorCreate(BaseModel):
    nome: str
    agencia_id: Optional[str] = None
    telefone: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    lojas_ids: List[str] = Field(default_factory=list)
    status: str = "ativo"


class PromotorOut(PromotorCreate):
    id: str
    agencia_nome: Optional[str] = None
    created_at: datetime


# ============================================================================
# VISITAS + EXECUÇÃO + NÃO CONFORMIDADES
# ============================================================================
STATUS_VISITA = ["agendada", "realizada", "nao_realizada", "promotor_ausente", "reagendada", "cancelada"]


class ExecucaoData(BaseModel):
    apresentacao: bool = False
    pesagem: bool = False
    etiquetagem: bool = False
    abastecimento: bool = False
    validade_ok: bool = False
    organizacao: bool = False
    submarcas: bool = False
    produtos_encontrados: int = 0
    qtd_pesada: int = 0
    qtd_nao_conforme: int = 0
    produtos_faltantes: int = 0
    produtos_vencidos: int = 0
    produtos_proximos_venc: int = 0
    fotos: List[str] = Field(default_factory=list)
    observacoes: Optional[str] = None
    assinatura_encarregado: Optional[str] = None


class VisitaCreate(BaseModel):
    promotor_id: str
    cliente_id: str
    data: datetime
    horario: Optional[str] = None
    observacoes: Optional[str] = None
    status: str = "agendada"


class VisitaExecutar(BaseModel):
    execucao: ExecucaoData


class VisitaOut(BaseModel):
    id: str
    promotor_id: str
    promotor_nome: str
    agencia_nome: Optional[str] = None
    cliente_id: str
    cliente_rede: str
    cliente_loja: str
    data: datetime
    horario: Optional[str] = None
    status: str
    observacoes: Optional[str] = None
    execucao: Optional[ExecucaoData] = None
    executada_em: Optional[datetime] = None
    created_at: datetime


TIPOS_OCORRENCIA = [
    ("peso_incorreto", "Peso incorreto"),
    ("etiqueta_incorreta", "Etiqueta incorreta"),
    ("sem_etiqueta", "Falta de etiqueta"),
    ("fora_area_venda", "Produto fora da área de venda"),
    ("armazenado_errado", "Produto armazenado incorretamente"),
    ("vencido", "Produto vencido"),
    ("proximo_vencimento", "Produto próximo do vencimento"),
    ("danificado", "Produto danificado"),
    ("falta_produto", "Falta de produto"),
    ("divergencia_qtd", "Divergência de quantidade"),
    ("promotor_nao_compareceu", "Promotor não compareceu"),
    ("nao_executou", "Promotor compareceu, mas não executou o serviço"),
    ("outros", "Outros"),
]

STATUS_OCORRENCIA = ["aberta", "em_analise", "resolvida", "cancelada"]


class OcorrenciaCreate(BaseModel):
    cliente_id: str
    produto_id: Optional[str] = None
    promotor_id: Optional[str] = None
    visita_id: Optional[str] = None
    tipo: str
    quantidade: float = 0
    descricao: Optional[str] = None
    fotos: List[str] = Field(default_factory=list)
    responsavel: Optional[str] = None
    status: str = "aberta"


class OcorrenciaOut(BaseModel):
    id: str
    cliente_id: str
    cliente_rede: str
    cliente_loja: str
    produto_id: Optional[str] = None
    produto_nome: Optional[str] = None
    promotor_id: Optional[str] = None
    promotor_nome: Optional[str] = None
    visita_id: Optional[str] = None
    tipo: str
    tipo_label: str
    quantidade: float = 0
    descricao: Optional[str] = None
    fotos: List[str] = Field(default_factory=list)
    responsavel: Optional[str] = None
    status: str
    data: datetime
    data_resolucao: Optional[datetime] = None


# ============================================================================
# ANALISAR — Filtros combinados
# ============================================================================
class AnalisarFiltros(BaseModel):
    periodo_start: Optional[datetime] = None
    periodo_end: Optional[datetime] = None
    cliente_id: Optional[str] = None
    produto_id: Optional[str] = None
    categoria: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    rota_id: Optional[str] = None
    motorista_id: Optional[str] = None
    caminhao_id: Optional[str] = None
    promotor_id: Optional[str] = None
    status: Optional[str] = None
