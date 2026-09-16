import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { formatBRL, formatDate, formatPct, STATUS_LABELS } from "@/lib/format";
import { Wallet, TrendingUp, Package, AlertTriangle, Loader2 } from "lucide-react";

export default function Financeiro() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/financeiro/resultado");
        setData(data);
      } catch (e) { setErr(formatApiError(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (err) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>;
  const { totais, linhas } = data;

  return (
    <div className="space-y-5" data-testid="financeiro-page">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Gestão</div>
        <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Financeiro &amp; Margem</h1>
        <p className="mt-1 text-sm text-slate-500">Resultado por pedido: receita, custo, descontos, devoluções e margem — tudo interligado.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI icon={Wallet} label="Receita realizada" value={formatBRL(totais.receita)} tint="amber" testid="fin-receita" />
        <KPI icon={Package} label="Custos" value={formatBRL(totais.custo)} tint="slate" testid="fin-custo" />
        <KPI icon={TrendingUp} label="Lucro" value={formatBRL(totais.lucro)} sub={`Margem ${formatPct(totais.margem_pct)}`} tint="emerald" testid="fin-lucro" />
        <KPI icon={AlertTriangle} label="Devolvido / Cancelado" value={formatBRL(totais.devolvido)} tint="rose" testid="fin-devolvido" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Resultado por pedido</div>
          <div className="mt-0.5 font-brand text-lg font-semibold text-slate-900">Receita · Custo · Lucro · Margem</div>
        </div>
        {linhas.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Sem movimentação financeira ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="financeiro-table">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Receita</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Lucro</th>
                  <th className="px-4 py-3 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const st = STATUS_LABELS[l.status] || { label: l.status, cls: "" };
                  return (
                    <tr key={l.pedido_id} className="border-b border-slate-100 hover:bg-amber-50/30">
                      <td className="px-4 py-3"><Link to={`/pedidos/${l.pedido_id}`} className="font-mono-num font-semibold text-slate-900 hover:text-amber-700">{l.numero}</Link></td>
                      <td className="px-4 py-3 text-slate-700">{l.cliente}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(l.data)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">{formatBRL(l.receita)}</td>
                      <td className="px-4 py-3 text-right font-mono-num text-slate-600">{formatBRL(l.custo)}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-emerald-700">{formatBRL(l.lucro)}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatPct(l.margem_pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-500">Totais</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-900">{formatBRL(totais.receita)}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatBRL(totais.custo)}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-emerald-700">{formatBRL(totais.lucro)}</td>
                  <td className="px-4 py-3 text-right font-mono-num">{formatPct(totais.margem_pct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, tint, testid }) {
  const tints = {
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="kpi-card" data-testid={testid}>
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-brand text-2xl font-bold text-slate-900 font-mono-num">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
