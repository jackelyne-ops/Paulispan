import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, Store, MapPin, Eye, Loader2, X } from "lucide-react";
import { formatBRL } from "@/lib/format";

const EMPTY = {
  nome_rede: "",
  nome_loja: "",
  cnpj: "",
  regiao: "",
  cidade: "",
  estado: "",
  endereco: "",
  cep: "",
  telefone: "",
  email: "",
  contato: "",
  gerente: "",
  horario_recebimento: "",
  valor_minimo_pedido: 0,
  status: "ativo",
  observacoes: "",
};

export default function Clientes() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/clientes", { params: q ? { q } : {} });
      setClientes(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...EMPTY, ...c });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/clientes/${editing.id}`, form);
        toast.success("Cliente atualizado");
      } else {
        await api.post("/clientes", form);
        toast.success("Cliente cadastrado");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Excluir ${c.nome_loja}?`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      toast.success("Cliente removido");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const doSearch = (e) => {
    e.preventDefault();
    setParams(q ? { q } : {});
    load();
  };

  return (
    <div className="space-y-5" data-testid="clientes-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Comercial</div>
          <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Clientes &amp; Lojas</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastro completo de redes e unidades atendidas pela distribuidora.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700" data-testid="clientes-add-btn">
          <Plus className="h-4 w-4" /> Novo cliente / loja
        </button>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por rede, loja, CNPJ ou código" className="h-10 w-full rounded-lg border border-transparent bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20" data-testid="clientes-search-input" />
        </div>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800" data-testid="clientes-search-btn">Filtrar</button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Store className="h-8 w-8" /></div>
            <div className="mt-4 font-brand text-lg font-semibold text-slate-900">Nenhum cliente cadastrado</div>
            <div className="mt-1 max-w-md text-sm text-slate-500">Comece adicionando as redes e lojas atendidas para gerar pedidos e visualizar histórico completo.</div>
            <button onClick={openNew} className="mt-5 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-700">Cadastrar primeiro cliente</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="clientes-table">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Rede / Loja</th>
                  <th className="px-4 py-3 text-left">Cidade / UF</th>
                  <th className="px-4 py-3 text-left">Contato</th>
                  <th className="px-4 py-3 text-right">Mín. pedido</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`cliente-row-${c.id}`}>
                    <td className="px-4 py-3 font-mono-num text-xs font-semibold text-slate-500">{c.codigo}</td>
                    <td className="px-4 py-3">
                      <Link to={`/clientes/${c.id}`} className="block font-semibold text-slate-900 hover:text-amber-700" data-testid={`cliente-link-${c.id}`}>{c.nome_loja}</Link>
                      <div className="text-xs text-slate-500">{c.nome_rede}{c.cnpj ? ` · ${c.cnpj}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700"><div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{c.cidade || "—"}{c.estado ? `/${c.estado}` : ""}</div></td>
                    <td className="px-4 py-3 text-slate-700">{c.contato || c.gerente || "—"}<div className="text-xs text-slate-500">{c.telefone || c.email || ""}</div></td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-800">{formatBRL(c.valor_minimo_pedido)}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c.status === "ativo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{c.status === "ativo" ? "Ativo" : "Inativo"}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Link to={`/clientes/${c.id}`} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" data-testid={`cliente-view-${c.id}`}><Eye className="h-4 w-4" /></Link>
                        <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700" data-testid={`cliente-edit-${c.id}`}><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => remove(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700" data-testid={`cliente-delete-${c.id}`}><Trash2 className="h-4 w-4" /></button>
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
        <ClienteModal form={form} setForm={setForm} onSave={save} onClose={() => setModalOpen(false)} saving={saving} editing={!!editing} />
      )}
    </div>
  );
}

function ClienteModal({ form, setForm, onSave, onClose, saving, editing }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setNum = (k) => (e) => setForm({ ...form, [k]: parseFloat(e.target.value || 0) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" data-testid="cliente-modal">
      <form onSubmit={onSave} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">{editing ? "Editar" : "Novo"}</div>
            <h3 className="font-brand text-xl font-bold text-slate-900">Cliente / Loja</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" data-testid="cliente-modal-close"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Field label="Nome da rede / empresa *" required>
            <input required value={form.nome_rede} onChange={set("nome_rede")} className={inputCls} data-testid="cliente-nome-rede-input" />
          </Field>
          <Field label="Nome da loja / unidade *" required>
            <input required value={form.nome_loja} onChange={set("nome_loja")} className={inputCls} data-testid="cliente-nome-loja-input" />
          </Field>
          <Field label="CNPJ"><input value={form.cnpj} onChange={set("cnpj")} className={inputCls} data-testid="cliente-cnpj-input" /></Field>
          <Field label="Código interno"><input value={form.codigo || ""} onChange={set("codigo")} placeholder="Auto" className={inputCls} /></Field>
          <Field label="Região"><input value={form.regiao} onChange={set("regiao")} className={inputCls} /></Field>
          <Field label="Cidade"><input value={form.cidade} onChange={set("cidade")} className={inputCls} data-testid="cliente-cidade-input" /></Field>
          <Field label="Estado (UF)"><input value={form.estado} onChange={set("estado")} maxLength={2} className={inputCls} data-testid="cliente-estado-input" /></Field>
          <Field label="CEP"><input value={form.cep} onChange={set("cep")} className={inputCls} /></Field>
          <Field label="Endereço"><input value={form.endereco} onChange={set("endereco")} className={inputCls} /></Field>
          <Field label="Telefone"><input value={form.telefone} onChange={set("telefone")} className={inputCls} /></Field>
          <Field label="E-mail"><input type="email" value={form.email} onChange={set("email")} className={inputCls} /></Field>
          <Field label="Contato responsável"><input value={form.contato} onChange={set("contato")} className={inputCls} /></Field>
          <Field label="Gerente"><input value={form.gerente} onChange={set("gerente")} className={inputCls} /></Field>
          <Field label="Horário de recebimento"><input value={form.horario_recebimento} onChange={set("horario_recebimento")} placeholder="Ex: 08h às 14h" className={inputCls} /></Field>
          <Field label="Valor mínimo do pedido (R$)"><input type="number" step="0.01" value={form.valor_minimo_pedido} onChange={setNum("valor_minimo_pedido")} className={inputCls} data-testid="cliente-valor-minimo-input" /></Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")} className={inputCls} data-testid="cliente-status-select">
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observações"><textarea rows={3} value={form.observacoes} onChange={set("observacoes")} className={inputCls} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60" data-testid="cliente-save-btn">
            {saving ? "Salvando…" : editing ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">{label}{required && <span className="text-amber-600"> *</span>}</span>
      {children}
    </label>
  );
}
