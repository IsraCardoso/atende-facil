## Why

O SSO federado do Chatwoot (RN-019) resolve o `ChatwootPlatformPort` a partir de credenciais globais (`CHATWOOT_PLATFORM_TOKEN`/conta padrão), mesmo com `MULTI_TENANT=true`. RN-026 já resolve `ChatwootPort` (mensageria) per-tenant via `chatwoot-port-factory.ts`, mas o fluxo de emissão de SSO nunca foi migrado para essa resolução. Resultado: agentes de tenants diferentes federam na MESMA conta Chatwoot e enxergam conversas uns dos outros — bloqueante documentado em RN-019 para qualquer deploy multi-tenant.

## What Changes

- `ChatwootIntegrationConfig` (domínio) ganha campo opcional `platformToken` — o Platform App token já é distinto do `apiToken` de mensageria (comentário em `chatwoot-platform-adapter.ts:5`), só nunca teve onde morar per-tenant.
- Novo `createChatwootPlatformPortFactory` (`apps/api/src/infrastructure/chatwoot/`), espelhando `chatwoot-port-factory.ts`: resolve `ChatwootPlatformPort` por `tenantId` a partir de `tenant_integrations` (provider `chatwoot`, campos `apiUrl`+`platformToken`+`accountId`), com fallback para env global (`CHATWOOT_PLATFORM_TOKEN`/`CHATWOOT_APP_URL`/`CHATWOOT_ACCOUNT_ID`) quando o tenant não tem config própria — mesmo padrão R3 de RN-026. **Nenhuma mudança no adapter nem no `ChatwootPlatformPort`**: `createChatwootPlatformAdapter` já recebe `apiUrl`/`platformToken`/`accountId` por parâmetro (não por env direto) — o bug está só no WIRING (`index.ts` monta uma única instância no bootstrap com env global e injeta como singleton).
- `GetChatwootSsoUrlUseCase` passa a receber a factory per-tenant em vez de uma instância singleton de `ChatwootPlatformPort`; resolve a instância certa usando `input.tenantId` (campo já existente no use case).
- Wiring em `apps/api/src/index.ts` troca a instância singleton pela factory.
- **BREAKING** (interno): assinatura de `GetChatwootSsoUrlUseCaseDependencies.chatwootPlatform` muda de `ChatwootPlatformPort` para `ChatwootPlatformPortFactory`.
- Atualiza `docs/business-rules/RN-019` (remove o débito de isolamento), `RN-026` (R1 ganha `platformToken`; R5 passa a cobrir explicitamente o fluxo Platform API SSO).

### Modified Capabilities
- `chatwoot-integration`: requirement RN-019 muda de "conta Chatwoot global" para "conta resolvida per-tenant"; requirement RN-026 (R5) passa a cobrir também a emissão de SSO via Platform API, não só embed/deep-link.

## Impact

- `apps/api/src/application/use-cases/get-chatwoot-sso-url-use-case.ts`
- `apps/api/src/domain/ports/chatwoot-platform-ports.ts`
- `apps/api/src/infrastructure/chatwoot/chatwoot-platform-port-factory.ts` (novo)
- `apps/api/src/infrastructure/chatwoot/chatwoot-platform-adapter.ts` (sem mudança — já parametrizado)
- `apps/api/src/domain/integration-types.ts` (`ChatwootIntegrationConfig.platformToken`)
- `apps/api/src/infrastructure/chatwoot/index.ts`, `apps/api/src/index.ts` (wiring)
- `docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md`, `RN-026-config-chatwoot-por-tenant.md`
- `openspec/specs/chatwoot-integration/spec.md` (delta)
- Sem migration de schema: `tenant_integrations.config` é JSONB — `platformToken` é campo novo opcional, `accountId` já existe (RN-026 R1)
