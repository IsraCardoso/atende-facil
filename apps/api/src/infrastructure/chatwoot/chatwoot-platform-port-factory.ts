/** Factory que resolve ChatwootPlatformPort per-tenant. Cache interno evita recriacao. Fallback para env global (RN-026 R5 + RN-019). */

import { isChatwootPlatformConfig } from "../../domain/integration-types";
import type { ChatwootPlatformPort } from "../../domain/ports/chatwoot-platform-ports";
import type { TenantIntegrationRepositoryPort } from "../../domain/ports/integration-ports";
import {
  type ChatwootPlatformConfig,
  createChatwootPlatformAdapter,
} from "./chatwoot-platform-adapter";

type ChatwootPlatformPortFactoryDeps = Readonly<{
  integrationRepository: TenantIntegrationRepositoryPort;
  globalFallbackConfig?: ChatwootPlatformConfig;
}>;

type ChatwootPlatformPortFactory = (tenantId: string) => Promise<ChatwootPlatformPort>;

/** Cria factory per-tenant de ChatwootPlatformPort. Busca config do tenant, com cache e fallback global. */
export function createChatwootPlatformPortFactory(
  deps: ChatwootPlatformPortFactoryDeps,
): ChatwootPlatformPortFactory {
  const cache = new Map<string, ChatwootPlatformPort>();

  return async (tenantId: string): Promise<ChatwootPlatformPort> => {
    const cached = cache.get(tenantId);
    if (cached) {
      return cached;
    }

    let integration = null;
    let lookupFailed = false;
    try {
      integration = await deps.integrationRepository.findByTenantAndProvider(tenantId, "chatwoot");
    } catch {
      lookupFailed = true;
    }

    if (integration && isChatwootPlatformConfig(integration.config)) {
      const port = createChatwootPlatformAdapter({
        apiUrl: integration.config.apiUrl,
        platformToken: integration.config.platformToken,
        accountId: integration.config.accountId,
      });
      cache.set(tenantId, port);
      return port;
    }

    if (deps.globalFallbackConfig) {
      const port = createChatwootPlatformAdapter(deps.globalFallbackConfig);
      // Nao cacheia quando o lookup FALHOU (erro transiente de DB): cachear aqui
      // congelaria o tenant no fallback global ate reiniciar o processo, mesmo
      // que ele tenha platformToken proprio (reintroduz o isolamento furado que
      // esta factory existe pra resolver). "Nao configurado" (lookup OK, null)
      // continua cacheavel normalmente.
      if (!lookupFailed) {
        cache.set(tenantId, port);
      }
      return port;
    }

    throw new Error(
      `Chatwoot Platform API não configurado para o tenant ${tenantId}. Configure tenant_integrations (platformToken) ou variáveis CHATWOOT_PLATFORM_*.`,
    );
  };
}

export type { ChatwootPlatformPortFactory, ChatwootPlatformPortFactoryDeps };
