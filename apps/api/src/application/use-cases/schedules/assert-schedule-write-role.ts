/** RBAC compartilhado para mutacao de schedules (RN-027). */
import type { UserRole } from "../../../domain/auth-types";

type ScheduleWriteVerb = "criar" | "editar" | "deletar";

export function assertScheduleWriteRole(role: UserRole, verb: ScheduleWriteVerb): void {
  if (role !== "admin" && role !== "manager") {
    throw new Error(`SCHEDULE_FORBIDDEN: apenas admin ou manager podem ${verb} schedules.`);
  }
}
