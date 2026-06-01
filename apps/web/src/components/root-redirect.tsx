/** Rota raiz: envia para inbox autenticado ou login. */
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/use-auth";

export function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/inbox" : "/login"} replace={true} />;
}
