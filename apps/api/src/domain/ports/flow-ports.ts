/** Ports de persistencia de flows. Contratos de CRUD e lifecycle consumidos pelos use cases (RN-020). */
import type { FlowEntity, FlowId, FlowStatus } from "../flow-types";
import type { PaginatedResult } from "./conversation-ports";

/** Filtros aceitos na listagem paginada de flows. */
type FlowFilters = Readonly<{
  status?: FlowStatus | undefined;
  page: number;
  limit: number;
}>;

type ActivationConflict = Readonly<{ ok: false; reason: "ACTIVATION_CONFLICT" }>;

/**
 * Resultado de `activateExclusive`: o flow recem-ativado e o anterior (se houve troca), ou
 * `ACTIVATION_CONFLICT` quando o indice unico `flows_one_active_per_tenant` rejeita a
 * ativacao por corrida com outra ativacao concorrente (caso sem flow ativo previo pra travar).
 */
type ActivateExclusiveResult =
  | Readonly<{ ok: true; activated: FlowEntity; previousActiveFlow: FlowEntity | null }>
  | ActivationConflict;

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
  /**
   * Demove o flow ativo atual (se houver) e ativa `flowId` numa unica operacao atomica
   * (transacao + row lock na linha `active` do tenant) — o tenant nunca observa 0 nem 2
   * flows `active` simultaneos, mesmo sob falha no meio da troca ou chamadas concorrentes.
   */
  activateExclusive: (tenantId: string, flowId: FlowId) => Promise<ActivateExclusiveResult>;
  softDelete: (tenantId: string, flowId: FlowId) => Promise<void>;
}>;

export type { ActivateExclusiveResult, FlowFilters, FlowRepositoryPort };
