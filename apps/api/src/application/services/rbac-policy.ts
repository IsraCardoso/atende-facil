import type { UserRole } from "../../domain";
import { createAppError } from "../errors/app-error";

type RequireRolesInput = Readonly<{
  currentRole: UserRole;
  allowedRoles: readonly UserRole[];
}>;

export function requireAllowedRole(input: RequireRolesInput): void {
  if (input.allowedRoles.includes(input.currentRole)) {
    return;
  }

  throw createAppError("AUTH_FORBIDDEN", "Acesso negado para o papel atual.");
}
