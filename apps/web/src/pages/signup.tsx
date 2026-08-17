/** Página de cadastro de tenant — auto-serviço, antes só acessível via cURL em /auth/register-tenant. */
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "ui/alert";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";

import { createApiClient } from "../services/api-client";

type RegisterTenantErrorPayload = Readonly<{
  error: string;
  code?: string;
}>;

const ERROR_MESSAGES_BY_CODE: Readonly<Record<string, string>> = {
  TENANT_SLUG_ALREADY_EXISTS: "Já existe um tenant com este identificador. Escolha outro.",
  USER_EMAIL_ALREADY_EXISTS: "Já existe uma conta com este e-mail.",
  TENANT_CONTEXT_CONFLICT: "Este ambiente já possui um tenant cadastrado.",
  REQUEST_VALIDATION_ERROR: "Verifique os dados informados e tente novamente.",
};

function resolveErrorMessage(payload: RegisterTenantErrorPayload): string {
  const knownMessage = payload.code ? ERROR_MESSAGES_BY_CODE[payload.code] : undefined;
  return knownMessage ?? "Não foi possível concluir o cadastro. Tente novamente.";
}

export function SignupPage() {
  const navigate = useNavigate();
  const api = createApiClient({ baseUrl: "/api", getToken: () => null });

  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await api.post<RegisterTenantErrorPayload>("/auth/register-tenant", {
      tenantName,
      tenantSlug,
      adminDisplayName,
      adminEmail,
      adminPassword,
    });

    if (res.ok) {
      navigate("/login", { replace: true });
    } else {
      setError(resolveErrorMessage(res.data));
    }
    setLoading(false);
  };

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Criar sua conta</CardTitle>
          <CardDescription>Cadastre sua empresa e comece a atender pelo WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome da empresa</Label>
              <Input
                id="tenantName"
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required={true}
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Identificador (slug)</Label>
              <Input
                id="tenantSlug"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                required={true}
                placeholder="minha-empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminDisplayName">Seu nome</Label>
              <Input
                id="adminDisplayName"
                type="text"
                value={adminDisplayName}
                onChange={(e) => setAdminDisplayName(e.target.value)}
                required={true}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">E-mail</Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required={true}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Senha</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required={true}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta…" : "Criar conta"}
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              Já tem conta?{" "}
              <Link to="/login" className="text-foreground underline underline-offset-4">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
