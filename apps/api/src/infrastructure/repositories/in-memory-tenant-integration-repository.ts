/** Repositorio in-memory de tenant_integrations para testes e dev sem DB (RN-026). */
import type { IntegrationProvider, TenantIntegrationEntity } from "../../domain/integration-types";
import type { TenantIntegrationRepositoryPort } from "../../domain/ports/integration-ports";

export function createInMemoryTenantIntegrationRepository(): TenantIntegrationRepositoryPort {
  const store = new Map<string, TenantIntegrationEntity>();

  function key(tenantId: string, provider: IntegrationProvider): string {
    return `${tenantId}:${provider}`;
  }

  return {
    async findByTenantAndProvider(
      tenantId: string,
      provider: IntegrationProvider,
    ): Promise<TenantIntegrationEntity | null> {
      const entity = store.get(key(tenantId, provider));
      if (!entity || !entity.isActive) {
        return null;
      }
      return entity;
    },

    async save(entity: TenantIntegrationEntity): Promise<TenantIntegrationEntity> {
      store.set(key(entity.tenantId, entity.provider), entity);
      return entity;
    },
  };
}
