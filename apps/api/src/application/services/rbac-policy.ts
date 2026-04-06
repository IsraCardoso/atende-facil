import type { UserRole } from "../../domain";
import { createAppError } from "../errors/app-error";

type RbacPermission = "auth.users.create" | "auth.users.read-current";

type RbacPolicyService = Readonly<{
  isAllowed: (role: UserRole, permission: RbacPermission) => boolean;
  assertAllowed: (role: UserRole, permission: RbacPermission) => void;
}>;

const permissionMatrixByRole: Readonly<Record<UserRole, readonly RbacPermission[]>> = {
  admin: ["auth.users.create", "auth.users.read-current"],
  manager: ["auth.users.read-current"],
  agent: ["auth.users.read-current"],
};

export function createRbacPolicyService(): RbacPolicyService {
  function isAllowed(role: UserRole, permission: RbacPermission): boolean {
    return permissionMatrixByRole[role].includes(permission);
  }

  function assertAllowed(role: UserRole, permission: RbacPermission): void {
    if (isAllowed(role, permission)) {
      return;
    }

    throw createAppError("AUTH_FORBIDDEN", "Acesso negado para o papel atual.");
  }

  return {
    isAllowed,
    assertAllowed,
  };
}

export function requireAllowedRole(
  input: Readonly<{ currentRole: UserRole; allowedRoles: readonly UserRole[] }>,
): void {
  if (input.allowedRoles.includes(input.currentRole)) {
    return;
  }

  throw createAppError("AUTH_FORBIDDEN", "Acesso negado para o papel atual.");
}

export type { RbacPermission, RbacPolicyService };
