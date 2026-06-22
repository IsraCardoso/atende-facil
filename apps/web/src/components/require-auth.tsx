/** Redireciona visitantes não autenticados para a tela de login. */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/use-auth";

type RequireAuthProps = Readonly<{
  children: ReactNode;
}>;

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace={true} state={{ from: location.pathname }} />;
  }

  return children;
}
