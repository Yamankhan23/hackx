import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await api.post("/api/admin/login", { email, password });
      localStorage.setItem("admin_token", data.data.token);
      localStorage.setItem("admin_name", data.data.admin.name);
      localStorage.setItem("admin_email", data.data.admin.email);
      navigate("/admin/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-purple-500/25 bg-slate-950/85 p-5 shadow-[0_20px_80px_rgba(8,15,35,0.75)] backdrop-blur sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
            Admin access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use your admin credentials to manage registrations, teams, and content.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-300">Email</span>
              <input
                className="h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                placeholder="admin@musaforstudents.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-300">Password</span>
              <div className="flex gap-2">
                <input
                  className="h-12 flex-1 rounded-xl border border-slate-800 bg-slate-900/90 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-4 text-sm text-slate-200 transition hover:border-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(91,33,182,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
