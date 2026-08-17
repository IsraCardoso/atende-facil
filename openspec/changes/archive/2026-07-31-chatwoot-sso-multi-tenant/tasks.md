## 1. Domínio

- [x] 1.1 Adicionar `platformToken?: string` a `ChatwootIntegrationConfig` (`apps/api/src/domain/integration-types.ts`)
- [x] 1.2 Adicionar type guard `isChatwootPlatformConfig` (exige `apiUrl`+`platformToken`+`accountId` não-vazios) no mesmo arquivo
- [x] 1.3 Adicionar `ChatwootPlatformPortResolver` em `domain/ports/chatwoot-platform-ports.ts` (padrão `ChatwootPortResolver`/`whatsapp-ports.ts` — domínio possui o TIPO do resolver, infra possui a factory que o produz; use case nunca importa infra)

## 2. Infraestrutura

- [x] 2.1 Criar `apps/api/src/infrastructure/chatwoot/chatwoot-platform-port-factory.ts`: `createChatwootPlatformPortFactory(deps)` — busca `tenant_integrations` (provider `chatwoot`) via `TenantIntegrationRepositoryPort`, valida com `isChatwootPlatformConfig`, cria `createChatwootPlatformAdapter`, cacheia por `tenantId` (mirror de `chatwoot-port-factory.ts`)
- [x] 2.2 Factory recebe `globalFallbackConfig?: ChatwootPlatformConfig` opcional — se config do tenant ausente/incompleta, usa o fallback; se nenhum dos dois, lança erro descritivo (mesmo padrão de `chatwoot-port-factory.ts`)
- [x] 2.3 Exportar a factory em `apps/api/src/infrastructure/chatwoot/index.ts`

## 3. Aplicação

- [x] 3.1 `GetChatwootSsoUrlUseCaseDependencies.chatwootPlatform` vira `resolveChatwootPlatform: ChatwootPlatformPortResolver` (`apps/api/src/application/use-cases/get-chatwoot-sso-url-use-case.ts`)
- [x] 3.2 `ensureChatwootUserId`/`execute` resolvem a instância via `await resolveChatwootPlatform(input.tenantId)` antes de chamar `createUser`/`addUserToAccount`/`createSsoUrl`
- [x] 3.3 Atualizar `get-chatwoot-sso-url-use-case.test.ts`: fakes de `chatwootPlatform` viram fakes de resolver (`async () => fakePort`); cobrir cenário de dois tenants resolvendo portas DIFERENTES

## 4. Wiring

- [x] 4.1 `apps/api/src/index.ts`: substituir a instância singleton por `createChatwootPlatformPortFactory({ integrationRepository: tenantIntegrationRepository, globalFallbackConfig: buildGlobalChatwootPlatformConfig(env) })` — master switch (feature habilitada/desabilitada) permanece a config global, igual ao comportamento anterior; a resolução por-tenant só entra em jogo quando a feature já está ligada
- [x] 4.2 Confirmar que `tenantIntegrationRepository` já injetado no módulo (mesmo usado por `createChatwootPortFactory`) é reaproveitado, sem instanciar um segundo repositório

## 5. Documentação

- [x] 5.1 `docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md`: remover o item "[BLOQUEANTE para deploy multi-tenant]" do Débito conhecido, com nota de resolução (data + referência a esta change)
- [x] 5.2 `docs/business-rules/RN-026-config-chatwoot-por-tenant.md`: R1 ganha `platformToken` na lista de campos; R5 passa a citar explicitamente a resolução do `ChatwootPlatformPort` de SSO, não só embed/deep-link
- [x] 5.3 `docs/changelog/CHANGELOG.md`: entrada nova em inglês em `[Não lançado]` (regra global de changelog: idioma sempre inglês, mesmo com histórico PT-BR no arquivo); débito de isolamento marcado `[x]` resolvido

## 6. Validação

- [x] 6.1 `bun test` no workspace `api` — 285 passed | 11 skipped (296)
- [x] 6.2 `bun run lint` (Biome) — 0 erros
- [x] 6.3 `tsc --noEmit` no workspace `api` — 0 erros
