/** Orquestra o processamento de mensagem WhatsApp recebida: idempotência → lock → session → conversation → flow engine → envio → hand-off (RN-011, RN-012, RN-013, RN-014, RN-015). */
import type { Flow, ProcessResult, Session } from "flow";
import { processMessage } from "flow";

import type { ConversationEntity } from "../../domain/conversation-types";
import { createConversationId } from "../../domain/conversation-types";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ConversationRepositoryPort,
  DomainEventPublisherPort,
} from "../../domain/ports/conversation-ports";
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
  conversationRepository: ConversationRepositoryPort;
  sessionLock: SessionLockPort;
  webhookIdempotency: WebhookIdempotencyPort;
  whatsAppSender: WhatsAppSenderPort;
  chatwootPort: ChatwootPort;
  flowRepository: FlowRepositoryPort;
  eventPublisher: DomainEventPublisherPort;
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

function createNewConversation(session: SessionEntity): ConversationEntity {
  return {
    id: createConversationId(crypto.randomUUID()),
    tenantId: session.tenantId,
    sessionId: session.id,
    phone: session.phone,
    status: "bot",
    assignedTo: null,
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

        session = await deps.sessionRepository.save(session);

        let conversation = await deps.conversationRepository.findBySessionId(tenantId, session.id);
        if (!conversation) {
          conversation = createNewConversation(session);
          conversation = await deps.conversationRepository.save(conversation);
        }

        if (conversation.status !== "bot") {
          await handleNonBotMessage(deps, session, conversation, message, correlationId);
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
          await handleHandoff(deps, session, conversation, flowResult, correlationId);
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
  conversation: ConversationEntity,
  message: CanonicalInboundMessage,
  correlationId: string,
): Promise<void> {
  if (conversation.chatwootConversationId) {
    await deps.chatwootPort.sendMessage({
      conversationId: conversation.chatwootConversationId,
      message: message.text,
    });
  } else {
    deps.logger.warn("Conversa não-bot sem conversationId no Chatwoot.", {
      correlationId,
      tenantId: session.tenantId as string & { readonly __brand: "TenantId" },
    });
  }
}

async function handleHandoff(
  deps: ProcessIncomingMessageDependencies,
  session: SessionEntity,
  conversation: ConversationEntity,
  flowResult: ProcessResult,
  correlationId: string,
): Promise<void> {
  try {
    const chatwootConversationId = await deps.chatwootPort.createConversation({
      tenantId: session.tenantId,
      phone: session.phone,
      sessionId: session.id,
      contextMessages: [...flowResult.outgoingMessages],
    });

    await deps.conversationRepository.updateStatus(
      session.tenantId,
      conversation.id,
      "waiting_human",
    );

    await deps.sessionRepository.updateMode(
      session.tenantId,
      session.id,
      "waiting_human",
      chatwootConversationId,
    );

    const updatedConversation: ConversationEntity = {
      ...conversation,
      status: "waiting_human",
      chatwootConversationId,
      updatedAt: new Date(),
    };
    await deps.conversationRepository.save(updatedConversation);

    const reason =
      flowResult.action.kind === "transferred_to_human" ? flowResult.action.reason : null;

    await deps.eventPublisher.publish({
      type: "conversation.handed_off",
      tenantId: session.tenantId,
      conversationId: conversation.id,
      phone: session.phone,
      timestamp: Date.now(),
      payload: {
        sessionId: session.id,
        chatwootConversationId,
        reason,
      },
    });
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
