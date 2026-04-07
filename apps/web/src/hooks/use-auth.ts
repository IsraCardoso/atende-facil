import { useCallback, useState } from "react";

type AuthState = Readonly<{
  token: string | null;
  tenantId: string | null;
}>;

const TOKEN_KEY = "atende-facil-token";
const TENANT_KEY = "atende-facil-tenant";

function loadInitialState(): AuthState {
  return {
    token: globalThis.localStorage?.getItem(TOKEN_KEY) ?? null,
    tenantId: globalThis.localStorage?.getItem(TENANT_KEY) ?? null,
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loadInitialState);

  const login = useCallback((token: string, tenantId: string) => {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    globalThis.localStorage?.setItem(TENANT_KEY, tenantId);
    setState({ token, tenantId });
  }, []);

  const logout = useCallback(() => {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    globalThis.localStorage?.removeItem(TENANT_KEY);
    setState({ token: null, tenantId: null });
  }, []);

  return {
    token: state.token,
    tenantId: state.tenantId,
    isAuthenticated: state.token !== null,
    login,
    logout,
  } as const;
}
