import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Truck, User, Route, Loader2, X, Pencil, Trash2, MapPin } from "lucide-react";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";

const TABS = [
  { key: "rotas", label: "Rotas", icon: Route },
  { key: "caminhoes", label: "Caminhões", icon: Truck },
  { key: "motoristas", label: "Motoristas", icon: User },
];

export default function Logistica() {
  const [tab, setTab] = useState("rotas");
  return (
    <div className="space-y-5" data-testid="logistica-page">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Operação</div>
        <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Logística &amp; Frotas</h1>
        <p className="mt-1 text-sm text-slate-500">Cadastre caminhões, motoristas e rotas; distribua pedidos e apure o custo real por região.</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${active ? "bg-amber-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`} data-testid={`logistica-tab-${t.key}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "caminhoes" && <CaminhoesTab />}
      {tab === "motoristas" && <MotoristasTab />}
      {tab === "rotas" && <RotasTab />}
    </div>
  );
}

// ============================================================================
// CAMINHÕES
// ============================================================================
function CaminhoesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/caminhoes"); setItems(data); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (c) => {
    if (!window.confirm(`Excluir caminhão ${c.placa}?`)) return;
    try { await api.delete(`/caminhoes/${c.id}`); toast.success("Removido"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <SimpleCrud title="Caminhões" addLabel="Novo caminhão" onAdd={() => setModal({})} items={items} loading={loading} empty="Nenhum caminhão cadastrado." icon={Truck} testidRoot="caminhoes">
      <table className="w-full text-sm" data-testid="caminhoes-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Placa</th><th className="px-4 py-3 text-left">Modelo</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-right">Capacidade</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`caminhao-row-${c.id}`}>
              <td className="px-4 py-3 font-mono-num font-semibold text-slate-900">{c.placa}</td>
              <td className="px-4 py-3 text-slate-700">{c.modelo || "—"}</td>
              <td className="px-4 py-3 text-slate-700">{c.tipo}</td>
              <td className="px-4 py-3 text-right font-mono-num">{formatNumber(c.capacidade_kg)} kg</td>
              <td className="px-4 py-3 text-center"><StatusPill s={c.status} /></td>
              <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => setModal(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <CaminhaoModal current={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </SimpleCrud>
  );
}

function CaminhaoModal({ current, onClose, onSaved }) {
  const [form, setForm] = useState({ placa: "", modelo: "", capacidade_kg: 0, tipo: "refrigerado", status: "ativo", observacoes: "", ...current });
  const [saving, setSaving] = useState(false);
  const isEdit = !!current?.id;
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) await api.put(`/caminhoes/${current.id}`, form);
      else await api.post("/caminhoes", form);
      toast.success("Salvo"); onSaved();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell title={isEdit ? "Editar caminhão" : "Novo caminhão"} onClose={onClose} onSubmit={submit} saving={saving} testid="caminhao-modal">
      <FieldRow>
        <Field label="Placa *"><input required value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} className={inputCls} data-testid="caminhao-placa-input" /></Field>
        <Field label="Modelo"><input value={form.modelo || ""} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Tipo"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}><option value="refrigerado">Refrigerado</option><option value="seco">Seco</option></select></Field>
        <Field label="Capacidade (kg)"><input type="number" step="0.01" value={form.capacidade_kg} onChange={(e) => setForm({ ...form, capacidade_kg: parseFloat(e.target.value || 0) })} className={inputCls} data-testid="caminhao-capacidade-input" /></Field>
      </FieldRow>
      <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="ativo">Ativo</option><option value="manutencao">Manutenção</option><option value="inativo">Inativo</option></select></Field>
      <Field label="Observações"><textarea rows={2} value={form.observacoes || ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputCls} /></Field>
    </ModalShell>
  );
}

// ============================================================================
// MOTORISTAS
// ============================================================================
function MotoristasTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/motoristas"); setItems(data); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (m) => {
    if (!window.confirm(`Excluir motorista ${m.nome}?`)) return;
    try { await api.delete(`/motoristas/${m.id}`); toast.success("Removido"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <SimpleCrud title="Motoristas" addLabel="Novo motorista" onAdd={() => setModal({})} items={items} loading={loading} empty="Nenhum motorista cadastrado." icon={User} testidRoot="motoristas">
      <table className="w-full text-sm" data-testid="motoristas-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">CNH</th><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`motorista-row-${m.id}`}>
              <td className="px-4 py-3"><div className="font-semibold text-slate-900">{m.nome}</div><div className="text-xs text-slate-500">{m.cpf || ""}</div></td>
              <td className="px-4 py-3 text-slate-700">{m.cnh || "—"}{m.categoria_cnh ? ` · ${m.categoria_cnh}` : ""}<div className="text-xs text-slate-500">Val: {m.validade_cnh || "—"}</div></td>
              <td className="px-4 py-3 text-slate-700">{m.telefone || "—"}</td>
              <td className="px-4 py-3 text-center"><StatusPill s={m.status} /></td>
              <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => setModal(m)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(m)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <MotoristaModal current={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </SimpleCrud>
  );
}

