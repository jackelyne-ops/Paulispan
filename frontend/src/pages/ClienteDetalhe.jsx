import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { formatBRL, formatDate, formatPct, STATUS_LABELS } from "@/lib/format";
import { ArrowLeft, Loader2, Store, MapPin, Phone, Mail, User, Clock, Package, TrendingUp, AlertTriangle, ShoppingCart } from "lucide-react";

export default function ClienteDetalhe() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/clientes/${id}/resumo`);
        setData(data);
      } catch (e) {
        setErr(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (err) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{err}</div>;
  const { cliente, kpis, pedidos } = data;

  return (
    <div className="space-y-6" data-testid="cliente-detalhe-page">
      <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900" data-testid="back-to-clientes">
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md">
              <Store className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">{cliente.codigo}</div>
              <h1 className="font-brand text-2xl font-bold tracking-tight text-slate-900">{cliente.nome_loja}</h1>
              <div className="text-sm text-slate-500">{cliente.nome_rede}{cliente.cnpj ? ` · ${cliente.cnpj}` : ""}</div>
            </div>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cliente.status === "ativo" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{cliente.status === "ativo" ? "Ativo" : "Inativo"}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-sm md:grid-cols-4">
          <InfoLine icon={MapPin} label="Cidade / UF" value={`${cliente.cidade || "—"}${cliente.estado ? `/${cliente.estado}` : ""}`} />
          <InfoLine icon={MapPin} label="Região" value={cliente.regiao || "—"} />
          <InfoLine icon={User} label="Contato" value={cliente.contato || cliente.gerente || "—"} />
          <InfoLine icon={Phone} label="Telefone" value={cliente.telefone || "—"} />
          <InfoLine icon={Mail} label="E-mail" value={cliente.email || "—"} />
          <InfoLine icon={Clock} label="Recebimento" value={cliente.horario_recebimento || "—"} />
          <InfoLine icon={Package} label="Mín. pedido" value={formatBRL(cliente.valor_minimo_pedido)} />
          <InfoLine icon={MapPin} label="Endereço" value={cliente.endereco || "—"} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard testid="crm-kpi-faturamento" label="Faturamento acumulado" value={formatBRL(kpis.faturamento_total)} icon={TrendingUp} tint="amber" />
        <KPICard testid="crm-kpi-lucro" label="Lucro gerado" value={formatBRL(kpis.lucro)} sub={`Margem ${formatPct(kpis.margem_pct)}`} icon={TrendingUp} tint="emerald" />
        <KPICard testid="crm-kpi-pedidos" label="Pedidos" value={kpis.qtd_pedidos} sub={`Entregues: ${kpis.qtd_entregas}`} icon={ShoppingCart} tint="blue" />
        <KPICard testid="crm-kpi-devolucoes" label="Devoluções" value={kpis.qtd_devolucoes} sub={`Valor ${formatBRL(kpis.valor_devolvido)}`} icon={AlertTriangle} tint="rose" />
      </div>

      {/* Pedidos */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Histórico</div>
            <div className="mt-0.5 font-brand text-lg font-semibold text-slate-900">Pedidos deste cliente</div>
          </div>
          <div className="text-sm text-slate-500">Ticket médio <span className="ml-1 font-semibold text-slate-900">{formatBRL(kpis.ticket_medio)}</span></div>
        </div>
        {pedidos.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum pedido cadastrado para este cliente.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const st = STATUS_LABELS[p.status] || { label: p.status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-amber-50/30">
                      <td className="px-4 py-3"><Link to={`/pedidos/${p.id}`} className="font-mono-num text-sm font-semibold text-slate-900 hover:text-amber-700">{p.numero}</Link></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(p.data_pedido)}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span></td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">{formatBRL(p.total)}</td>
                      <td className="px-4 py-3 text-right font-mono-num text-emerald-700">{formatBRL(p.lucro)}</td>
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

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500"><Icon className="h-3 w-3" />{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function KPICard({ testid, label, value, sub, icon: Icon, tint }) {
  const tints = {
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
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
