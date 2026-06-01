/** Tipos de domínio para integracoes per-tenant (Chatwoot, etc). Branded type e entidade (RN-026). */
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

type TenantIntegrationId = Brand<string, "TenantIntegrationId">;

type IntegrationProvider = "chatwoot";

type ChatwootIntegrationConfig = Readonly<{
  apiUrl: string;
  apiToken: string;
  accountId: string;
  inboxId: string;
  appUrl: string;
  ssoSecret: string;
  webhookToken: string;
}>;

type TenantIntegrationEntity = Readonly<{
  id: TenantIntegrationId;
  tenantId: string;
  provider: IntegrationProvider;
  config: Readonly<Record<string, unknown>>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

function createTenantIntegrationId(rawValue: string): TenantIntegrationId {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error("TenantIntegrationId invalido: valor vazio.");
  }
  return trimmed as TenantIntegrationId;
}

function isChatwootConfig(
  config: Readonly<Record<string, unknown>>,
): config is ChatwootIntegrationConfig {
  return (
    typeof config.apiUrl === "string" &&
    typeof config.apiToken === "string" &&
    typeof config.accountId === "string" &&
    typeof config.inboxId === "string"
  );
}

export type {
  ChatwootIntegrationConfig,
  IntegrationProvider,
  TenantIntegrationEntity,
  TenantIntegrationId,
};
export { createTenantIntegrationId, isChatwootConfig };