function MotoristaModal({ current, onClose, onSaved }) {
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", cnh: "", categoria_cnh: "", validade_cnh: "", status: "ativo", observacoes: "", ...current });
  const [saving, setSaving] = useState(false);
  const isEdit = !!current?.id;
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (isEdit) await api.put(`/motoristas/${current.id}`, form);
      else await api.post("/motoristas", form);
      toast.success("Salvo"); onSaved();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell title={isEdit ? "Editar motorista" : "Novo motorista"} onClose={onClose} onSubmit={submit} saving={saving} testid="motorista-modal">
      <FieldRow>
        <Field label="Nome *"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} data-testid="motorista-nome-input" /></Field>
        <Field label="CPF"><input value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Telefone"><input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputCls} /></Field>
        <Field label="CNH"><input value={form.cnh || ""} onChange={(e) => setForm({ ...form, cnh: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Categoria CNH"><input value={form.categoria_cnh || ""} onChange={(e) => setForm({ ...form, categoria_cnh: e.target.value })} className={inputCls} /></Field>
        <Field label="Validade CNH"><input type="date" value={form.validade_cnh || ""} onChange={(e) => setForm({ ...form, validade_cnh: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
    </ModalShell>
  );
}

// ============================================================================
// ROTAS
// ============================================================================
function RotasTab() {
  const [rotas, setRotas] = useState([]);
  const [caminhoes, setCaminhoes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c, m, p] = await Promise.all([api.get("/rotas"), api.get("/caminhoes"), api.get("/motoristas"), api.get("/pedidos")]);
      setRotas(r.data); setCaminhoes(c.data); setMotoristas(m.data); setPedidos(p.data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (r) => {
    if (!window.confirm(`Excluir rota ${r.codigo}?`)) return;
    try { await api.delete(`/rotas/${r.id}`); toast.success("Removida"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <SimpleCrud title="Rotas de entrega" addLabel="Nova rota" onAdd={() => setModal({})} items={rotas} loading={loading} empty="Nenhuma rota planejada." icon={Route} testidRoot="rotas">
      <table className="w-full text-sm" data-testid="rotas-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Rota</th><th className="px-4 py-3 text-left">Motorista / Caminhão</th><th className="px-4 py-3 text-center">Pedidos</th><th className="px-4 py-3 text-right">Faturamento</th><th className="px-4 py-3 text-right">Custo total</th><th className="px-4 py-3 text-right">R$/pedido</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {rotas.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`rota-row-${r.id}`}>
              <td className="px-4 py-3">
                <div className="font-mono-num text-xs font-bold text-slate-500">{r.codigo}</div>
                <div className="font-semibold text-slate-900">{r.nome}</div>
                <div className="text-xs text-slate-500"><MapPin className="mr-1 inline h-3 w-3" />{r.regiao || "—"}{r.estado ? `/${r.estado}` : ""} · {formatDate(r.data)}</div>
              </td>
              <td className="px-4 py-3 text-slate-700">{r.motorista_nome || "—"}<div className="text-xs text-slate-500">{r.caminhao_placa || "sem veículo"}</div></td>
              <td className="px-4 py-3 text-center font-mono-num font-semibold text-slate-800">{r.pedidos_qtd}</td>
              <td className="px-4 py-3 text-right font-mono-num font-semibold">{formatBRL(r.faturamento_transportado)}</td>
              <td className="px-4 py-3 text-right font-mono-num text-rose-700">{formatBRL(r.custo_total)}</td>
              <td className="px-4 py-3 text-right font-mono-num text-slate-700">{formatBRL(r.custo_por_pedido)}</td>
              <td className="px-4 py-3 text-center"><StatusPill s={r.status} /></td>
              <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => setModal(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(r)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <RotaModal current={modal} caminhoes={caminhoes} motoristas={motoristas} pedidos={pedidos} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </SimpleCrud>
  );
}

function RotaModal({ current, caminhoes, motoristas, pedidos, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: "", regiao: "", estado: "", cidades: [], data: "",
    motorista_id: "", caminhao_id: "", pedido_ids: [],
    km_estimado: 0, custo_combustivel: 0, custo_pedagio: 0, outros_custos: 0,
    status: "planejada", observacoes: "",
    ...current,
    cidades: current?.cidades || [],
    pedido_ids: current?.pedido_ids || [],
    data: current?.data ? current.data.substring(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!current?.id;

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, data: form.data || null };
      if (isEdit) await api.put(`/rotas/${current.id}`, payload);
      else await api.post("/rotas", payload);
      toast.success("Salvo"); onSaved();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };

  const togglePedido = (pid) => {
    setForm((f) => ({
      ...f,
      pedido_ids: f.pedido_ids.includes(pid) ? f.pedido_ids.filter((x) => x !== pid) : [...f.pedido_ids, pid],
    }));
  };

  const custoTotal = (parseFloat(form.custo_combustivel) || 0) + (parseFloat(form.custo_pedagio) || 0) + (parseFloat(form.outros_custos) || 0);
  const custoPP = form.pedido_ids.length > 0 ? custoTotal / form.pedido_ids.length : 0;

  return (
    <ModalShell title={isEdit ? "Editar rota" : "Nova rota"} onClose={onClose} onSubmit={submit} saving={saving} large testid="rota-modal">
      <FieldRow>
        <Field label="Nome da rota *"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} data-testid="rota-nome-input" /></Field>
        <Field label="Data"><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} data-testid="rota-data-input" /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Região"><input value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} className={inputCls} /></Field>
        <Field label="Estado (UF)"><input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Motorista">
          <select value={form.motorista_id || ""} onChange={(e) => setForm({ ...form, motorista_id: e.target.value })} className={inputCls} data-testid="rota-motorista-select">
            <option value="">—</option>
            {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Field>
        <Field label="Caminhão">
          <select value={form.caminhao_id || ""} onChange={(e) => setForm({ ...form, caminhao_id: e.target.value })} className={inputCls} data-testid="rota-caminhao-select">
            <option value="">—</option>
            {caminhoes.map((c) => <option key={c.id} value={c.id}>{c.placa} · {c.modelo || c.tipo}</option>)}
          </select>
        </Field>
      </FieldRow>

      <Field label="Custos (R$)">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <input type="number" step="0.01" placeholder="Combustível" value={form.custo_combustivel} onChange={(e) => setForm({ ...form, custo_combustivel: parseFloat(e.target.value || 0) })} className={inputCls} data-testid="rota-combustivel" />
          <input type="number" step="0.01" placeholder="Pedágios" value={form.custo_pedagio} onChange={(e) => setForm({ ...form, custo_pedagio: parseFloat(e.target.value || 0) })} className={inputCls} data-testid="rota-pedagio" />
          <input type="number" step="0.01" placeholder="Outros" value={form.outros_custos} onChange={(e) => setForm({ ...form, outros_custos: parseFloat(e.target.value || 0) })} className={inputCls} />
          <input type="number" step="0.01" placeholder="Km estimado" value={form.km_estimado} onChange={(e) => setForm({ ...form, km_estimado: parseFloat(e.target.value || 0) })} className={inputCls} />
        </div>
      </Field>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Pedidos vinculados ({form.pedido_ids.length})</div>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {pedidos.length === 0 && <div className="text-xs text-slate-500">Sem pedidos disponíveis.</div>}
          {pedidos.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center justify-between rounded-md bg-white px-2 py-1.5 text-xs hover:bg-amber-50" data-testid={`rota-pedido-toggle-${p.id}`}>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.pedido_ids.includes(p.id)} onChange={() => togglePedido(p.id)} />
                <span className="font-mono-num font-semibold">{p.numero}</span>
                <span className="text-slate-500">{p.cliente_loja}</span>
              </div>
              <span className="font-mono-num">{formatBRL(p.total)}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs">
          <span className="text-slate-500">Custo total × Custo por pedido</span>
          <span className="font-mono-num font-semibold text-slate-900">{formatBRL(custoTotal)} · <span className="text-amber-700">{formatBRL(custoPP)}/ped.</span></span>
        </div>
      </div>

      <FieldRow>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
            {["planejada", "em_carregamento", "em_rota", "entregue", "parcial", "nao_entregue", "reentrega", "finalizada"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Observações"><input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
    </ModalShell>
  );
}

// ============================================================================
// SHARED
// ============================================================================
function SimpleCrud({ title, addLabel, onAdd, items, loading, empty, icon: Icon, testidRoot, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-brand text-lg font-semibold text-slate-900">{title}</div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700" data-testid={`${testidRoot}-add-btn`}>
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Icon className="h-7 w-7" /></div>
            <div className="mt-3 font-brand text-base font-semibold text-slate-900">{empty}</div>
            <button onClick={onAdd} className="mt-4 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">{addLabel}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">{children}</div>
        )}
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, onSubmit, saving, large, testid, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <form onSubmit={onSubmit} className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${large ? "max-w-3xl" : "max-w-xl"}`} data-testid={testid}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="font-brand text-xl font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60" data-testid="modal-save-btn">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldRow({ children }) { return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">{label}</span>{children}</label>; }
function StatusPill({ s }) {
  const cls = s === "ativo" || s === "planejada" || s === "entregue" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{s}</span>;
}
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";
