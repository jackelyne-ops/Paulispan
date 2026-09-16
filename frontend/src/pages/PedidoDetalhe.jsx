import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Store, Calendar, User, FileText } from "lucide-react";
import { formatBRL, formatDate, formatPct, formatNumber, STATUS_LABELS } from "@/lib/format";

const STATUS_OPTIONS = ["aguardando", "em_producao", "faturado", "em_rota", "entregue", "nao_entregue", "cancelado", "reentrega"];

export default function PedidoDetalhe() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/pedidos/${id}`);
      setPedido(data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const change = async (newStatus) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status: newStatus });
      toast.success("Status atualizado");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  if (loading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (!pedido) return null;
  const st = STATUS_LABELS[pedido.status] || { label: pedido.status, cls: "" };

  return (
    <div className="space-y-6" data-testid="pedido-detalhe-page">
      <Link to="/pedidos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Voltar para pedidos</Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Pedido de venda</div>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900 font-mono-num">{pedido.numero}</h1>
            <div className="mt-1 text-sm text-slate-500">Criado em {formatDate(pedido.created_at)} · {pedido.created_by || "sistema"}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            <select value={pedido.status} onChange={(e) => change(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs" data-testid="pedido-change-status">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>Alterar → {STATUS_LABELS[s]?.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 md:grid-cols-4">
          <InfoLine icon={Store} label="Cliente" value={<Link to={`/clientes/${pedido.cliente_id}`} className="text-amber-700 hover:underline">{pedido.cliente_loja}</Link>} sub={pedido.cliente_rede} />
          <InfoLine icon={Calendar} label="Data pedido" value={formatDate(pedido.data_pedido)} />
          <InfoLine icon={Calendar} label="Prev. entrega" value={pedido.data_prevista_entrega ? formatDate(pedido.data_prevista_entrega) : "—"} />
          <InfoLine icon={User} label="Vendedor" value={pedido.vendedor || "—"} />
        </div>

        {pedido.observacoes && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{pedido.observacoes}</span>
          </div>
        )}
      </div>

      {/* Financials */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI label="Total do pedido" value={formatBRL(pedido.total)} tint="amber" testid="pd-total" />
        <KPI label="Custo total" value={formatBRL(pedido.custo_total)} tint="slate" testid="pd-custo" />
        <KPI label="Lucro" value={formatBRL(pedido.lucro)} tint="emerald" testid="pd-lucro" />
        <KPI label="Margem" value={formatPct(pedido.margem_pct)} tint="emerald" testid="pd-margem" />
      </div>

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Composição</div>
          <div className="mt-0.5 font-brand text-lg font-semibold text-slate-900">Itens do pedido</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Preço unit.</th>
                <th className="px-4 py-3 text-right">Custo unit.</th>
                <th className="px-4 py-3 text-right">Desc.</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono-num text-xs text-slate-500">{it.sku}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{it.nome}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatNumber(it.qtd, 2)}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatBRL(it.preco_unit)}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-500">{formatBRL(it.custo_unit)}</td>
                  <td className="px-4 py-3 text-right font-mono-num text-slate-500">{formatBRL(it.desconto)}</td>
                  <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">{formatBRL(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={6} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Subtotal</td>
                <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatBRL(pedido.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Desconto geral</td>
                <td className="px-4 py-3 text-right font-mono-num font-semibold text-red-600">- {formatBRL(pedido.desconto)}</td>
              </tr>
              <tr className="bg-amber-50">
                <td colSpan={6} className="px-4 py-3 text-right font-brand text-sm font-bold text-slate-900">Total do pedido</td>
                <td className="px-4 py-3 text-right font-mono-num text-lg font-bold text-amber-700">{formatBRL(pedido.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value, sub }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function KPI({ label, value, tint, testid }) {
  const tints = { amber: "text-amber-600", slate: "text-slate-600", emerald: "text-emerald-600" };
  return (
    <div className="kpi-card" data-testid={testid}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${tints[tint]}`}>{label}</div>
      <div className="mt-2 font-brand text-2xl font-bold text-slate-900 font-mono-num">{value}</div>
    </div>
  );
}
