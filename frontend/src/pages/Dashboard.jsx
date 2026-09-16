import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { formatBRL, formatNumber, formatPct, STATUS_LABELS } from "@/lib/format";
import {
  Wallet,
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Package,
  Store,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const KPI = ({ testid, icon: Icon, label, value, sub, tint = "amber" }) => {
  const tints = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="kpi-card" data-testid={testid}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-1 font-brand text-2xl font-bold tracking-tight text-slate-900 font-mono-num">{value}</div>
        {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
};

const STATUS_COLORS = {
  aguardando: "#F59E0B",
  em_producao: "#2563EB",
  faturado: "#9333EA",
  em_rota: "#0891B2",
  entregue: "#059669",
  nao_entregue: "#E11D48",
  cancelado: "#DC2626",
  reentrega: "#EA580C",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/dashboard/kpis");
        setData(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center" data-testid="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const donut = Object.entries(data?.status_distribuicao || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k]?.label || k, value: v, key: k }));

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Visão Executiva</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Dashboard Paulispan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Faturamento, margem e status operacional em tempo real — filtre e drill-down por cliente ou produto.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-700">Ao vivo</span>
          <span className="text-slate-400">· atualizado agora</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <KPI testid="kpi-faturamento" icon={Wallet} label="Faturamento (mês em curso)" value={formatBRL(data.faturamento)} sub={`Ticket médio ${formatBRL(data.ticket_medio)}`} tint="amber" />
        <KPI testid="kpi-lucro" icon={TrendingUp} label="Lucro Bruto" value={formatBRL(data.lucro)} sub={`Margem ${formatPct(data.margem_pct)}`} tint="emerald" />
        <KPI testid="kpi-pedidos-abertos" icon={ShoppingCart} label="Pedidos em Aberto" value={formatNumber(data.pedidos_abertos)} sub={`${data.pedidos_total} totais`} tint="blue" />
        <KPI testid="kpi-entregues" icon={CheckCircle2} label="Pedidos Entregues" value={formatNumber(data.pedidos_entregues)} sub={`Não entregues ${data.pedidos_nao_entregues}`} tint="emerald" />
        <KPI testid="kpi-devolucoes" icon={AlertTriangle} label="Devoluções" value={formatNumber(data.devolucoes_qtd)} sub={`Valor ${formatBRL(data.valor_devolvido)}`} tint="rose" />
        <KPI testid="kpi-custo" icon={Package} label="Custos Operacionais" value={formatBRL(data.custo)} sub={`${formatPct((data.custo/(data.faturamento||1))*100)} sobre venda`} tint="slate" />
        <KPI testid="kpi-clientes" icon={Store} label="Clientes Ativos" value={formatNumber(data.clientes_ativos)} sub="Lojas cadastradas" tint="amber" />
        <KPI testid="kpi-produtos" icon={Package} label="Produtos Ativos" value={formatNumber(data.produtos_ativos)} sub="Catálogo em atividade" tint="blue" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2" data-testid="chart-faturamento-diario">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Faturamento diário</div>
              <div className="mt-1 font-brand text-lg font-semibold text-slate-900">Últimos 30 dias</div>
            </div>
            <Link to="/financeiro" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
              Ver financeiro <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {data.faturamento_diario.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="text-4xl">📊</div>
              <div className="mt-2 font-semibold text-slate-700">Sem faturamento ainda</div>
              <div className="mt-1 text-xs text-slate-500">Crie pedidos e mude o status para <strong>Faturado</strong> para ver a curva.</div>
              <Link to="/pedidos/novo" className="mt-4 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Criar pedido</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.faturamento_diario}>
                <defs>
                  <linearGradient id="fatColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D97706" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="data" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatBRL(v)} labelFormatter={(v) => `Dia ${v}`} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Area type="monotone" dataKey="valor" stroke="#D97706" strokeWidth={2.5} fill="url(#fatColor)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="chart-status-donut">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Distribuição</div>
          <div className="mt-1 font-brand text-lg font-semibold text-slate-900">Pedidos por Status</div>
          {donut.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-slate-500">Sem pedidos cadastrados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {donut.map((d) => (
                      <Cell key={d.key} fill={STATUS_COLORS[d.key] || "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {donut.map((d) => (
                  <div key={d.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top produtos */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="chart-top-produtos">
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Ranking</div>
          <div className="mt-1 font-brand text-lg font-semibold text-slate-900">Top 5 Sobremesas por Faturamento</div>
        </div>
        {data.top_produtos.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">Aguardando pedidos faturados para gerar ranking.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.top_produtos} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nome" stroke="#475569" fontSize={11} width={180} />
              <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="faturamento" fill="#D97706" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
