"""Pydantic models for Paulispan ERP domain."""
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# AUTH
# ============================================================================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "consulta"


# ============================================================================
# CLIENTES / LOJAS
# ============================================================================
class ClienteBase(BaseModel):
    codigo: Optional[str] = None
    nome_rede: str  # Nome da empresa/rede
    nome_loja: str  # Nome da loja/unidade
    cnpj: Optional[str] = None
    regiao: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    endereco: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    contato: Optional[str] = None
    gerente: Optional[str] = None
    horario_recebimento: Optional[str] = None
    valor_minimo_pedido: float = 0.0
    status: str = "ativo"  # ativo | inativo
    observacoes: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteOut(ClienteBase):
    id: str
    created_at: datetime
    updated_at: datetime


# ============================================================================
# PRODUTOS
# ============================================================================
class ProdutoBase(BaseModel):
    sku: str
    nome: str
    categoria: str = "outros"  # bolo | mousse | pave | torta | pudim | outros
    marca: Optional[str] = "Paulispan"
    unidade: str = "cx"
    qtd_por_caixa: float = 1
    preco_venda: float
    custo: float = 0.0
    peso_liquido_g: float = 0.0
    tara_g: float = 0.0
    peso_esperado_balanca_g: float = 0.0
    prazo_validade_dias: int = 0
    status: str = "ativo"
    observacoes: Optional[str] = None


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoOut(ProdutoBase):
    id: str
    margem_pct: float = 0.0
    created_at: datetime
    updated_at: datetime


# ============================================================================
# PEDIDOS
# ============================================================================
class PedidoItemIn(BaseModel):
    produto_id: str
    qtd: float
    preco_unit: float
    desconto: float = 0.0


class PedidoItemOut(BaseModel):
    produto_id: str
    sku: str
    nome: str
    qtd: float
    preco_unit: float
    custo_unit: float
    desconto: float
    subtotal: float


class PedidoCreate(BaseModel):
    cliente_id: str
    data_prevista_entrega: Optional[datetime] = None
    vendedor: Optional[str] = None
    observacoes: Optional[str] = None
    desconto: float = 0.0
    items: List[PedidoItemIn] = Field(default_factory=list)


class PedidoStatusUpdate(BaseModel):
    status: str


class PedidoOut(BaseModel):
    id: str
    numero: str
    cliente_id: str
    cliente_rede: str
    cliente_loja: str
    cidade: Optional[str] = None
    regiao: Optional[str] = None
    data_pedido: datetime
    data_prevista_entrega: Optional[datetime] = None
    vendedor: Optional[str] = None
    observacoes: Optional[str] = None
    status: str
    items: List[PedidoItemOut]
    subtotal: float
    desconto: float
    total: float
    custo_total: float
    lucro: float
    margem_pct: float
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


PEDIDO_STATUS = [
    "aguardando",
    "em_producao",
    "faturado",
    "em_rota",
    "entregue",
    "nao_entregue",
    "cancelado",
    "reentrega",
]

STATUS_CONTA_FATURAMENTO = {"faturado", "em_rota", "entregue"}
