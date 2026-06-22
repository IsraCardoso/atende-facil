/** Testes do SyncChatwootMessageUseCase — cenarios: envio ok, conversation nao encontrada, instance nao encontrada. */
import { describe, expect, it, vi } from "vitest";
import type { WhatsAppInstanceEntity } from "../../domain/whatsapp-types";
import {
  createChatwootConversationId,
  createPhone,
  createWhatsAppInstanceId,
} from "../../domain/whatsapp-types";
import { createSyncChatwootMessageUseCase } from "./sync-chatwoot-message-use-case";
import { createFakeLogger, createTestConversation } from "./test-support";

const mockInstance: WhatsAppInstanceEntity = {
  id: createWhatsAppInstanceId("inst-1"),
  tenantId: "tenant-1",
  provider: "evolution",
  displayName: "WhatsApp",
  config: { instanceName: "test" },
  active: true,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createDeps() {
  const conversation = createTestConversation({
    chatwootConversationId: createChatwootConversationId("cw-1"),
    phone: createPhone("5511999999999"),
  });
  return {
    conversationRepository: {
      findByChatwootConversationId: vi.fn().mockResolvedValue(conversation),
      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findByTenantAndStatus: vi.fn(),
      findByTenantPaginated: vi.fn(),
      save: vi.fn(),
      updateStatus: vi.fn(),
    },
    instanceRepository: {
      findActiveByTenant: vi.fn().mockResolvedValue([mockInstance]),
      findByTenantAndId: vi.fn(),
      listByTenant: vi.fn().mockResolvedValue([mockInstance]),
      save: vi.fn(),
      setPrimary: vi.fn(),
      deleteByTenantAndId: vi.fn(),
    },
    senderResolver: vi.fn().mockReturnValue({
      sendText: vi.fn().mockResolvedValue({
        messageId: "msg-1",
        status: "sent",
        timestamp: Date.now(),
      }),
    }),
    logger: createFakeLogger(),
    conversation,
  };
}

describe("SyncChatwootMessageUseCase", () => {
  it("should send message to WhatsApp successfully", async () => {
    const { conversationRepository, instanceRepository, senderResolver, logger } = createDeps();
    const useCase = createSyncChatwootMessageUseCase({
      conversationRepository,
      instanceRepository,
      senderResolver,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-1"),
      messageContent: "Hello from agent",
      correlationId: "corr-1",
    });

    expect(result.success).toBe(true);
    expect(senderResolver).toHaveBeenCalledWith("evolution");
  });

  it("should fail when conversation not found", async () => {
    const { conversationRepository, instanceRepository, senderResolver, logger } = createDeps();
    conversationRepository.findByChatwootConversationId.mockResolvedValue(null);

    const useCase = createSyncChatwootMessageUseCase({
      conversationRepository,
      instanceRepository,
      senderResolver,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-unknown"),
      messageContent: "Hello",
      correlationId: "corr-2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("CONVERSATION_NOT_FOUND");
    }
  });

  it("should fail when no WhatsApp instance found", async () => {
    const { conversationRepository, instanceRepository, senderResolver, logger } = createDeps();
    instanceRepository.findActiveByTenant.mockResolvedValue([]);

    const useCase = createSyncChatwootMessageUseCase({
      conversationRepository,
      instanceRepository,
      senderResolver,
      logger,
    });

    const result = await useCase.execute({
      chatwootConversationId: createChatwootConversationId("cw-1"),
      messageContent: "Hello",
      correlationId: "corr-3",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("WHATSAPP_INSTANCE_NOT_FOUND");
    }
  });
});
