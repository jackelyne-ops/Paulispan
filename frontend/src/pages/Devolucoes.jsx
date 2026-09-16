import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Loader2, RotateCcw, X, Trash2, AlertTriangle } from "lucide-react";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";

const STATUS_LABELS = {
  registrada: { label: "Registrada", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  em_analise: { label: "Em análise", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  aprovada: { label: "Aprovada", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  resolvida: { label: "Resolvida", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelada: { label: "Cancelada", cls: "bg-red-50 text-red-800 border-red-200" },
};

export default function Devolucoes() {
  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [opcoes, setOpcoes] = useState({ motivos: [], status: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: devs }, { data: op }] = await Promise.all([
        api.get("/devolucoes"),
        api.get("/devolucoes/opcoes"),
      ]);
      setDevolucoes(devs);
      setOpcoes(op);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (d) => {
    if (!window.confirm(`Remover devolução de ${d.produto_nome}?`)) return;
    try {
      await api.delete(`/devolucoes/${d.id}`);
      toast.success("Devolução removida");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const totais = devolucoes.reduce(
    (a, d) => ({ qtd: a.qtd + 1, valor: a.valor + (d.valor_total || 0) }),
    { qtd: 0, valor: 0 }
  );

  return (
    <div className="space-y-5" data-testid="devolucoes-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Pós-venda</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Devoluções &amp; Trocas</h1>
          <p className="mt-1 text-sm text-slate-500">Vincule cada devolução ao pedido/NF/motivo — impacto direto no resultado do cliente.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700" data-testid="devolucoes-add-btn">
          <Plus className="h-4 w-4" /> Nova devolução
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="kpi-card" data-testid="dev-kpi-qtd">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><RotateCcw className="h-4 w-4" /></div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Devoluções registradas</div>
          <div className="mt-1 font-brand text-2xl font-bold text-slate-900 font-mono-num">{formatNumber(totais.qtd)}</div>
        </div>
        <div className="kpi-card" data-testid="dev-kpi-valor">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="h-4 w-4" /></div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Valor devolvido</div>
          <div className="mt-1 font-brand text-2xl font-bold text-slate-900 font-mono-num">{formatBRL(totais.valor)}</div>
        </div>
        <div className="kpi-card">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><RotateCcw className="h-4 w-4" /></div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Impacto na margem</div>
          <div className="mt-1 font-brand text-2xl font-bold text-slate-900 font-mono-num">{formatBRL(-totais.valor)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Deduzido do lucro consolidado</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
        ) : devolucoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><RotateCcw className="h-8 w-8" /></div>
            <div className="mt-4 font-brand text-lg font-semibold text-slate-900">Nenhuma devolução registrada</div>
            <div className="mt-1 max-w-md text-sm text-slate-500">Cadastre devoluções para acompanhar impacto no faturamento, no estoque e nos indicadores de qualidade por loja.</div>
            <button onClick={() => setModalOpen(true)} className="mt-5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700">Registrar primeira devolução</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="devolucoes-table">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Pedido / NF</th>
                  <th className="px-4 py-3 text-left">Cliente / Loja</th>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-left">Motivo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {devolucoes.map((d) => {
                  const st = STATUS_LABELS[d.status] || { label: d.status, cls: "" };
                  return (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`devolucao-row-${d.id}`}>
                      <td className="px-4 py-3 text-slate-600">{formatDate(d.data)}</td>
                      <td className="px-4 py-3"><Link to={`/pedidos/${d.pedido_id}`} className="font-mono-num text-sm font-semibold text-slate-900 hover:text-amber-700">{d.pedido_numero}</Link><div className="text-xs text-slate-500">NF {d.nf || "—"}</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-900">{d.cliente_loja}</div><div className="text-xs text-slate-500">{d.cliente_rede}</div></td>
                      <td className="px-4 py-3"><div className="font-medium text-slate-900">{d.produto_nome}</div><div className="font-mono-num text-xs text-slate-500">{d.produto_sku}</div></td>
                      <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatNumber(d.qtd, 2)}</td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-rose-700">{formatBRL(d.valor_total)}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{d.motivo_label}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="px-4 py-3 text-right"><button onClick={() => remove(d)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <DevolucaoModal opcoes={opcoes} onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); load(); }} />}
    </div>
  );
}

function DevolucaoModal({ opcoes, onClose, onCreated }) {
  const [pedidos, setPedidos] = useState([]);
  const [pedido, setPedido] = useState(null);
  const [pedidoId, setPedidoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [valorUnit, setValorUnit] = useState(0);
  const [motivo, setMotivo] = useState("produto_nao_conforme");
  const [nf, setNf] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState("registrada");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/pedidos");
      setPedidos(data);
    })();
  }, []);

  useEffect(() => {
    if (!pedidoId) { setPedido(null); return; }
    (async () => {
      const { data } = await api.get(`/pedidos/${pedidoId}`);
      setPedido(data);
      if (data.items?.length > 0) {
        const it = data.items[0];
        setProdutoId(it.produto_id);
        setValorUnit(it.preco_unit);
      }
    })();
  }, [pedidoId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!pedidoId || !produtoId) return toast.error("Selecione pedido e produto");
    setSaving(true);
    try {
      await api.post("/devolucoes", {
        pedido_id: pedidoId,
        produto_id: produtoId,
        qtd: parseFloat(qtd),
        valor_unit: parseFloat(valorUnit),
        motivo,
        nf: nf || null,
        observacoes: observacoes || null,
        status,
      });
      toast.success("Devolução registrada");
      onCreated();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Nova</div>
            <h3 className="font-brand text-xl font-bold text-slate-900">Devolução</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Pedido original *</Label>
            <select required value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} className={inputCls} data-testid="dev-pedido-select">
              <option value="">Selecione…</option>
              {pedidos.map((p) => <option key={p.id} value={p.id}>{p.numero} — {p.cliente_loja} · {formatBRL(p.total)}</option>)}
            </select>
          </div>
          <div>
            <Label>Produto devolvido *</Label>
            <select required value={produtoId} onChange={(e) => { setProdutoId(e.target.value); const it = pedido?.items?.find((x) => x.produto_id === e.target.value); if (it) setValorUnit(it.preco_unit); }} className={inputCls} data-testid="dev-produto-select">
              <option value="">{pedido ? "Selecione…" : "Escolha o pedido antes"}</option>
              {pedido?.items?.map((it) => <option key={it.produto_id} value={it.produto_id}>{it.sku} — {it.nome}</option>)}
            </select>
          </div>
          <div>
            <Label>NF de origem</Label>
            <input value={nf} onChange={(e) => setNf(e.target.value)} className={inputCls} data-testid="dev-nf-input" />
          </div>
          <div>
            <Label>Quantidade devolvida *</Label>
            <input required type="number" step="0.01" min="0" value={qtd} onChange={(e) => setQtd(e.target.value)} className={inputCls} data-testid="dev-qtd-input" />
          </div>
          <div>
            <Label>Valor unitário (R$) *</Label>
            <input required type="number" step="0.01" min="0" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} className={inputCls} data-testid="dev-valor-input" />
          </div>
          <div>
            <Label>Motivo *</Label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls} data-testid="dev-motivo-select">
              {opcoes.motivos.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {opcoes.status.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Observações</Label>
            <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={inputCls} />
          </div>

          <div className="sm:col-span-2 rounded-lg bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
            <strong>Total da devolução:</strong> {formatBRL(qtd * valorUnit)} · será deduzido do lucro do pedido e registrado em movimento de estoque.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60" data-testid="dev-save-btn">
            {saving ? "Salvando…" : "Registrar devolução"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";
function Label({ children }) { return <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">{children}</span>; }
