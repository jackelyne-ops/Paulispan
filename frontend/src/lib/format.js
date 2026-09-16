// Brazilian formatters for currency, numbers and dates.

export function formatBRL(value) {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value, digits = 1) {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const STATUS_LABELS = {
  aguardando: { label: "Aguardando", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  em_producao: { label: "Em Produção", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  faturado: { label: "Faturado", cls: "bg-purple-50 text-purple-800 border-purple-200" },
  em_rota: { label: "Em Rota", cls: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  entregue: { label: "Entregue", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  nao_entregue: { label: "Não Entregue", cls: "bg-rose-50 text-rose-800 border-rose-200" },
  cancelado: { label: "Cancelado", cls: "bg-red-50 text-red-800 border-red-200" },
  reentrega: { label: "Reentrega", cls: "bg-orange-50 text-orange-800 border-orange-200" },
};

export const CATEGORIAS = [
  { value: "bolo", label: "Bolo" },
  { value: "mousse", label: "Mousse" },
  { value: "pave", label: "Pavê" },
  { value: "torta", label: "Torta" },
  { value: "pudim", label: "Pudim" },
  { value: "outros", label: "Outros" },
];

export const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "comercial", label: "Comercial" },
  { value: "financeiro", label: "Financeiro" },
  { value: "logistica", label: "Logística" },
  { value: "promotores", label: "Promotores" },
  { value: "consulta", label: "Consulta" },
];
