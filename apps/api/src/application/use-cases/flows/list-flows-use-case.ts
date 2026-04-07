/** Lista flows do tenant com paginacao e filtro por status. Tenant isolation obrigatorio (RN-020). */
import type { FlowEntity, FlowStatus } from "../../../domain/flow-types";
import type { PaginatedResult } from "../../../domain/ports/conversation-ports";
import type { FlowRepositoryPort } from "../../../domain/ports/flow-ports";

type ListFlowsInput = Readonly<{
  tenantId: string;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}>;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const validStatuses: ReadonlySet<string> = new Set(["draft", "published", "active", "archived"]);

type ListFlowsUseCaseDependencies = Readonly<{
  flowRepository: FlowRepositoryPort;
}>;

type ListFlowsUseCase = Readonly<{
  execute: (input: ListFlowsInput) => Promise<PaginatedResult<FlowEntity>>;
}>;

export function createListFlowsUseCase(
  dependencies: ListFlowsUseCaseDependencies,
): ListFlowsUseCase {
  const { flowRepository } = dependencies;

  return {
    async execute(input: ListFlowsInput): Promise<PaginatedResult<FlowEntity>> {
      const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
      const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const status =
        input.status && validStatuses.has(input.status) ? (input.status as FlowStatus) : undefined;

      return flowRepository.findByTenantPaginated(input.tenantId, { page, limit, status });
    },
  };
}

export type { ListFlowsInput, ListFlowsUseCase, ListFlowsUseCaseDependencies };
