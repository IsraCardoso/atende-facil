/** Port de acesso a configs de integracoes per-tenant. Implementado por Drizzle ou in-memory (RN-026). */
import type { IntegrationProvider, TenantIntegrationEntity } from "../integration-types";

type TenantIntegrationRepositoryPort = Readonly<{
  findByTenantAndProvider: (
    tenantId: string,
    provider: IntegrationProvider,
  ) => Promise<TenantIntegrationEntity | null>;
  save: (entity: TenantIntegrationEntity) => Promise<TenantIntegrationEntity>;
}>;

export type { TenantIntegrationRepositoryPort };
