/** Rotas HTTP de conversations. Listagem paginada, detalhe e acesso Chatwoot. Todas autenticadas com tenant isolation (RN-018). */
import { Elysia } from "elysia";

import type { createChatwootAccessService } from "../../application/services/chatwoot-access-service";
import type { VerifyAccessTokenUseCase } from "../../application/use-cases";
import type { createGetConversationUseCase } from "../../application/use-cases/get-conversation-use-case";
import type { createListConversationsUseCase } from "../../application/use-cases/list-conversations-use-case";
import { createConversationId } from "../../domain/conversation-types";
import { authenticateRequest } from "./auth-middleware";
import { resolveCorrelationId } from "./correlation-id";

type CreateConversationRoutesInput = Readonly<{
  listConversations: ReturnType<typeof createListConversationsUseCase>;
  getConversation: ReturnType<typeof createGetConversationUseCase>;
  chatwootAccess: ReturnType<typeof createChatwootAccessService>;
  verifyAccessTokenUseCase: VerifyAccessTokenUseCase;
}>;

export function createConversationRoutes(input: CreateConversationRoutesInput) {
  const { listConversations, getConversation, chatwootAccess, verifyAccessTokenUseCase } = input;

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
    .get("/:id/access", async ({ authClaims, params }) => {
      const conversation = await getConversation.execute({
        tenantId: authClaims.tenantId,
        conversationId: createConversationId(params.id),
      });

      if (!conversation.chatwootConversationId) {
        return {
          embedUrl: null,
          deepLink: null,
          reason: "Conversa sem vínculo com Chatwoot.",
        };
      }

      const urls = chatwootAccess.generateAccessUrls(conversation.chatwootConversationId);
      return urls;
    });
}

export type { CreateConversationRoutesInput };
