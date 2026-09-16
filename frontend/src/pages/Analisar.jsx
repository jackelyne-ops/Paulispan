import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, Loader2, Wallet, TrendingUp, Package, AlertTriangle, ShoppingCart, MapPin, RotateCcw, ClipboardList } from "lucide-react";
import { formatBRL, formatPct, formatNumber, CATEGORIAS, STATUS_LABELS } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

const EMPTY_FILTERS = {
  periodo_start: "",
  periodo_end: "",
  cliente_id: "",
  produto_id: "",
  categoria: "",
  regiao: "",
  cidade: "",
  estado: "",
  rota_id: "",
  promotor_id: "",
  status: "",
};

export default function Analisar() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [promotores, setPromotores] = useState([]);
  const [result, setResult] = useState(null);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, r, pr] = await Promise.all([api.get("/clientes"), api.get("/produtos"), api.get("/rotas"), api.get("/promotores")]);
        setClientes(c.data); setProdutos(p.data); setRotas(r.data); setPromotores(pr.data);
      } finally { setLoadingRefs(false); }
    })();
  }, []);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  const run = async (e) => {
    e?.preventDefault?.();
    setRunning(true);
    try {
      const payload = { ...filters };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      if (payload.periodo_start) payload.periodo_start = new Date(payload.periodo_start).toISOString();
      if (payload.periodo_end) payload.periodo_end = new Date(payload.periodo_end + "T23:59:59").toISOString();
      const { data } = await api.post("/analisar", payload);
      setResult(data);
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setRunning(false); }
  };

  const reset = () => { setFilters(EMPTY_FILTERS); setResult(null); };

  if (loadingRefs) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;

  return (
    <div className="space-y-5" data-testid="analisar-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Motor de análise</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Analisar</h1>
          <p className="mt-1 text-sm text-slate-500">Combine filtros e o sistema calcula automaticamente faturamento, custos, devoluções, margem, top produtos, clientes e regiões.</p>
        </div>
      </div>

      <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-sm" data-testid="analisar-form">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <FField label="Período — de"><input type="date" value={filters.periodo_start} onChange={set("periodo_start")} className={inputCls} data-testid="an-periodo-start" /></FField>
          <FField label="Período — até"><input type="date" value={filters.periodo_end} onChange={set("periodo_end")} className={inputCls} data-testid="an-periodo-end" /></FField>
          <FField label="Cliente / Loja">
            <select value={filters.cliente_id} onChange={set("cliente_id")} className={inputCls} data-testid="an-cliente-select"><option value="">Todos</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_loja}</option>)}</select>
          </FField>
          <FField label="Produto">
            <select value={filters.produto_id} onChange={set("produto_id")} className={inputCls} data-testid="an-produto-select"><option value="">Todos</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </FField>
          <FField label="Categoria">
            <select value={filters.categoria} onChange={set("categoria")} className={inputCls}><option value="">Todas</option>{CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </FField>
          <FField label="Região"><input value={filters.regiao} onChange={set("regiao")} placeholder="Ex: SP-Capital" className={inputCls} /></FField>
          <FField label="Cidade"><input value={filters.cidade} onChange={set("cidade")} className={inputCls} /></FField>
          <FField label="Estado (UF)"><input value={filters.estado} onChange={set("estado")} maxLength={2} className={inputCls} /></FField>
          <FField label="Rota">
            <select value={filters.rota_id} onChange={set("rota_id")} className={inputCls}><option value="">Todas</option>{rotas.map((r) => <option key={r.id} value={r.id}>{r.codigo} — {r.nome}</option>)}</select>
          </FField>
          <FField label="Promotor">
            <select value={filters.promotor_id} onChange={set("promotor_id")} className={inputCls}><option value="">Todos</option>{promotores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </FField>
          <FField label="Status do pedido">
            <select value={filters.status} onChange={set("status")} className={inputCls} data-testid="an-status-select"><option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </FField>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60" data-testid="analisar-run-btn">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Analisando…" : "Analisar recorte"}
          </button>
          <button type="button" onClick={reset} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="analisar-reset-btn">Limpar filtros</button>
          <span className="text-xs text-slate-500">Ex: "Quanto vendi para região SP no mês, e quanto isso me custou?"</span>
        </div>
      </form>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <KPI icon={Wallet} label="Receita" value={formatBRL(result.kpis.receita)} tint="amber" testid="an-kpi-receita" />
            <KPI icon={Package} label="Custos" value={formatBRL(result.kpis.custo)} tint="slate" testid="an-kpi-custo" />
            <KPI icon={RotateCcw} label="Devolvido" value={formatBRL(result.kpis.devolvido)} tint="rose" />
            <KPI icon={TrendingUp} label="Lucro" value={formatBRL(result.kpis.lucro)} sub={`Margem ${formatPct(result.kpis.margem_pct)}`} tint="emerald" testid="an-kpi-lucro" />
            <KPI icon={ShoppingCart} label="Pedidos" value={formatNumber(result.kpis.pedidos_qtd)} sub={`Ticket ${formatBRL(result.kpis.ticket_medio)}`} tint="blue" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card testid="an-chart-diario" title="Faturamento no recorte">
              {result.faturamento_diario.length === 0 ? <Empty text="Sem dados no período." /> :
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={result.faturamento_diario}>
                    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D97706" stopOpacity={0.6} /><stop offset="100%" stopColor="#D97706" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="data" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Area dataKey="valor" stroke="#D97706" fill="url(#ag)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              }
            </Card>

            <Card testid="an-top-produtos" title="Top produtos (faturamento)">
              {result.top_produtos.length === 0 ? <Empty text="Sem itens." /> :
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={result.top_produtos.slice(0, 6)} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" stroke="#475569" fontSize={10} width={140} />
                    <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                    <Bar dataKey="faturamento" fill="#D97706" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              }
            </Card>

            <Card testid="an-por-regiao" title="Por região (faturamento vs lucro)">
              {result.por_regiao.length === 0 ? <Empty text="Sem dados regionais." /> :
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.por_regiao.slice(0, 8).map((r, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800"><MapPin className="h-3 w-3 text-slate-400" /> {r.regiao}</div>
                        <div className="font-mono-num font-bold text-slate-900">{formatBRL(r.faturamento)}</div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Lucro</span>
                        <span className="font-mono-num font-semibold text-emerald-700">{formatBRL(r.lucro)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </Card>
          </div>

          <Card testid="an-top-clientes" title="Top clientes">
            {result.top_clientes.length === 0 ? <Empty text="Sem clientes no recorte." /> :
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3 text-left">Cliente</th><th className="px-4 py-3 text-right">Faturamento</th></tr>
                </thead>
                <tbody>
                  {result.top_clientes.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-slate-900">{c.nome}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatBRL(c.faturamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </Card>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4" /> Resumo do recorte</div>
            <div className="mt-1 text-xs">
              {formatNumber(result.kpis.pedidos_qtd)} pedidos · {formatBRL(result.kpis.receita)} de receita · {formatBRL(result.kpis.custo)} de custo ·
              {" "}{formatBRL(result.kpis.devolvido)} devolvido · <strong>{formatBRL(result.kpis.lucro)} de lucro ({formatPct(result.kpis.margem_pct)})</strong> ·
              {" "}{result.kpis.devolucoes_qtd} devoluções · {result.kpis.ocorrencias_qtd} ocorrências.
            </div>
          </div>
        </>
      )}

      {!result && !running && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-amber-500" />
          <div className="mt-2 font-brand text-lg font-semibold text-slate-900">Escolha os filtros e clique em Analisar</div>
          <div className="mt-1 text-sm text-slate-500">Cruze período × cliente × produto × rota × promotor sem precisar montar planilhas.</div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, tint = "amber", testid }) {
  const tints = { amber: "bg-amber-50 text-amber-600", slate: "bg-slate-100 text-slate-700", emerald: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600", blue: "bg-blue-50 text-blue-600" };
  return (
    <div className="kpi-card" data-testid={testid}>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-brand text-2xl font-bold text-slate-900 font-mono-num">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Card({ title, children, testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid={testid}>
      <div className="mb-3 font-brand text-base font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div className="flex h-40 items-center justify-center text-center text-xs text-slate-500"><AlertTriangle className="mr-2 h-4 w-4 text-slate-400" /> {text}</div>;
}

function FField({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">{label}</span>{children}</label>; }
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";
