import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Cake,
  Truck,
  ClipboardCheck,
  RotateCcw,
  CircleDollarSign,
  Sparkles,
  Cake as CakeIcon,
  X,
} from "lucide-react";

const groups = [
  {
    label: "Principal",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
      { to: "/analisar", label: "Analisar", icon: Sparkles, testid: "nav-analisar", accent: true },
    ],
  },
  {
    label: "Comercial & Vendas",
    items: [
      { to: "/pedidos", label: "Pedidos de Venda", icon: ShoppingCart, testid: "nav-pedidos" },
      { to: "/clientes", label: "Clientes & Lojas", icon: Store, testid: "nav-clientes" },
      { to: "/produtos", label: "Catálogo", icon: Cake, testid: "nav-produtos" },
    ],
  },
  {
    label: "Operação & Campo",
    items: [
      { to: "/logistica", label: "Logística & Frotas", icon: Truck, testid: "nav-logistica" },
      { to: "/promotores", label: "Promotores & Execução", icon: ClipboardCheck, testid: "nav-promotores" },
      { to: "/devolucoes", label: "Devoluções", icon: RotateCcw, testid: "nav-devolucoes" },
    ],
  },
  {
    label: "Gestão & Controle",
    items: [
      { to: "/financeiro", label: "Financeiro & Margem", icon: CircleDollarSign, testid: "nav-financeiro" },
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} data-testid="sidebar-backdrop" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-[#1E293B] bg-[#0B1120] transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md">
              <CakeIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-brand text-lg font-bold tracking-tight text-white">Paulispan</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">ERP · Gestão Total</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" data-testid="sidebar-close-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={onClose}
                      className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                      data-testid={item.testid}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.accent && (
                        <span className="ml-auto rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">Novo</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#1E293B] px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Sistema</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">Paulispan ERP · v1.5</div>
          <div className="mt-1 text-[11px] text-slate-500">Comercial · Logística · Trade</div>
        </div>
      </aside>
    </>
  );
}
