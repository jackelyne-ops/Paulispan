import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Cake, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, login, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("admin@paulispan.com.br");
  const [password, setPassword] = useState("admin123");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { ok, error: err } = await login(email, password);
    if (!ok) {
      setError(err || "Erro ao entrar");
      setSubmitting(false);
    }
  };

  return (
    <div className="login-bg flex min-h-screen items-center justify-center p-6" data-testid="login-page">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-900/40 shadow-2xl backdrop-blur-md lg:grid-cols-2">
        {/* Left brand panel */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-[#111A2E] via-[#0B1120] to-[#0A0F1D] p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg">
              <Cake className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-brand text-2xl font-bold tracking-tight text-white">Paulispan</div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/90">ERP · Gestão Total</div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
              Distribuidora Premium · SP
            </div>
            <h1 className="font-brand text-4xl font-bold leading-tight tracking-tight text-white">
              A operação inteira da Paulispan em um lugar só.
            </h1>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              Clientes, pedidos, catálogo, entregas, promotores e resultado — cada informação conectada e
              rastreável. Do pedido ao lucro real, com margem calculada em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-6">
            <div>
              <div className="font-brand text-2xl font-bold text-amber-400">100%</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Rastreável</div>
            </div>
            <div>
              <div className="font-brand text-2xl font-bold text-emerald-400">R$/kg</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Margem real</div>
            </div>
            <div>
              <div className="font-brand text-2xl font-bold text-blue-400">CNPJ</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">Rede &amp; Loja</div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center bg-white p-8 sm:p-12">
          <div className="mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
                <Cake className="h-5 w-5 text-white" />
              </div>
              <div className="font-brand text-xl font-bold text-slate-900">Paulispan ERP</div>
            </div>
            <h2 className="mt-4 font-brand text-2xl font-bold tracking-tight text-slate-900">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais corporativas.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-700">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition-all focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                  data-testid="login-toggle-password"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-700 hover:shadow disabled:opacity-60"
              data-testid="login-submit-btn"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Entrando…" : "Entrar no ERP"}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Admin padrão:</span> admin@paulispan.com.br · admin123
          </div>
        </div>
      </div>
    </div>
  );
}
