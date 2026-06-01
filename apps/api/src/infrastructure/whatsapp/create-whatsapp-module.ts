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
  ChatwootPortResolver,
  SessionLockPort,
  SessionRepositoryPort,
  WebhookIdempotencyPort,
  WhatsAppInstanceRepositoryPort,
} from "../../domain/ports/whatsapp-ports";
import { createInMemoryCacheAdapter, createValkeyCacheAdapterFromUrl } from "../cache";
import {
  createInMemorySessionLockAdapter,
  createValkeySessionLockAdapter,
} from "../cache/session-lock-adapter";
import {
  createInMemoryWebhookIdempotencyAdapter,
  createValkeyWebhookIdempotencyAdapter,
} from "../cache/webhook-idempotency-adapter";
import { createInMemoryEventPublisher } from "../events/in-memory-event-publisher";
import { createDrizzleConversationRepository } from "../repositories/drizzle-conversation-repository";
import { createDrizzleSessionRepository } from "../repositories/drizzle-session-repository";
import { createDrizzleWhatsAppInstanceRepository } from "../repositories/drizzle-whatsapp-instance-repository";
import { createInMemoryConversationRepository } from "../repositories/in-memory-conversation-repository";
import { createInMemoryWhatsAppRepositories } from "../repositories/in-memory-whatsapp-repositories";
import { createDevMockWhatsAppSender } from "./dev-mock-whatsapp-sender";
import { resolveProviderBundle } from "./provider-factory";

type WhatsAppModule = Readonly<{
  instanceRepository: WhatsAppInstanceRepositoryPort;
  sessionRepository: SessionRepositoryPort;
  processIncomingMessage: ReturnType<typeof createProcessIncomingMessageUseCase>;
}>;

type CreateWhatsAppModuleInput = Readonly<{
  logger: AppLoggerPort;
  db?: PostgresJsDatabase<typeof schema>;
  redisUrl?: string;
  flowResolver?: FlowResolverService;
  devMockWhatsappSend?: boolean;
  resolveChatwootPort: ChatwootPortResolver;
}>;

type WhatsAppContainerTokenMap = Readonly<{
  sessionRepository: SessionRepositoryPort;
  conversationRepository: ConversationRepositoryPort;
  instanceRepository: WhatsAppInstanceRepositoryPort;
  sessionLock: SessionLockPort;
  webhookIdempotency: WebhookIdempotencyPort;
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
  const {
    logger,
    db,
    redisUrl,
    flowResolver: externalFlowResolver,
    devMockWhatsappSend = false,
    resolveChatwootPort,
  } = input;

  const whatsAppSender = devMockWhatsappSend
    ? createDevMockWhatsAppSender()
    : resolveProviderBundle("evolution").sender;

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

  const whatsappCache =
    redisUrl !== undefined
      ? createValkeyCacheAdapterFromUrl({
          valkeyUrl: redisUrl,
          namespace: "api:whatsapp",
        })
      : createInMemoryCacheAdapter();

  container.registerSingleton(whatsappTokens.sessionLock, () =>
    redisUrl !== undefined
      ? createValkeySessionLockAdapter(whatsappCache)
      : createInMemorySessionLockAdapter(),
  );
  container.registerSingleton(whatsappTokens.webhookIdempotency, () =>
    redisUrl !== undefined
      ? createValkeyWebhookIdempotencyAdapter(whatsappCache)
      : createInMemoryWebhookIdempotencyAdapter(),
  );
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
      whatsAppSender,
      resolveChatwootPort,
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
