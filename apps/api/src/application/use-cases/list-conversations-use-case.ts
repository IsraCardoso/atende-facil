/** Lista conversations paginadas de um tenant. Paginação obrigatória, filtro por status opcional (RN-018). */

import type { ConversationEntity } from "../../domain/conversation-types";
import type {
  ConversationFilters,
  ConversationRepositoryPort,
  PaginatedResult,
} from "../../domain/ports/conversation-ports";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type ListConversationsInput = Readonly<{
  tenantId: string;
  status: string | undefined;
  page: number | undefined;
  limit: number | undefined;
}>;

type ListConversationsResult = PaginatedResult<ConversationEntity>;

function clampLimit(raw: number | undefined): number {
  if (!raw || raw < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(raw, MAX_LIMIT);
}

function clampPage(raw: number | undefined): number {
  if (!raw || raw < 1) {
    return DEFAULT_PAGE;
  }
  return Math.floor(raw);
}

function isValidConversationStatus(value: string): value is ConversationFilters["status"] & string {
  return value === "bot" || value === "waiting_human" || value === "human_active";
}

type ListConversationsUseCaseDeps = Readonly<{
  conversationRepository: ConversationRepositoryPort;
}>;

function createListConversationsUseCase(deps: ListConversationsUseCaseDeps) {
  return {
    async execute(input: ListConversationsInput): Promise<ListConversationsResult> {
      const resolvedStatus =
        input.status && isValidConversationStatus(input.status) ? input.status : undefined;
      const filters: ConversationFilters = resolvedStatus
        ? { status: resolvedStatus, page: clampPage(input.page), limit: clampLimit(input.limit) }
        : { page: clampPage(input.page), limit: clampLimit(input.limit) };
      return deps.conversationRepository.findByTenantPaginated(input.tenantId, filters);
    },
  };
}

export type { ListConversationsInput, ListConversationsResult, ListConversationsUseCaseDeps };
export { createListConversationsUseCase };
