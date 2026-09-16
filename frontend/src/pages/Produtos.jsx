import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Cake, Loader2, X } from "lucide-react";
import { formatBRL, formatPct, formatNumber, CATEGORIAS } from "@/lib/format";

const EMPTY = {
  sku: "",
  nome: "",
  categoria: "bolo",
  marca: "Paulispan",
  unidade: "cx",
  qtd_por_caixa: 1,
  preco_venda: 0,
  custo: 0,
  peso_liquido_g: 0,
  tara_g: 0,
  peso_esperado_balanca_g: 0,
  prazo_validade_dias: 0,
  status: "ativo",
  observacoes: "",
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (categoria) params.categoria = categoria;
      const { data } = await api.get("/produtos", { params });
      setProdutos(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [q, categoria]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...EMPTY, ...p }); setModalOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/produtos/${editing.id}`, form);
        toast.success("Produto atualizado");
      } else {
        await api.post("/produtos", form);
        toast.success("Produto cadastrado");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Excluir ${p.nome}?`)) return;
    try {
      await api.delete(`/produtos/${p.id}`);
      toast.success("Produto removido");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-5" data-testid="produtos-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Catálogo</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Produtos &amp; SKUs</h1>
          <p className="mt-1 text-sm text-slate-500">Sobremesas, bolos, pavês e tortas com custo, margem e controle de pesagem.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700" data-testid="produtos-add-btn">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou SKU" className="h-10 w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20" data-testid="produtos-search-input" />
        </div>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" data-testid="produtos-categoria-filter">
          <option value="">Todas categorias</option>
          {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Cake className="h-8 w-8" /></div>
            <div className="mt-4 font-brand text-lg font-semibold text-slate-900">Catálogo vazio</div>
            <div className="mt-1 max-w-md text-sm text-slate-500">Cadastre suas sobremesas para incluir em pedidos. Custo e margem serão calculados automaticamente.</div>
            <button onClick={openNew} className="mt-5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700">Cadastrar primeiro produto</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="produtos-table">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-right">Preço venda</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Margem</th>
                  <th className="px-4 py-3 text-right">Peso balança</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`produto-row-${p.id}`}>
                    <td className="px-4 py-3 font-mono-num text-xs font-semibold text-slate-500">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.nome}</div>
                      <div className="text-xs text-slate-500">{p.marca} · {p.unidade} · {formatNumber(p.qtd_por_caixa)}/cx</div>
                    </td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{CATEGORIAS.find((c) => c.value === p.categoria)?.label || p.categoria}</span></td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">{formatBRL(p.preco_venda)}</td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-600">{formatBRL(p.custo)}</td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold text-emerald-700">{formatPct(p.margem_pct)}</td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatNumber(p.peso_esperado_balanca_g)}g</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700" data-testid={`produto-edit-${p.id}`}><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700" data-testid={`produto-delete-${p.id}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <ProdutoModal form={form} setForm={setForm} onSave={save} onClose={() => setModalOpen(false)} saving={saving} editing={!!editing} />
      )}
    </div>
  );
}

function ProdutoModal({ form, setForm, onSave, onClose, saving, editing }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setNum = (k) => (e) => setForm({ ...form, [k]: parseFloat(e.target.value || 0) });
  const setInt = (k) => (e) => setForm({ ...form, [k]: parseInt(e.target.value || 0, 10) });
  const pesoAuto = (form.peso_liquido_g || 0) + (form.tara_g || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" data-testid="produto-modal">
      <form onSubmit={onSave} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">{editing ? "Editar" : "Novo"}</div>
            <h3 className="font-brand text-xl font-bold text-slate-900">Produto</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="SKU *"><input required value={form.sku} onChange={set("sku")} className={inputCls} data-testid="produto-sku-input" /></Field>
          <Field label="Nome do produto *"><input required value={form.nome} onChange={set("nome")} className={inputCls} data-testid="produto-nome-input" /></Field>
          <Field label="Categoria">
            <select value={form.categoria} onChange={set("categoria")} className={inputCls} data-testid="produto-categoria-select">
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Marca"><input value={form.marca} onChange={set("marca")} className={inputCls} /></Field>
          <Field label="Unidade (cx, kg, un)"><input value={form.unidade} onChange={set("unidade")} className={inputCls} /></Field>
          <Field label="Qtd por caixa"><input type="number" step="0.01" value={form.qtd_por_caixa} onChange={setNum("qtd_por_caixa")} className={inputCls} /></Field>
          <Field label="Preço de venda (R$) *"><input required type="number" step="0.01" value={form.preco_venda} onChange={setNum("preco_venda")} className={inputCls} data-testid="produto-preco-input" /></Field>
          <Field label="Custo do produto (R$)"><input type="number" step="0.01" value={form.custo} onChange={setNum("custo")} className={inputCls} data-testid="produto-custo-input" /></Field>
          <Field label="Peso líquido (g)"><input type="number" step="0.01" value={form.peso_liquido_g} onChange={setNum("peso_liquido_g")} className={inputCls} /></Field>
          <Field label="Tara embalagem (g)"><input type="number" step="0.01" value={form.tara_g} onChange={setNum("tara_g")} className={inputCls} /></Field>
          <Field label={`Peso esperado balança (g) — auto: ${pesoAuto}g`}>
            <input type="number" step="0.01" value={form.peso_esperado_balanca_g} onChange={setNum("peso_esperado_balanca_g")} placeholder={`${pesoAuto}`} className={inputCls} />
          </Field>
          <Field label="Prazo de validade (dias)"><input type="number" value={form.prazo_validade_dias} onChange={setInt("prazo_validade_dias")} className={inputCls} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")} className={inputCls}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações"><textarea rows={2} value={form.observacoes} onChange={set("observacoes")} className={inputCls} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60" data-testid="produto-save-btn">
            {saving ? "Salvando…" : editing ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">{label}</span>
      {children}
    </label>
  );
}
