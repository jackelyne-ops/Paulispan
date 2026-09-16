import { useState } from "react";
import { Menu, Search, Bell, LogOut, ChevronDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/format";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const roleLabel = ROLES.find((r) => r.value === user?.role)?.label || user?.role;

  const doSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/clientes?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:px-6" data-testid="topbar">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        data-testid="topbar-menu-btn"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={doSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, CNPJ, pedido, produto…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
            data-testid="global-search-input"
          />
        </div>
      </form>

      <button
        onClick={() => navigate("/pedidos/novo")}
        className="hidden items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700 hover:shadow md:flex"
        data-testid="topbar-novo-pedido-btn"
      >
        <Plus className="h-4 w-4" /> Novo Pedido
      </button>

      <button className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100" data-testid="topbar-notif-btn">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
      </button>

      <div className="relative">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left hover:bg-slate-50"
          data-testid="topbar-profile-btn"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || user?.email}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{roleLabel}</div>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" data-testid="topbar-profile-menu">
              <div className="border-b border-slate-100 px-3 py-2">
                <div className="text-xs font-semibold text-slate-900">{user?.name}</div>
                <div className="text-[11px] text-slate-500">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
