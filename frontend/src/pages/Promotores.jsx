import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Loader2, X, Pencil, Trash2, ClipboardCheck, Building2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDate, formatNumber } from "@/lib/format";

const TABS = [
  { key: "promotores", label: "Promotores", icon: ClipboardCheck },
  { key: "agencias", label: "Agências", icon: Building2 },
  { key: "visitas", label: "Agenda de Visitas", icon: Calendar },
  { key: "ocorrencias", label: "Não conformidades", icon: AlertTriangle },
];

export default function Promotores() {
  const [tab, setTab] = useState("promotores");
  return (
    <div className="space-y-5" data-testid="promotores-page">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Trade Marketing</div>
        <h1 className="font-brand text-3xl font-bold tracking-tight text-slate-900">Promotores &amp; Execução</h1>
        <p className="mt-1 text-sm text-slate-500">Cadastre promotores por agência, gere agenda 2×/semana por loja e registre execução com fotos e não conformidades.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${active ? "bg-amber-600 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`} data-testid={`promotores-tab-${t.key}`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "promotores" && <PromotoresTab />}
      {tab === "agencias" && <AgenciasTab />}
      {tab === "visitas" && <VisitasTab />}
      {tab === "ocorrencias" && <OcorrenciasTab />}
    </div>
  );
}

// ============================================================================
// AGÊNCIAS
// ============================================================================
function AgenciasTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/agencias"); setItems(data); }
    catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const remove = async (a) => {
    if (!window.confirm(`Excluir agência ${a.nome}?`)) return;
    try { await api.delete(`/agencias/${a.id}`); toast.success("Removida"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <CrudShell title="Agências" onAdd={() => setModal({})} loading={loading} items={items} empty="Nenhuma agência cadastrada." icon={Building2} testidRoot="agencias">
      <table className="w-full text-sm" data-testid="agencias-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Nome</th><th className="px-4 py-3 text-left">Contato</th><th className="px-4 py-3 text-left">Telefone</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 hover:bg-amber-50/30">
              <td className="px-4 py-3 font-semibold text-slate-900">{a.nome}</td>
              <td className="px-4 py-3 text-slate-700">{a.contato || "—"}</td>
              <td className="px-4 py-3 text-slate-700">{a.telefone || "—"}</td>
              <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => setModal(a)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(a)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <AgenciaModal current={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </CrudShell>
  );
}

function AgenciaModal({ current, onClose, onSaved }) {
  const [form, setForm] = useState({ nome: "", contato: "", telefone: "", status: "ativa", ...current });
  const [saving, setSaving] = useState(false);
  const isEdit = !!current?.id;
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { if (isEdit) await api.put(`/agencias/${current.id}`, form); else await api.post("/agencias", form); toast.success("Salvo"); onSaved(); } catch (err) { toast.error(formatApiError(err)); } finally { setSaving(false); } };
  return (
    <ModalShell title={isEdit ? "Editar agência" : "Nova agência"} onClose={onClose} onSubmit={submit} saving={saving} testid="agencia-modal">
      <Field label="Nome *"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} data-testid="agencia-nome-input" /></Field>
      <FieldRow>
        <Field label="Contato"><input value={form.contato || ""} onChange={(e) => setForm({ ...form, contato: e.target.value })} className={inputCls} /></Field>
        <Field label="Telefone"><input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
    </ModalShell>
  );
}

// ============================================================================
// PROMOTORES
// ============================================================================
function PromotoresTab() {
  const [items, setItems] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, c] = await Promise.all([api.get("/promotores"), api.get("/agencias"), api.get("/clientes")]);
      setItems(p.data); setAgencias(a.data); setClientes(c.data);
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const remove = async (p) => {
    if (!window.confirm(`Excluir promotor ${p.nome}?`)) return;
    try { await api.delete(`/promotores/${p.id}`); toast.success("Removido"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <CrudShell title="Promotores" onAdd={() => setModal({})} loading={loading} items={items} empty="Nenhum promotor cadastrado." icon={ClipboardCheck} testidRoot="promotores-crud">
      <table className="w-full text-sm" data-testid="promotores-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Promotor</th><th className="px-4 py-3 text-left">Agência</th><th className="px-4 py-3 text-left">Região</th><th className="px-4 py-3 text-center">Lojas atendidas</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`promotor-row-${p.id}`}>
              <td className="px-4 py-3"><div className="font-semibold text-slate-900">{p.nome}</div><div className="text-xs text-slate-500">{p.telefone || ""}</div></td>
              <td className="px-4 py-3 text-slate-700">{p.agencia_nome || "—"}</td>
              <td className="px-4 py-3 text-slate-700">{p.regiao || "—"}{p.cidade ? ` · ${p.cidade}` : ""}</td>
              <td className="px-4 py-3 text-center font-mono-num font-semibold text-slate-800">{p.lojas_ids?.length || 0}</td>
              <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${p.status === "ativo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{p.status}</span></td>
              <td className="px-4 py-3 text-right"><div className="inline-flex gap-1"><button onClick={() => setModal(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(p)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <PromotorModal current={modal} agencias={agencias} clientes={clientes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </CrudShell>
  );
}

function PromotorModal({ current, agencias, clientes, onClose, onSaved }) {
  const [form, setForm] = useState({ nome: "", agencia_id: "", telefone: "", regiao: "", cidade: "", estado: "", lojas_ids: [], status: "ativo", ...current, lojas_ids: current?.lojas_ids || [] });
  const [saving, setSaving] = useState(false);
  const isEdit = !!current?.id;
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { if (isEdit) await api.put(`/promotores/${current.id}`, form); else await api.post("/promotores", form); toast.success("Salvo"); onSaved(); } catch (err) { toast.error(formatApiError(err)); } finally { setSaving(false); } };
  const toggle = (id) => setForm((f) => ({ ...f, lojas_ids: f.lojas_ids.includes(id) ? f.lojas_ids.filter((x) => x !== id) : [...f.lojas_ids, id] }));

  return (
    <ModalShell title={isEdit ? "Editar promotor" : "Novo promotor"} onClose={onClose} onSubmit={submit} saving={saving} large testid="promotor-modal">
      <FieldRow>
        <Field label="Nome *"><input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} data-testid="promotor-nome-input" /></Field>
        <Field label="Telefone"><input value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Agência">
          <select value={form.agencia_id || ""} onChange={(e) => setForm({ ...form, agencia_id: e.target.value })} className={inputCls} data-testid="promotor-agencia-select">
            <option value="">Independente</option>
            {agencias.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </Field>
        <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Região"><input value={form.regiao || ""} onChange={(e) => setForm({ ...form, regiao: e.target.value })} className={inputCls} /></Field>
        <Field label="Cidade"><input value={form.cidade || ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={inputCls} /></Field>
      </FieldRow>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-700">Lojas atendidas ({form.lojas_ids.length})</div>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {clientes.length === 0 && <div className="text-xs text-slate-500">Cadastre clientes primeiro.</div>}
          {clientes.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs hover:bg-amber-50" data-testid={`promotor-loja-toggle-${c.id}`}>
              <input type="checkbox" checked={form.lojas_ids.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="font-semibold">{c.nome_loja}</span>
              <span className="text-slate-500">{c.nome_rede}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">Regra: <strong>2 visitas/semana por loja</strong> serão geradas ao clicar em “Gerar agenda semanal”.</div>
      </div>
    </ModalShell>
  );
}

// ============================================================================
// VISITAS
// ============================================================================
function VisitasTab() {
  const [visitas, setVisitas] = useState([]);
  const [promotores, setPromotores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [execModal, setExecModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, p, c] = await Promise.all([api.get("/visitas"), api.get("/promotores"), api.get("/clientes")]);
      setVisitas(v.data); setPromotores(p.data); setClientes(c.data);
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const gerar = async () => {
    const semanas = parseInt(window.prompt("Quantas semanas gerar? (padrão: 4)", "4") || "4", 10);
    try {
      const { data } = await api.post("/visitas/gerar-agenda-semanal", { semanas });
      toast.success(`${data.criadas} visitas geradas`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const changeStatus = async (v, s) => {
    try { await api.patch(`/visitas/${v.id}/status`, { status: s }); toast.success("Status atualizado"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const remove = async (v) => {
    if (!window.confirm("Excluir visita?")) return;
    try { await api.delete(`/visitas/${v.id}`); toast.success("Removida"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const total = visitas.length;
  const realizadas = visitas.filter((v) => v.status === "realizada").length;
  const pct = total ? Math.round((realizadas / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="visitas-kpi">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Execução da agenda</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-brand text-2xl font-bold text-slate-900 font-mono-num">{pct}%</span>
            <span className="text-xs text-slate-500">{realizadas} de {total} visitas realizadas</span>
          </div>
        </div>
        <button onClick={gerar} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" data-testid="visitas-gerar-btn">
          <Calendar className="h-4 w-4" /> Gerar agenda semanal (2×/loja)
        </button>
        <button onClick={() => setModal({})} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700" data-testid="visitas-add-btn">
          <Plus className="h-4 w-4" /> Nova visita avulsa
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
          : visitas.length === 0 ? <EmptyState icon={Calendar} text="Nenhuma visita agendada. Cadastre promotores com lojas e gere a agenda semanal." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="visitas-table">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3 text-left">Data / hora</th><th className="px-4 py-3 text-left">Promotor</th><th className="px-4 py-3 text-left">Loja</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
                </thead>
                <tbody>
                  {visitas.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`visita-row-${v.id}`}>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-900">{formatDate(v.data)}</div><div className="text-xs text-slate-500">{v.horario || ""}</div></td>
                      <td className="px-4 py-3 text-slate-700">{v.promotor_nome}<div className="text-xs text-slate-500">{v.agencia_nome || ""}</div></td>
                      <td className="px-4 py-3 text-slate-900"><div className="font-semibold">{v.cliente_loja}</div><div className="text-xs text-slate-500">{v.cliente_rede}</div></td>
                      <td className="px-4 py-3 text-center">
                        <select value={v.status} onChange={(e) => changeStatus(v, e.target.value)} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold" data-testid={`visita-status-${v.id}`}>
                          {["agendada", "realizada", "nao_realizada", "promotor_ausente", "reagendada", "cancelada"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setExecModal(v)} className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" title="Registrar execução"><CheckCircle2 className="h-4 w-4" /></button>
                          <button onClick={() => remove(v)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {modal && <VisitaModal promotores={promotores} clientes={clientes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {execModal && <ExecucaoModal visita={execModal} onClose={() => setExecModal(null)} onSaved={() => { setExecModal(null); load(); }} />}
    </div>
  );
}

function VisitaModal({ promotores, clientes, onClose, onSaved }) {
  const [form, setForm] = useState({ promotor_id: promotores[0]?.id || "", cliente_id: clientes[0]?.id || "", data: new Date().toISOString().slice(0, 10), horario: "09:00", observacoes: "", status: "agendada" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post("/visitas", { ...form, data: new Date(form.data).toISOString() }); toast.success("Visita criada"); onSaved(); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell title="Nova visita" onClose={onClose} onSubmit={submit} saving={saving} testid="visita-modal">
      <Field label="Promotor *">
        <select required value={form.promotor_id} onChange={(e) => setForm({ ...form, promotor_id: e.target.value })} className={inputCls} data-testid="visita-promotor-select">
          {promotores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </Field>
      <Field label="Loja *">
        <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className={inputCls} data-testid="visita-loja-select">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_loja} — {c.nome_rede}</option>)}
        </select>
      </Field>
      <FieldRow>
        <Field label="Data *"><input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={inputCls} data-testid="visita-data-input" /></Field>
        <Field label="Horário"><input type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} className={inputCls} /></Field>
      </FieldRow>
      <Field label="Observações"><textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={inputCls} /></Field>
    </ModalShell>
  );
}

function ExecucaoModal({ visita, onClose, onSaved }) {
  const [exec, setExec] = useState({
    apresentacao: false, pesagem: false, etiquetagem: false, abastecimento: false, validade_ok: false, organizacao: false, submarcas: false,
    produtos_encontrados: 0, qtd_pesada: 0, qtd_nao_conforme: 0, produtos_faltantes: 0, produtos_vencidos: 0, produtos_proximos_venc: 0,
    fotos: [], observacoes: "", assinatura_encarregado: "",
    ...(visita.execucao || {}),
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/visitas/${visita.id}/executar`, { execucao: exec }); toast.success("Execução registrada"); onSaved(); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };
  const checklist = [
    ["apresentacao", "Apresentação ao encarregado"],
    ["pesagem", "Pesagem realizada"],
    ["etiquetagem", "Etiquetagem correta"],
    ["abastecimento", "Abastecimento de gôndola"],
    ["validade_ok", "Validade OK"],
    ["organizacao", "Organização dos produtos"],
    ["submarcas", "Submarcas visíveis"],
  ];
  return (
    <ModalShell title={`Execução — ${visita.cliente_loja}`} onClose={onClose} onSubmit={submit} saving={saving} large testid="execucao-modal">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {checklist.map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm hover:bg-amber-50" data-testid={`exec-${k}`}>
            <input type="checkbox" checked={!!exec[k]} onChange={(e) => setExec({ ...exec, [k]: e.target.checked })} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <FieldRow>
        <Field label="Produtos encontrados"><input type="number" value={exec.produtos_encontrados} onChange={(e) => setExec({ ...exec, produtos_encontrados: parseInt(e.target.value || 0, 10) })} className={inputCls} /></Field>
        <Field label="Qtd pesada"><input type="number" value={exec.qtd_pesada} onChange={(e) => setExec({ ...exec, qtd_pesada: parseInt(e.target.value || 0, 10) })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Qtd não conforme"><input type="number" value={exec.qtd_nao_conforme} onChange={(e) => setExec({ ...exec, qtd_nao_conforme: parseInt(e.target.value || 0, 10) })} className={inputCls} data-testid="exec-nao-conforme" /></Field>
        <Field label="Produtos faltantes"><input type="number" value={exec.produtos_faltantes} onChange={(e) => setExec({ ...exec, produtos_faltantes: parseInt(e.target.value || 0, 10) })} className={inputCls} /></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Produtos vencidos"><input type="number" value={exec.produtos_vencidos} onChange={(e) => setExec({ ...exec, produtos_vencidos: parseInt(e.target.value || 0, 10) })} className={inputCls} /></Field>
        <Field label="Próximos do vencimento"><input type="number" value={exec.produtos_proximos_venc} onChange={(e) => setExec({ ...exec, produtos_proximos_venc: parseInt(e.target.value || 0, 10) })} className={inputCls} /></Field>
      </FieldRow>
      <Field label="Assinatura do encarregado"><input value={exec.assinatura_encarregado} onChange={(e) => setExec({ ...exec, assinatura_encarregado: e.target.value })} placeholder="Nome" className={inputCls} /></Field>
      <Field label="Observações da visita"><textarea rows={3} value={exec.observacoes} onChange={(e) => setExec({ ...exec, observacoes: e.target.value })} className={inputCls} /></Field>
    </ModalShell>
  );
}

// ============================================================================
// OCORRÊNCIAS (não conformidades)
// ============================================================================
function OcorrenciasTab() {
  const [items, setItems] = useState([]);
  const [opcoes, setOpcoes] = useState({ tipos: [], status: [] });
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [promotores, setPromotores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, op, c, p, pr] = await Promise.all([api.get("/ocorrencias"), api.get("/ocorrencias/opcoes"), api.get("/clientes"), api.get("/produtos"), api.get("/promotores")]);
      setItems(o.data); setOpcoes(op.data); setClientes(c.data); setProdutos(p.data); setPromotores(pr.data);
    } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const changeStatus = async (o, s) => {
    try { await api.patch(`/ocorrencias/${o.id}/status`, { status: s }); toast.success("Status atualizado"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const remove = async (o) => {
    if (!window.confirm("Excluir ocorrência?")) return;
    try { await api.delete(`/ocorrencias/${o.id}`); toast.success("Removida"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <CrudShell title="Não conformidades" onAdd={() => setModal({})} loading={loading} items={items} empty="Nenhuma não conformidade registrada." icon={AlertTriangle} testidRoot="ocorrencias">
      <table className="w-full text-sm" data-testid="ocorrencias-table">
        <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Loja</th><th className="px-4 py-3 text-left">Produto</th><th className="px-4 py-3 text-left">Tipo</th><th className="px-4 py-3 text-left">Promotor</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-b border-slate-100 hover:bg-amber-50/30" data-testid={`ocorrencia-row-${o.id}`}>
              <td className="px-4 py-3 text-slate-700">{formatDate(o.data)}</td>
              <td className="px-4 py-3"><div className="font-semibold text-slate-900">{o.cliente_loja}</div><div className="text-xs text-slate-500">{o.cliente_rede}</div></td>
              <td className="px-4 py-3 text-slate-700">{o.produto_nome || "—"}</td>
              <td className="px-4 py-3 text-slate-700"><span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">{o.tipo_label}</span><div className="text-xs text-slate-500">{o.descricao || ""}</div></td>
              <td className="px-4 py-3 text-slate-700">{o.promotor_nome || "—"}</td>
              <td className="px-4 py-3 text-center">
                <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold" data-testid={`ocorrencia-status-${o.id}`}>
                  {opcoes.status.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-right"><button onClick={() => remove(o)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && <OcorrenciaModal opcoes={opcoes} clientes={clientes} produtos={produtos} promotores={promotores} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </CrudShell>
  );
}

function OcorrenciaModal({ opcoes, clientes, produtos, promotores, onClose, onSaved }) {
  const [form, setForm] = useState({
    cliente_id: clientes[0]?.id || "", produto_id: "", promotor_id: "",
    tipo: opcoes.tipos[0]?.value || "outros", quantidade: 0, descricao: "", responsavel: "", status: "aberta",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, produto_id: form.produto_id || null, promotor_id: form.promotor_id || null };
      await api.post("/ocorrencias", payload);
      toast.success("Ocorrência registrada"); onSaved();
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setSaving(false); }
  };
  return (
    <ModalShell title="Nova não conformidade" onClose={onClose} onSubmit={submit} saving={saving} testid="ocorrencia-modal">
      <Field label="Loja *"><select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className={inputCls} data-testid="ocorrencia-loja-select">{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_loja}</option>)}</select></Field>
      <FieldRow>
        <Field label="Produto"><select value={form.produto_id} onChange={(e) => setForm({ ...form, produto_id: e.target.value })} className={inputCls}><option value="">—</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
        <Field label="Promotor"><select value={form.promotor_id} onChange={(e) => setForm({ ...form, promotor_id: e.target.value })} className={inputCls}><option value="">—</option>{promotores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Field>
      </FieldRow>
      <FieldRow>
        <Field label="Tipo *"><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls} data-testid="ocorrencia-tipo-select">{opcoes.tipos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Quantidade afetada"><input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: parseFloat(e.target.value || 0) })} className={inputCls} /></Field>
      </FieldRow>
      <Field label="Descrição"><textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={inputCls} /></Field>
      <Field label="Responsável pela resolução"><input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={inputCls} /></Field>
    </ModalShell>
  );
}

// ============================================================================
// SHARED
// ============================================================================
function CrudShell({ title, onAdd, loading, items, empty, icon: Icon, testidRoot, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-brand text-lg font-semibold text-slate-900">{title}</div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700" data-testid={`${testidRoot}-add-btn`}><Plus className="h-4 w-4" /> Novo</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
          : items.length === 0 ? <EmptyState icon={Icon} text={empty} onAdd={onAdd} />
          : <div className="overflow-x-auto">{children}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Icon className="h-7 w-7" /></div>
      <div className="mt-3 font-brand text-base font-semibold text-slate-900">{text}</div>
      {onAdd && <button onClick={onAdd} className="mt-4 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Adicionar</button>}
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
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20";
