/** Rotas de webhook Chatwoot. Recebe eventos de mensagem do agente e mudança de status, roteia para use cases (RN-016). */
import { Elysia } from "elysia";

import {
  isOutgoingAgentMessage,
  parseChatwootWebhookContext,
} from "../../application/services/chatwoot-webhook-context";
import type { createSyncChatwootMessageUseCase } from "../../application/use-cases/sync-chatwoot-message-use-case";
import type {
  ChatwootEventType,
  createSyncChatwootStatusUseCase,
} from "../../application/use-cases/sync-chatwoot-status-use-case";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import { createChatwootConversationId } from "../../domain/whatsapp-types";
import { resolveCorrelationId } from "./correlation-id";

type CreateChatwootWebhookRoutesInput = Readonly<{
  syncMessage: ReturnType<typeof createSyncChatwootMessageUseCase>;
  syncStatus: ReturnType<typeof createSyncChatwootStatusUseCase>;
  logger: AppLoggerPort;
  webhookToken: string;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function mapChatwootStatusToEventType(status: string): ChatwootEventType | null {
  if (status === "open") {
    return "conversation_assigned";
  }
  if (status === "resolved") {
    return "conversation_resolved";
  }
  return null;
}

/** Cria rota POST /webhook/chatwoot autenticada por token fixo (decisão D4). */
export function createChatwootWebhookRoutes(input: CreateChatwootWebhookRoutesInput) {
  const { syncMessage, syncStatus, logger, webhookToken } = input;

  return new Elysia({ prefix: "/webhook" }).post("/chatwoot", async ({ body, request, set }) => {
    const correlationId = resolveCorrelationId(request);

    const authToken =
      request.headers.get("x-chatwoot-webhook-token") ??
      request.headers.get("authorization") ??
      new URL(request.url).searchParams.get("token");

    if (webhookToken && authToken !== webhookToken) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    if (!isRecord(body)) {
      set.status = 200;
      return { status: "ignored" };
    }

    const event = typeof body.event === "string" ? body.event : null;
    if (!event) {
      set.status = 200;
      return { status: "ignored" };
    }

    const context = parseChatwootWebhookContext(body);

    if (event === "message_created") {
      if (!isOutgoingAgentMessage(body)) {
        set.status = 200;
        return { status: "ignored" };
      }

      const content = typeof body.content === "string" ? body.content : null;
      if (!context || !content) {
        set.status = 200;
        return { status: "ignored" };
      }

      await syncMessage.execute({
        chatwootConversationId: createChatwootConversationId(context.chatwootConversationId),
        messageContent: content,
        correlationId,
        tenantId: context.tenantId ?? undefined,
        contactPhone: context.contactPhone ?? undefined,
      });

      set.status = 200;
      return { status: "ok" };
    }

    if (event === "conversation_status_changed") {
      const status = typeof body.status === "string" ? body.status : null;
      if (!status || !context) {
        set.status = 200;
        return { status: "ignored" };
      }

      const eventType = mapChatwootStatusToEventType(status);
      if (!eventType) {
        logger.debug("Evento Chatwoot status desconhecido ignorado.", {
          correlationId,
          tenantId: "" as string & { readonly __brand: "TenantId" },
          context: { status },
        });
        set.status = 200;
        return { status: "ignored" };
      }

      const assignedAgent =
        isRecord(body.meta) &&
        isRecord(body.meta.assignee) &&
        typeof body.meta.assignee.name === "string"
          ? body.meta.assignee.name
          : null;

      await syncStatus.execute({
        chatwootConversationId: createChatwootConversationId(context.chatwootConversationId),
        eventType,
        assignedAgentName: assignedAgent,
        correlationId,
        tenantId: context.tenantId ?? undefined,
        contactPhone: context.contactPhone ?? undefined,
      });

      set.status = 200;
      return { status: "ok" };
    }

    logger.debug("Evento Chatwoot desconhecido ignorado.", {
      correlationId,
      tenantId: "" as string & { readonly __brand: "TenantId" },
      context: { event },
    });

    set.status = 200;
    return { status: "ignored" };
  });
}

export type { CreateChatwootWebhookRoutesInput };
