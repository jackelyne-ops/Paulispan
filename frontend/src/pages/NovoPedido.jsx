import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { formatBRL, formatPct } from "@/lib/format";

export default function NovoPedido() {
  const nav = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [clienteId, setClienteId] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([api.get("/clientes"), api.get("/produtos")]);
        setClientes(c.data);
        setProdutos(p.data);
      } catch (e) {
        toast.error(formatApiError(e));
      } finally { setLoadingRefs(false); }
    })();
  }, []);

  const addItem = () => {
    if (produtos.length === 0) { toast.error("Cadastre produtos primeiro"); return; }
    const first = produtos[0];
    setItems([...items, { produto_id: first.id, qtd: 1, preco_unit: first.preco_venda, desconto: 0, custo_unit: first.custo, nome: first.nome, sku: first.sku }]);
  };

  const updateItem = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    if (patch.produto_id) {
      const prod = produtos.find((p) => p.id === patch.produto_id);
      if (prod) {
        next[idx].preco_unit = prod.preco_venda;
        next[idx].custo_unit = prod.custo;
        next[idx].nome = prod.nome;
        next[idx].sku = prod.sku;
      }
    }
    setItems(next);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    let subtotal = 0;
    let custo = 0;
    items.forEach((it) => {
      subtotal += (it.qtd * it.preco_unit) - (it.desconto || 0);
      custo += it.qtd * (it.custo_unit || 0);
    });
    const total = subtotal - (desconto || 0);
    const lucro = total - custo;
    const margem = total ? (lucro / total * 100) : 0;
    return { subtotal, custo, total, lucro, margem };
  }, [items, desconto]);

  const cliente = clientes.find((c) => c.id === clienteId);

  const submit = async (e) => {
    e.preventDefault();
    if (!clienteId) return toast.error("Selecione um cliente");
    if (items.length === 0) return toast.error("Adicione ao menos 1 item");
    if (cliente?.valor_minimo_pedido && totals.total < cliente.valor_minimo_pedido) {
      if (!window.confirm(`Total abaixo do mínimo do cliente (${formatBRL(cliente.valor_minimo_pedido)}). Continuar?`)) return;
    }

    setSaving(true);
    try {
      const payload = {
        cliente_id: clienteId,
        data_prevista_entrega: dataPrevista || null,
        vendedor: vendedor || null,
        observacoes: observacoes || null,
        desconto: desconto || 0,
        items: items.map((it) => ({
          produto_id: it.produto_id,
          qtd: it.qtd,
          preco_unit: it.preco_unit,
          desconto: it.desconto || 0,
        })),
      };
      const { data } = await api.post("/pedidos", payload);
      toast.success(`Pedido ${data.numero} criado`);
      nav(`/pedidos/${data.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setSaving(false); }
  };

  if (loadingRefs) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="novo-pedido-page">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Voltar</button>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Comercial</div>
        <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Novo pedido de venda</h1>
        <p className="mt-1 text-sm text-slate-500">Escolha o cliente, adicione produtos e o resultado (custo, lucro, margem) é calculado ao vivo.</p>
      </div>

      {/* Client + info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Cliente / Loja *</label>
            <select required value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={inputCls} data-testid="pedido-cliente-select">
              <option value="">Selecione…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_loja} — {c.nome_rede}</option>)}
            </select>
            {cliente && (
              <div className="mt-2 rounded-lg bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
                {cliente.cidade || "—"}{cliente.estado ? `/${cliente.estado}` : ""} · Mín. pedido {formatBRL(cliente.valor_minimo_pedido)}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Data prevista</label>
            <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} className={inputCls} data-testid="pedido-data-prevista" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Vendedor</label>
            <input value={vendedor} onChange={(e) => setVendedor(e.target.value)} className={inputCls} data-testid="pedido-vendedor" />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Itens</div>
            <div className="mt-0.5 font-brand text-base font-semibold text-slate-900">Produtos do pedido</div>
          </div>
          <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800" data-testid="pedido-add-item-btn">
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </button>
        </div>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum item. Clique em <strong>“Adicionar item”</strong> para começar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-right w-24">Qtd</th>
                  <th className="px-3 py-2 text-right w-32">Preço unit.</th>
                  <th className="px-3 py-2 text-right w-28">Desc. R$</th>
                  <th className="px-3 py-2 text-right w-32">Subtotal</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const subtotal = (it.qtd * it.preco_unit) - (it.desconto || 0);
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <select value={it.produto_id} onChange={(e) => updateItem(idx, { produto_id: e.target.value })} className={inputCls} data-testid={`pedido-item-produto-${idx}`}>
                          {produtos.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.nome}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={it.qtd} onChange={(e) => updateItem(idx, { qtd: parseFloat(e.target.value || 0) })} className={`${inputCls} text-right font-mono-num`} data-testid={`pedido-item-qtd-${idx}`} /></td>
                      <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={it.preco_unit} onChange={(e) => updateItem(idx, { preco_unit: parseFloat(e.target.value || 0) })} className={`${inputCls} text-right font-mono-num`} data-testid={`pedido-item-preco-${idx}`} /></td>
                      <td className="px-3 py-2 text-right"><input type="number" step="0.01" value={it.desconto || 0} onChange={(e) => updateItem(idx, { desconto: parseFloat(e.target.value || 0) })} className={`${inputCls} text-right font-mono-num`} /></td>
                      <td className="px-3 py-2 text-right font-mono-num font-semibold text-slate-900" data-testid={`pedido-item-subtotal-${idx}`}>{formatBRL(subtotal)}</td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeItem(idx)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary + footer */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Observações</label>
          <textarea rows={5} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Instruções de entrega, condições, etc." className={inputCls} data-testid="pedido-obs" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-[#0B1120] p-5 shadow-md text-white" data-testid="pedido-resumo">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">Resumo</div>
          <div className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal itens" value={formatBRL(totals.subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Desconto geral</span>
              <input type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(parseFloat(e.target.value || 0))} className="w-28 rounded-md bg-slate-800 px-2 py-1 text-right text-sm text-white outline-none" data-testid="pedido-desconto" />
            </div>
            <div className="border-t border-slate-700 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-brand text-base font-bold">Total do pedido</span>
                <span className="font-brand text-xl font-bold text-amber-400 font-mono-num" data-testid="pedido-total">{formatBRL(totals.total)}</span>
              </div>
            </div>
            <Row label="Custo estimado" value={formatBRL(totals.custo)} tone="slate" />
            <Row label="Lucro projetado" value={formatBRL(totals.lucro)} tone="emerald" />
            <Row label="Margem" value={formatPct(totals.margem)} tone="emerald" />
          </div>
          <button type="submit" disabled={saving} className="mt-5 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 disabled:opacity-60" data-testid="pedido-submit-btn">
            {saving ? "Salvando…" : "Registrar pedido"}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";

function Row({ label, value, tone }) {
  const toneCls = tone === "emerald" ? "text-emerald-400" : tone === "slate" ? "text-slate-400" : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono-num font-semibold ${toneCls}`}>{value}</span>
    </div>
  );
}
