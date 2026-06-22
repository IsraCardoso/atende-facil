/** Rotas HTTP de conversations. Listagem paginada, detalhe e acesso Chatwoot. Todas autenticadas com tenant isolation (RN-018). */
import { Elysia } from "elysia";

import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { createGetConversationUseCase } from "../../application/use-cases/get-conversation-use-case";
import type { createListConversationsUseCase } from "../../application/use-cases/list-conversations-use-case";
import type { ConversationStatus } from "../../domain/conversation-types";
import { createConversationId } from "../../domain/conversation-types";
import type { SessionRepositoryPort } from "../../domain/ports/whatsapp-ports";
import { createPhone } from "../../domain/whatsapp-types";
import { authenticateRequest } from "./auth-middleware";
import { resolveCorrelationId } from "./correlation-id";

const CHATWOOT_NOT_CONFIGURED_REASON =
  "Chatwoot não está configurado neste ambiente. Defina CHATWOOT_APP_URL apontando para uma instância Chatwoot real para abrir o chat embutido.";

type ConversationAccessDevContext = Readonly<{
  phone: string;
  status: ConversationStatus;
  sessionData: Readonly<Record<string, unknown>>;
}>;

type ConversationAccessResponse = Readonly<{
  embedUrl: string | null;
  deepLink: string | null;
  reason?: string;
  devContext?: ConversationAccessDevContext;
}>;

type CreateConversationRoutesInput = Readonly<{
  listConversations: ReturnType<typeof createListConversationsUseCase>;
  getConversation: ReturnType<typeof createGetConversationUseCase>;
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  sessionRepository: SessionRepositoryPort;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

async function buildDevContext(
  sessionRepository: SessionRepositoryPort,
  tenantId: string,
  phone: string,
  status: ConversationStatus,
): Promise<ConversationAccessDevContext> {
  const session = await sessionRepository.findByTenantAndPhone(tenantId, createPhone(phone));
  return {
    phone,
    status,
    sessionData: session?.data ?? {},
  };
}

export function createConversationRoutes(input: CreateConversationRoutesInput) {
  const {
    listConversations,
    getConversation,
    chatwootAccess,
    sessionRepository,
    verifyAccessTokenUseCase,
  } = input;

  return new Elysia({ prefix: "/conversations" })
    .derive(async ({ request }) => {
      const authClaims = await authenticateRequest(request, verifyAccessTokenUseCase);
      const correlationId = resolveCorrelationId(request);
      return { authClaims, correlationId };
    })
    .get("/", async ({ authClaims, query }) => {
      const rawStatus = query.status as string | undefined;
      const rawPage = query.page ? Number(query.page) : undefined;
      const rawLimit = query.limit ? Number(query.limit) : undefined;

      return listConversations.execute({
        tenantId: authClaims.tenantId,
        status: rawStatus ?? undefined,
        page: rawPage,
        limit: rawLimit,
      });
    })
    .get("/:id", async ({ authClaims, params }) => {
      const conversation = await getConversation.execute({
        tenantId: authClaims.tenantId,
        conversationId: createConversationId(params.id),
      });
      return conversation;
    })
    .get("/:id/access", async ({ authClaims, params }): Promise<ConversationAccessResponse> => {
      const conversation = await getConversation.execute({
        tenantId: authClaims.tenantId,
        conversationId: createConversationId(params.id),
      });

      if (!chatwootAccess.isAppConfigured) {
        return {
          embedUrl: null,
          deepLink: null,
          reason: CHATWOOT_NOT_CONFIGURED_REASON,
          devContext: await buildDevContext(
            sessionRepository,
            authClaims.tenantId,
            conversation.phone,
            conversation.status,
          ),
        };
      }

      if (!conversation.chatwootConversationId) {
        return {
          embedUrl: null,
          deepLink: null,
          reason: "Conversa sem vínculo com Chatwoot.",
          devContext: await buildDevContext(
            sessionRepository,
            authClaims.tenantId,
            conversation.phone,
            conversation.status,
          ),
        };
      }

      return chatwootAccess.generateAccessUrls(conversation.chatwootConversationId);
    });
}

export type {
  ConversationAccessDevContext,
  ConversationAccessResponse,
  CreateConversationRoutesInput,
};
