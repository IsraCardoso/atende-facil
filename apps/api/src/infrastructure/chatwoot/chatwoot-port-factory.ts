/** Factory que resolve ChatwootPort per-tenant. Cache interno evita recriacao. Fallback para env global (RN-026). */

import { isChatwootConfig } from "../../domain/integration-types";
import type { TenantIntegrationRepositoryPort } from "../../domain/ports/integration-ports";
import type { ChatwootPort } from "../../domain/ports/whatsapp-ports";
import { type ChatwootHttpConfig, createChatwootHttpAdapter } from "./chatwoot-http-adapter";
import { createInMemoryChatwootAdapter } from "./in-memory-chatwoot-adapter";

type ChatwootPortFactoryDeps = Readonly<{
  integrationRepository: TenantIntegrationRepositoryPort;
  globalFallbackConfig?: ChatwootHttpConfig;
}>;

type ChatwootPortFactory = (tenantId: string) => Promise<ChatwootPort>;

/** Cria factory per-tenant de ChatwootPort. Busca config do tenant, com cache e fallback global. */
export function createChatwootPortFactory(deps: ChatwootPortFactoryDeps): ChatwootPortFactory {
  const cache = new Map<string, ChatwootPort>();

  return async (tenantId: string): Promise<ChatwootPort> => {
    const cached = cache.get(tenantId);
    if (cached) {
      return cached;
    }

    const integration = await deps.integrationRepository.findByTenantAndProvider(
      tenantId,
      "chatwoot",
    );

    if (integration && isChatwootConfig(integration.config)) {
      const port = createChatwootHttpAdapter({
        apiUrl: integration.config.apiUrl,
        apiToken: integration.config.apiToken,
        accountId: integration.config.accountId,
      });
      cache.set(tenantId, port);
      return port;
    }

    if (deps.globalFallbackConfig) {
      const port = createChatwootHttpAdapter(deps.globalFallbackConfig);
      cache.set(tenantId, port);
      return port;
    }

    const fallback = createInMemoryChatwootAdapter();
    cache.set(tenantId, fallback);
    return fallback;
  };
}

export type { ChatwootPortFactory, ChatwootPortFactoryDeps };
