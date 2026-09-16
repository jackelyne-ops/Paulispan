import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Loader2, ShoppingCart, ChevronRight, Trash2 } from "lucide-react";
import { formatBRL, formatDate, formatPct, STATUS_LABELS } from "@/lib/format";

const STATUS_OPTIONS = ["", "aguardando", "em_producao", "faturado", "em_rota", "entregue", "nao_entregue", "cancelado", "reentrega"];

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (status) params.status = status;
      const { data } = await api.get("/pedidos", { params });
      setPedidos(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, newStatus) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status: newStatus });
      toast.success("Status atualizado");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Excluir pedido ${p.numero}?`)) return;
    try {
      await api.delete(`/pedidos/${p.id}`);
      toast.success("Pedido removido");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-5" data-testid="pedidos-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Comercial</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Pedidos de Venda</h1>
          <p className="mt-1 text-sm text-slate-500">Cada pedido conectado a cliente, produtos, faturamento e resultado real.</p>
        </div>
        <Link to="/pedidos/novo" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700" data-testid="pedidos-add-btn">
          <Plus className="h-4 w-4" /> Novo pedido
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, cliente ou loja" className="h-10 w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20" data-testid="pedidos-search-input" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" data-testid="pedidos-status-filter">
          <option value="">Todos status</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><ShoppingCart className="h-8 w-8" /></div>
            <div className="mt-4 font-brand text-lg font-semibold text-slate-900">Nenhum pedido registrado</div>
            <div className="mt-1 max-w-md text-sm text-slate-500">Comece cadastrando clientes e produtos, então crie um pedido para ver faturamento, custos e margem.</div>
            <Link to="/pedidos/novo" className="mt-5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700">Criar primeiro pedido</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="pedidos-table">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nº Pedido</th>
                  <th className="px-4 py-3 text-left">Cliente / Loja</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-center">Itens</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Margem</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const st = STATUS_LABELS[p.status] || { label: p.status, cls: "bg-slate-100" };
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`pedido-row-${p.id}`}>
                      <td className="px-4 py-3"><Link to={`/pedidos/${p.id}`} className="font-mono-num font-bold text-slate-900 hover:text-amber-700">{p.numero}</Link></td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.cliente_loja}</div>
                        <div className="text-xs text-slate-500">{p.cliente_rede} · {p.cidade || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(p.data_pedido)}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{p.items?.length || 0}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">{formatBRL(p.total)}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-emerald-700">{formatPct(p.margem_pct)}</td>
                      <td className="px-4 py-3 text-center">
                        <select value={p.status} onChange={(e) => changeStatus(p.id, e.target.value)} className={`inline-flex cursor-pointer rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`} data-testid={`pedido-status-${p.id}`}>
                          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => remove(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700" data-testid={`pedido-delete-${p.id}`}><Trash2 className="h-4 w-4" /></button>
                          <Link to={`/pedidos/${p.id}`} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><ChevronRight className="h-4 w-4" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
