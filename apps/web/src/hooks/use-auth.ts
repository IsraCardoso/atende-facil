import { useCallback, useState } from "react";

type AuthState = Readonly<{
  token: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
}>;

const TOKEN_KEY = "atende-facil-token";
const TENANT_KEY = "atende-facil-tenant";
const TENANT_SLUG_KEY = "atende-facil-tenant-slug";

function loadInitialState(): AuthState {
  return {
    token: globalThis.localStorage?.getItem(TOKEN_KEY) ?? null,
    tenantId: globalThis.localStorage?.getItem(TENANT_KEY) ?? null,
    tenantSlug: globalThis.localStorage?.getItem(TENANT_SLUG_KEY) ?? null,
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const login = useCallback((token: string, tenantId: string, tenantSlug?: string) => {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    globalThis.localStorage?.setItem(TENANT_KEY, tenantId);
    if (tenantSlug) {
      globalThis.localStorage?.setItem(TENANT_SLUG_KEY, tenantSlug);
    }
    setState({
      token,
      tenantId,
      tenantSlug: tenantSlug ?? globalThis.localStorage?.getItem(TENANT_SLUG_KEY) ?? null,
    });
  }, []);

  const logout = useCallback(() => {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    globalThis.localStorage?.removeItem(TENANT_KEY);
    globalThis.localStorage?.removeItem(TENANT_SLUG_KEY);
    setState({ token: null, tenantId: null, tenantSlug: null });
  }, []);

  return {
    token: state.token,
    tenantId: state.tenantId,
    tenantSlug: state.tenantSlug,
    isAuthenticated: state.token !== null,
    login,
    logout,
  } as const;
}
