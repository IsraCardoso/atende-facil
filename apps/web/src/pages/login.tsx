/** Página de login simples para autenticação do atendente. */
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/use-auth";
import { createApiClient } from "../services/api-client";

type LoginResponse = Readonly<{
  accessToken: string;
  claims: Readonly<{ tenantId: string }>;
}>;

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/inbox", { replace: true });
    }
  }, [isAuthenticated, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const api = createApiClient({ baseUrl: "/api", getToken: () => null });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
      tenantSlug: tenantSlug || undefined,
    });

    if (res.ok) {
      login(res.data.accessToken, res.data.claims.tenantId, tenantSlug.trim() || undefined);
      navigate("/inbox");
    } else {
      setError("Credenciais inválidas. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h1 className="mb-6 text-center text-lg font-semibold text-gray-900 dark:text-gray-100">
          Atende Fácil
        </h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            E-mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={true}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Senha
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={true}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tenant
          </span>
          <input
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="slug do tenant"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
