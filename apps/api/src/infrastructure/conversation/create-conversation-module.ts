import { createAssignConversationUseCase } from "../../application/use-cases/assign-conversation-use-case";
import { createCloseConversationUseCase } from "../../application/use-cases/close-conversation-use-case";
import { createSyncChatwootMessageUseCase } from "../../application/use-cases/sync-chatwoot-message-use-case";
import { createSyncChatwootStatusUseCase } from "../../application/use-cases/sync-chatwoot-status-use-case";
import type { AppLoggerPort } from "../../domain/ports/auth-ports";
import type {
  ConversationRepositoryPort,
  DomainEventPublisherPort,
  DomainEventSubscriberPort,
} from "../../domain/ports/conversation-ports";
import type {
  SessionRepositoryPort,
  WhatsAppInstanceRepositoryPort,
  WhatsAppSenderPort,
} from "../../domain/ports/whatsapp-ports";
import type { ConnectionManager } from "../../interface/ws/connection-manager";
import { createConnectionManager } from "../../interface/ws/connection-manager";
import { initializeEventToWebSocketBridge } from "../events/event-to-websocket-bridge";
import { createInMemoryEventPublisher } from "../events/in-memory-event-publisher";
import { createInMemoryEventSubscriber } from "../events/in-memory-event-subscriber";
import { createInMemoryConversationRepository } from "../repositories/in-memory-conversation-repository";
import { resolveProviderBundle } from "../whatsapp/provider-factory";

type ConversationModule = Readonly<{
  connectionManager: ConnectionManager;
  assignConversation: ReturnType<typeof createAssignConversationUseCase>;
  closeConversation: ReturnType<typeof createCloseConversationUseCase>;
  syncChatwootMessage: ReturnType<typeof createSyncChatwootMessageUseCase>;
  syncChatwootStatus: ReturnType<typeof createSyncChatwootStatusUseCase>;
  conversationRepository: ConversationRepositoryPort;
  eventPublisher: DomainEventPublisherPort;
  eventSubscriber: DomainEventSubscriberPort;
}>;

type CreateConversationModuleInput = Readonly<{
  sessionRepository: SessionRepositoryPort;
  instanceRepository: WhatsAppInstanceRepositoryPort;
  logger: AppLoggerPort;
}>;

/** Bootstrap do módulo Conversation. In-memory para dev; produção usa Drizzle + Valkey. */
export function createConversationModule(input: CreateConversationModuleInput): ConversationModule {
  const { sessionRepository, instanceRepository, logger } = input;

  const conversationRepository = createInMemoryConversationRepository();
  const eventPublisher = createInMemoryEventPublisher();
  const eventSubscriber = createInMemoryEventSubscriber();
  const connectionManager = createConnectionManager();

  initializeEventToWebSocketBridge(eventSubscriber, connectionManager);

  const assignConversation = createAssignConversationUseCase({
    conversationRepository,
    sessionRepository,
    eventPublisher,
    logger,
  });

  const closeConversation = createCloseConversationUseCase({
    conversationRepository,
    sessionRepository,
    eventPublisher,
    logger,
  });

  const senderResolver = (provider: string): WhatsAppSenderPort =>
    resolveProviderBundle(provider as import("../../domain/whatsapp-types").WhatsAppProvider)
      .sender;

  const syncChatwootMessage = createSyncChatwootMessageUseCase({
    conversationRepository,
    instanceRepository,
    senderResolver,
    logger,
  });

  const syncChatwootStatus = createSyncChatwootStatusUseCase({
    conversationRepository,
    assignConversation,
    closeConversation,
    logger,
  });

  return {
    connectionManager,
    assignConversation,
    closeConversation,
    syncChatwootMessage,
    syncChatwootStatus,
    conversationRepository,
    eventPublisher,
    eventSubscriber,
  };
}

export type { ConversationModule, CreateConversationModuleInput };
