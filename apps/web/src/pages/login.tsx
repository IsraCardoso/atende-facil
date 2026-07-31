/** Página de login — layout auth inspirado em backoffice-app. */
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "ui/alert";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";

import { useAuth } from "../hooks/use-auth";
import { createApiClient } from "../services/api-client";

type LoginResponse = Readonly<{
  accessToken: string;
  claims: Readonly<{ tenantId: string }>;
}>;

type TenantCandidate = Readonly<{ slug: string; name: string }>;

type LoginErrorResponse = Readonly<{
  error: string;
  code?: string;
  details?: Readonly<{ tenants?: readonly TenantCandidate[] }>;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tenantCandidates, setTenantCandidates] = useState<readonly TenantCandidate[] | null>(null);

  const api = createApiClient({ baseUrl: "/api", getToken: () => null });

  const attemptLogin = async (tenantSlug?: string) => {
    setError(null);
    setLoading(true);

    const res = await api.post<LoginResponse | LoginErrorResponse>("/auth/login", {
      email,
      password,
      tenantSlug,
    });

    if (res.ok) {
      const data = res.data as LoginResponse;
      login(data.accessToken, data.claims.tenantId, tenantSlug);
      navigate("/inbox");
      setLoading(false);
      return;
    }

    const errorData = res.data as LoginErrorResponse;

    if (errorData.code === "AUTH_TENANT_AMBIGUOUS" && errorData.details?.tenants) {
      setTenantCandidates(errorData.details.tenants);
    } else {
      setError("Credenciais inválidas. Tente novamente.");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTenantCandidates(null);
    await attemptLogin();
  };

  const handleSelectTenant = async (slug: string) => {
    await attemptLogin(slug);
  };

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Atende Fácil</CardTitle>
          <CardDescription>
            {tenantCandidates
              ? "Sua conta pertence a mais de uma empresa. Escolha qual acessar."
              : "Entre com suas credenciais para acessar o painel"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantCandidates ? (
            <div className="space-y-2">
              {tenantCandidates.map((tenant) => (
                <Button
                  key={tenant.slug}
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                  onClick={() => handleSelectTenant(tenant.slug)}
                >
                  {tenant.name}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setTenantCandidates(null)}
              >
                Voltar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={true}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={true}
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </Button>

              <p className="text-muted-foreground text-center text-sm">
                Não tem conta?{" "}
                <Link to="/signup" className="text-foreground underline underline-offset-4">
                  Cadastre-se
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
