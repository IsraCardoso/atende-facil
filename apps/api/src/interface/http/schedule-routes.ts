/** Rotas HTTP de schedules. CRUD com RBAC, tenant isolation e input validation (RN-027). */
import { Elysia, t } from "elysia";

import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type {
  CreateScheduleUseCase,
  DeleteScheduleUseCase,
  ListSchedulesUseCase,
  UpdateScheduleUseCase,
} from "../../application/use-cases/schedules";
import { authenticateRequest } from "./auth-middleware";

type CreateScheduleRoutesInput = Readonly<{
  createSchedule: CreateScheduleUseCase;
  listSchedules: ListSchedulesUseCase;
  updateSchedule: UpdateScheduleUseCase;
  deleteSchedule: DeleteScheduleUseCase;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

const scheduleBodySchema = t.Object({
  flowId: t.String({ minLength: 1 }),
  daysOfWeek: t.Array(t.Integer({ minimum: 0, maximum: 6 }), { minItems: 1 }),
  startTime: t.RegExp(/^\d{2}:\d{2}$/),
  endTime: t.RegExp(/^\d{2}:\d{2}$/),
});

const updateBodySchema = t.Object({
  flowId: t.Optional(t.String({ minLength: 1 })),
  daysOfWeek: t.Optional(t.Array(t.Integer({ minimum: 0, maximum: 6 }), { minItems: 1 })),
  startTime: t.Optional(t.RegExp(/^\d{2}:\d{2}$/)),
  endTime: t.Optional(t.RegExp(/^\d{2}:\d{2}$/)),
  active: t.Optional(t.Boolean()),
});

export function createScheduleRoutes(input: CreateScheduleRoutesInput) {
  const { createSchedule, listSchedules, updateSchedule, deleteSchedule, verifyAccessTokenUseCase } = input;

  return new Elysia({ prefix: "/flows/schedules" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      return { authClaims };
    })
    .post(
      "/",
      async ({ authClaims, body, set }) => {
        try {
          set.status = 201;
          return await createSchedule.execute({
            tenantId: authClaims.tenantId,
            role: authClaims.role,
            flowId: body.flowId,
            daysOfWeek: body.daysOfWeek,
            startTime: body.startTime,
            endTime: body.endTime,
          });
        } catch (error: unknown) {
          if (error instanceof Error && error.message.startsWith("SCHEDULE_OVERLAP")) {
            set.status = 409;
            return { error: error.message };
          }
          if (error instanceof Error && error.message.startsWith("SCHEDULE_FORBIDDEN")) {
            set.status = 403;
            return { error: error.message };
          }
          throw error;
        }
      },
      { body: scheduleBodySchema },
    )
    .get("/", async ({ authClaims }) =>
      listSchedules.execute({ tenantId: authClaims.tenantId }),
    )
    .put(
      "/:id",
      async ({ authClaims, params, body, set }) => {
        try {
          return await updateSchedule.execute({
            tenantId: authClaims.tenantId,
            role: authClaims.role,
            scheduleId: params.id,
            flowId: body.flowId ?? undefined,
            daysOfWeek: body.daysOfWeek ?? undefined,
            startTime: body.startTime ?? undefined,
            endTime: body.endTime ?? undefined,
            active: body.active ?? undefined,
          });
        } catch (error: unknown) {
          if (error instanceof Error && error.message.startsWith("SCHEDULE_OVERLAP")) {
            set.status = 409;
            return { error: error.message };
          }
          if (error instanceof Error && error.message.startsWith("SCHEDULE_FORBIDDEN")) {
            set.status = 403;
            return { error: error.message };
          }
          if (error instanceof Error && error.message.startsWith("SCHEDULE_NOT_FOUND")) {
            set.status = 404;
            return { error: error.message };
          }
          throw error;
        }
      },
      { body: updateBodySchema },
    )
    .delete("/:id", async ({ authClaims, params, set }) => {
      try {
        await deleteSchedule.execute({
          tenantId: authClaims.tenantId,
          role: authClaims.role,
          scheduleId: params.id,
        });
        return { success: true };
      } catch (error: unknown) {
        if (error instanceof Error && error.message.startsWith("SCHEDULE_FORBIDDEN")) {
          set.status = 403;
          return { error: error.message };
        }
        if (error instanceof Error && error.message.startsWith("SCHEDULE_NOT_FOUND")) {
          set.status = 404;
          return { error: error.message };
        }
        throw error;
      }
    });
}

export type { CreateScheduleRoutesInput };
