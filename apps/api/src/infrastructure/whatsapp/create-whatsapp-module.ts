/** Módulo DI para WhatsApp. Registra todos os ports, adapters e use cases no container de injeção de dependência. */
import { createContainer, createToken } from "container";
import type { PostgresJsDatabase, schema } from "db";

import type { FlowResolverService } from "../../application/services/flow-resolver-service";
import { createProcessIncomingMessageUseCase } from "../../application/use-cases/process-incoming-message-use-case";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ConversationRepositoryPort,
  DomainEventPublisherPort,
} from "../../domain/ports/conversation-ports";
import type {
  ChatwootPort,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import { createInMemorySessionLockAdapter } from "../cache/session-lock-adapter";
import { createInMemoryWebhookIdempotencyAdapter } from "../cache/webhook-idempotency-adapter";
import { createInMemoryChatwootAdapter } from "../chatwoot";
import { createInMemoryEventPublisher } from "../events/in-memory-event-publisher";
import { createDrizzleConversationRepository } from "../repositories/drizzle-conversation-repository";
import { createDrizzleSessionRepository } from "../repositories/drizzle-session-repository";
import { createDrizzleWhatsAppInstanceRepository } from "../repositories/drizzle-whatsapp-instance-repository";
import { createInMemoryConversationRepository } from "../repositories/in-memory-conversation-repository";
import { createInMemoryWhatsAppRepositories } from "../repositories/in-memory-whatsapp-repositories";
import { resolveProviderBundle } from "./provider-factory";

type WhatsAppModule = Readonly<{
  instanceRepository: WhatsAppInstanceRepositoryPort;
  sessionRepository: SessionRepositoryPort;
  processIncomingMessage: ReturnType<typeof createProcessIncomingMessageUseCase>;
}>;

type CreateWhatsAppModuleInput = Readonly<{
  logger: AppLoggerPort;
  db?: PostgresJsDatabase<typeof schema>;
  flowResolver?: FlowResolverService;
}>;

type WhatsAppContainerTokenMap = Readonly<{
  sessionRepository: SessionRepositoryPort;
  conversationRepository: ConversationRepositoryPort;
  instanceRepository: WhatsAppInstanceRepositoryPort;
  sessionLock: SessionLockPort;
  webhookIdempotency: WebhookIdempotencyPort;
  chatwootPort: ChatwootPort;
  flowResolver: FlowResolverService;
  eventPublisher: DomainEventPublisherPort;
  processIncomingMessage: ReturnType<typeof createProcessIncomingMessageUseCase>;
}>;

const whatsappTokens: Readonly<{
  [K in keyof WhatsAppContainerTokenMap]: ReturnType<
    typeof createToken<WhatsAppContainerTokenMap[K]>
  >;
}> = {
  sessionRepository: createToken<SessionRepositoryPort>("whatsapp.sessionRepository"),
  conversationRepository: createToken<ConversationRepositoryPort>(
    "whatsapp.conversationRepository",
  ),
  instanceRepository: createToken<WhatsAppInstanceRepositoryPort>("whatsapp.instanceRepository"),
  sessionLock: createToken<SessionLockPort>("whatsapp.sessionLock"),
  webhookIdempotency: createToken<WebhookIdempotencyPort>("whatsapp.webhookIdempotency"),
  chatwootPort: createToken<ChatwootPort>("whatsapp.chatwootPort"),
  flowResolver: createToken<FlowResolverService>("whatsapp.flowResolver"),
  eventPublisher: createToken<DomainEventPublisherPort>("whatsapp.eventPublisher"),
  processIncomingMessage: createToken<ReturnType<typeof createProcessIncomingMessageUseCase>>(
    "whatsapp.processIncomingMessage",
  ),
};

function createNoopFlowResolver(): FlowResolverService {
  return {
    async resolveFlow() {
      return null;
    },
    async invalidateCache() {
      /* noop — no cache in in-memory mode */
    },
  };
}

/** Bootstrap do módulo WhatsApp. Retorna instanceRepository e processIncomingMessage prontos para uso. */
export function createWhatsAppModule(input: CreateWhatsAppModuleInput): WhatsAppModule {
  const container = createContainer();
  const { logger, db, flowResolver: externalFlowResolver } = input;

  if (db) {
    container.registerSingleton(whatsappTokens.sessionRepository, () =>
      createDrizzleSessionRepository(db),
    );
    container.registerSingleton(whatsappTokens.conversationRepository, () =>
      createDrizzleConversationRepository(db),
    );
    container.registerSingleton(whatsappTokens.instanceRepository, () =>
      createDrizzleWhatsAppInstanceRepository(db),
    );
  } else {
    const repos = createInMemoryWhatsAppRepositories();
    container.registerSingleton(whatsappTokens.sessionRepository, () => repos.sessionRepository);
    container.registerSingleton(whatsappTokens.conversationRepository, () =>
      createInMemoryConversationRepository(),
    );
    container.registerSingleton(whatsappTokens.instanceRepository, () => repos.instanceRepository);
  }

  container.registerSingleton(whatsappTokens.sessionLock, () => createInMemorySessionLockAdapter());
  container.registerSingleton(whatsappTokens.webhookIdempotency, () =>
    createInMemoryWebhookIdempotencyAdapter(),
  );
  container.registerSingleton(whatsappTokens.chatwootPort, () => createInMemoryChatwootAdapter());
  container.registerSingleton(
    whatsappTokens.flowResolver,
    () => externalFlowResolver ?? createNoopFlowResolver(),
  );
  container.registerSingleton(whatsappTokens.eventPublisher, () => createInMemoryEventPublisher());
  container.registerTransient(whatsappTokens.processIncomingMessage, (resolver) =>
    createProcessIncomingMessageUseCase({
      sessionRepository: resolver.resolve(whatsappTokens.sessionRepository),
      conversationRepository: resolver.resolve(whatsappTokens.conversationRepository),
      sessionLock: resolver.resolve(whatsappTokens.sessionLock),
      webhookIdempotency: resolver.resolve(whatsappTokens.webhookIdempotency),
      whatsAppSender: resolveProviderBundle("evolution").sender,
      chatwootPort: resolver.resolve(whatsappTokens.chatwootPort),
      flowResolver: resolver.resolve(whatsappTokens.flowResolver),
      eventPublisher: resolver.resolve(whatsappTokens.eventPublisher),
      logger,
    }),
  );

  return {
    instanceRepository: container.resolve(whatsappTokens.instanceRepository),
    sessionRepository: container.resolve(whatsappTokens.sessionRepository),
    processIncomingMessage: container.resolve(whatsappTokens.processIncomingMessage),
  };
}

export type { CreateWhatsAppModuleInput, WhatsAppModule };
