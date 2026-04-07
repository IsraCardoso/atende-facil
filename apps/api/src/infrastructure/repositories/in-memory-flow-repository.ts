/** Repositorio de flows em memoria para testes unitarios. Mesmo contrato que DrizzleFlowRepository. */
import type { FlowEntity, FlowId, FlowStatus } from "../../domain/flow-types";
import type { PaginatedResult } from "../../domain/ports/conversation-ports";
import type { FlowFilters, FlowRepositoryPort } from "../../domain/ports/flow-ports";

export function createInMemoryFlowRepository(): FlowRepositoryPort {
  const store = new Map<string, FlowEntity>();

  function keyOf(tenantId: string, flowId: FlowId): string {
    return `${tenantId}:${flowId}`;
  }

  return {
    async findById(tenantId: string, flowId: FlowId): Promise<FlowEntity | null> {
      const flow = store.get(keyOf(tenantId, flowId));
      if (!flow || flow.deletedAt) {
        return null;
      }
      return flow;
    },

    async findActiveByTenant(tenantId: string): Promise<FlowEntity | null> {
      for (const flow of store.values()) {
        if (flow.tenantId === tenantId && flow.status === "active" && !flow.deletedAt) {
          return flow;
        }
      }
      return null;
    },

    async findByTenantPaginated(
      tenantId: string,
      filters: FlowFilters,
    ): Promise<PaginatedResult<FlowEntity>> {
      const { page, limit, status } = filters;

      const allFlows = [...store.values()]
        .filter((f) => f.tenantId === tenantId && !f.deletedAt)
        .filter((f) => (status ? f.status === status : true))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      const total = allFlows.length;
      const offset = (page - 1) * limit;
      const data = allFlows.slice(offset, offset + limit);

      return {
        data,
        total,
        page,
        limit,
        hasMore: offset + data.length < total,
      };
    },

    async save(flow: FlowEntity): Promise<FlowEntity> {
      const saved: FlowEntity = { ...flow, updatedAt: new Date() };
      store.set(keyOf(flow.tenantId, flow.id), saved);
      return saved;
    },

    async updateStatus(
      tenantId: string,
      flowId: FlowId,
      status: FlowStatus,
      deletedAt?: Date | null,
    ): Promise<FlowEntity> {
      const flow = store.get(keyOf(tenantId, flowId));
      if (!flow) {
        throw new Error("Flow nao encontrado para atualizar status.");
      }

      const updated: FlowEntity = {
        ...flow,
        status,
        updatedAt: new Date(),
        ...(deletedAt !== undefined ? { deletedAt } : {}),
      };

      store.set(keyOf(tenantId, flowId), updated);
      return updated;
    },

    async softDelete(tenantId: string, flowId: FlowId): Promise<void> {
      const flow = store.get(keyOf(tenantId, flowId));
      if (!flow) {
        return;
      }

      store.set(keyOf(tenantId, flowId), {
        ...flow,
        status: "archived",
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
    },
  };
}
