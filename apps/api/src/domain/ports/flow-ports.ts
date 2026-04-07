/** Ports de persistencia de flows. Contratos de CRUD e lifecycle consumidos pelos use cases (RN-020). */
import type { FlowEntity, FlowId, FlowStatus } from "../flow-types";
import type { PaginatedResult } from "./conversation-ports";

/** Filtros aceitos na listagem paginada de flows. */
type FlowFilters = Readonly<{
  status?: FlowStatus | undefined;
  page: number;
  limit: number;
}>;

/** Persistencia de flows. Isolamento por tenant_id obrigatorio em todas as queries. Soft delete via deleted_at. */
type FlowRepositoryPort = Readonly<{
  findById: (tenantId: string, flowId: FlowId) => Promise<FlowEntity | null>;
  findActiveByTenant: (tenantId: string) => Promise<FlowEntity | null>;
  findByTenantPaginated: (
    tenantId: string,
    filters: FlowFilters,
  ) => Promise<PaginatedResult<FlowEntity>>;
  save: (flow: FlowEntity) => Promise<FlowEntity>;
  updateStatus: (
    tenantId: string,
    flowId: FlowId,
    status: FlowStatus,
    deletedAt?: Date | null,
  ) => Promise<FlowEntity>;
  softDelete: (tenantId: string, flowId: FlowId) => Promise<void>;
}>;

export type { FlowFilters, FlowRepositoryPort };
