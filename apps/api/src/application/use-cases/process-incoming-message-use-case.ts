/** Orquestra o processamento de mensagem WhatsApp recebida: idempotência → lock → session → flow engine → envio → hand-off (RN-011, RN-012, RN-013). */
import type { Flow, ProcessResult, Session } from "flow";
import { processMessage } from "flow";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ChatwootPort,
  FlowRepositoryPort,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type {
  CanonicalInboundMessage,
  SessionEntity,
  WhatsAppInstanceConfig,
} from "../../domain/whatsapp-types";
import { createSessionId } from "../../domain/whatsapp-types";

const SESSION_LOCK_TTL_MS = 10_000;
const IDEMPOTENCY_TTL_SECONDS = 86_400;

type ProcessIncomingMessageDependencies = Readonly<{
  sessionRepository: SessionRepositoryPort;
  sessionLock: SessionLockPort;
  webhookIdempotency: WebhookIdempotencyPort;
  whatsAppSender: WhatsAppSenderPort;
  chatwootPort: ChatwootPort;
  flowRepository: FlowRepositoryPort;
  logger: AppLoggerPort;
}>;

type ProcessIncomingMessageInput = Readonly<{
  tenantId: string;
  instanceConfig: WhatsAppInstanceConfig;
  message: CanonicalInboundMessage;
  correlationId: string;
}>;

/** Resultado discriminado: processed=true com action, ou processed=false com reason (duplicate, lock, no_flow). */
type ProcessIncomingMessageResult =
  | Readonly<{ processed: true; action: string }>
  | Readonly<{ processed: false; reason: string }>;

function mapSessionEntityToFlowSession(entity: SessionEntity): Session {
  return {
    tenantId: entity.tenantId,
    phone: entity.phone,
    currentNodeId: entity.currentNodeId,
    mode: entity.mode,
    data: entity.data,
  };
}

function applyFlowResultToSession(entity: SessionEntity, flowResult: ProcessResult): SessionEntity {
  return {
    ...entity,
    currentNodeId: flowResult.session.currentNodeId,
    mode: flowResult.session.mode,
    data: flowResult.session.data,
    updatedAt: new Date(),
  };
}

function createNewSession(tenantId: string, message: CanonicalInboundMessage): SessionEntity {
  return {
    id: createSessionId(crypto.randomUUID()),
    tenantId,
    phone: message.from,
    currentNodeId: null,
    mode: "bot",
    data: {},
    flowId: null,
    chatwootConversationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Factory do use case principal de mensageria. Recebe todos os ports via DI — não conhece providers específicos. */
export function createProcessIncomingMessageUseCase(deps: ProcessIncomingMessageDependencies) {
  return {
    async execute(input: ProcessIncomingMessageInput): Promise<ProcessIncomingMessageResult> {
      const { tenantId, message, correlationId, instanceConfig } = input;

      const alreadyProcessed = await deps.webhookIdempotency.isProcessed(
        message.provider,
        message.messageId,
      );
      if (alreadyProcessed) {
        deps.logger.info("Webhook duplicado ignorado.", {
          correlationId,
          tenantId: tenantId as string & { readonly __brand: "TenantId" },
        });
        return { processed: false, reason: "duplicate" };
      }

      const lockAcquired = await deps.sessionLock.acquire(
        tenantId,
        message.from,
        SESSION_LOCK_TTL_MS,
      );
      if (!lockAcquired) {
        deps.logger.warn("Lock de sessão não adquirido.", {
          correlationId,
          tenantId: tenantId as string & { readonly __brand: "TenantId" },
        });
        return { processed: false, reason: "lock_not_acquired" };
      }

      try {
        await deps.webhookIdempotency.markProcessed(
          message.provider,
          message.messageId,
          IDEMPOTENCY_TTL_SECONDS,
        );

        let session =
          (await deps.sessionRepository.findByTenantAndPhone(tenantId, message.from)) ??
          createNewSession(tenantId, message);

        if (session.mode !== "bot") {
          await handleNonBotMessage(deps, session, message, correlationId);
          return { processed: true, action: "forwarded_to_chatwoot" };
        }

        const flowRecord = await deps.flowRepository.findActiveByTenant(tenantId);
        if (!flowRecord) {
          deps.logger.warn("Nenhum fluxo ativo para o tenant.", {
            correlationId,
            tenantId: tenantId as string & { readonly __brand: "TenantId" },
          });
          return { processed: false, reason: "no_active_flow" };
        }

        const flow = flowRecord.definition as unknown as Flow;
        const flowSession = mapSessionEntityToFlowSession(session);
        const flowResult = processMessage(flowSession, message.text, flow);

        session = applyFlowResultToSession(session, flowResult);
        session = { ...session, flowId: flowRecord.id };
        await deps.sessionRepository.save(session);

        await sendOutgoingMessages(
          deps.whatsAppSender,
          instanceConfig,
          message.from,
          flowResult.outgoingMessages,
        );

        if (flowResult.action.kind === "transferred_to_human") {
          await handleHandoff(deps, session, flowResult, correlationId);
          return { processed: true, action: "transferred_to_human" };
        }

        return { processed: true, action: flowResult.action.kind };
      } finally {
        await deps.sessionLock.release(tenantId, message.from);
      }
    },
  };
}

async function sendOutgoingMessages(
  sender: WhatsAppSenderPort,
  instanceConfig: WhatsAppInstanceConfig,
  to: CanonicalInboundMessage["from"],
  messages: readonly string[],
): Promise<void> {
  const sendPromises = messages.map((text) =>
    sender.sendText(instanceConfig, {
      to,
      text,
      instanceId: instanceConfig.provider as string & {
        readonly __brand: "WhatsAppInstanceId";
      },
    }),
  );
  await Promise.all(sendPromises);
}

async function handleNonBotMessage(
  deps: ProcessIncomingMessageDependencies,
  session: SessionEntity,
  message: CanonicalInboundMessage,
  correlationId: string,
): Promise<void> {
  if (session.chatwootConversationId) {
    await deps.chatwootPort.sendMessage({
      conversationId: session.chatwootConversationId,
      message: message.text,
    });
  } else {
    deps.logger.warn("Sessão não-bot sem conversationId no Chatwoot.", {
      correlationId,
      tenantId: session.tenantId as string & { readonly __brand: "TenantId" },
    });
  }
}

async function handleHandoff(
  deps: ProcessIncomingMessageDependencies,
  session: SessionEntity,
  flowResult: ProcessResult,
  correlationId: string,
): Promise<void> {
  try {
    const conversationId = await deps.chatwootPort.createConversation({
      tenantId: session.tenantId,
      phone: session.phone,
      sessionId: session.id,
      contextMessages: [...flowResult.outgoingMessages],
    });

    await deps.sessionRepository.updateMode(
      session.tenantId,
      session.id,
      "waiting_human",
      conversationId,
    );
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Erro desconhecido";
    deps.logger.error("Falha ao criar conversa no Chatwoot.", {
      correlationId,
      tenantId: session.tenantId as string & { readonly __brand: "TenantId" },
      context: { reason },
    });
  }
}

export type {
  ProcessIncomingMessageDependencies,
  ProcessIncomingMessageInput,
  ProcessIncomingMessageResult,
};
