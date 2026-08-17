## Context

`GetChatwootSsoUrlUseCase` recebe uma única instância de `ChatwootPlatformPort`, montada uma vez no bootstrap (`apps/api/src/index.ts:189`) a partir de env global (`CHATWOOT_API_URL`/`CHATWOOT_PLATFORM_TOKEN`/`CHATWOOT_ACCOUNT_ID`). Com `MULTI_TENANT=true`, todo tenant federa nessa MESMA conta — agentes de tenants diferentes enxergam conversas uns dos outros (RN-019, débito conhecido).

RN-026 já resolveu esse exato problema para `ChatwootPort` (mensageria): `chatwoot-port-factory.ts` busca `tenant_integrations` (provider `chatwoot`) e cacheia a instância por `tenantId`, com fallback para env global. O SSO federado (RN-019, redesenhado na Sprint 11 para usar a Platform API) nunca foi migrado para essa resolução.

O adapter (`chatwoot-platform-adapter.ts`) já é totalmente parametrizado (`apiUrl`/`platformToken`/`accountId` via config, não lidos de env diretamente) — o isolamento fura só no WIRING, não no adapter.

Não existe hoje endpoint HTTP de CRUD para `tenant_integrations` (RN-026 R6 marca isso como "futuro"); a config é escrita via `TenantIntegrationRepositoryPort.save` (script/seed/admin direto no banco). Isso é pré-existente e não faz parte do escopo desta change.

## Goals / Non-Goals

**Goals:**
- `GetChatwootSsoUrlUseCase` resolve `ChatwootPlatformPort` por `tenantId`, usando a config Chatwoot do PRÓPRIO tenant (mesma linha `tenant_integrations` que já alimenta a mensageria).
- Fallback para env global preservado — zero regressão em deployments single-tenant ou tenants ainda não migrados.
- Reusar o padrão de factory+cache já validado em `chatwoot-port-factory.ts`, não inventar um novo.

**Non-Goals:**
- CRUD HTTP para `tenant_integrations` (RN-026 R6, já documentado como futuro — fora desta change).
- Deprovisionamento/revogação de acesso (P0 separado, change `user-deprovisioning`).
- Invalidação de cache do factory ao rotacionar credenciais (limitação já aceita em `chatwoot-port-factory.ts`; ver Riscos).
- Encryption at rest de `platformToken` (RN-026 R6 já sinaliza como consideração futura para toda credencial Chatwoot, não introduzida nem revertida aqui).

## Decisions

**D1 — Reusar o campo de config existente (`ChatwootIntegrationConfig`), não um provider novo.**
Alternativa considerada: criar um segundo provider `chatwoot_platform` em `tenant_integrations`, separado do `chatwoot` de mensageria. Rejeitada: duplicaria `apiUrl`/`accountId` em duas linhas que precisam sempre apontar pro mesmo tenant/instância — um operador configurando os dois providers separadamente poderia (por engano) apontar o SSO pra uma instância Chatwoot diferente da usada no envio/recebimento. Uma única linha com `platformToken` opcional garante que `apiUrl`/`accountId` nunca divergem entre os dois usos por construção.

**D2 — Novo `createChatwootPlatformPortFactory`, não reaproveitar `createChatwootPortFactory`.**
Os dois portos (`ChatwootPort` de mensageria vs `ChatwootPlatformPort` de SSO) são adapters distintos com assinaturas distintas (`chatwoot-http-adapter.ts` vs `chatwoot-platform-adapter.ts`). Uma factory genérica que retornasse `unknown`/union quebraria a tipagem forte nos use cases consumidores. Duplicar a MESMA forma de factory (busca config → cria adapter → cacheia → fallback) é aceitável: são ~15 linhas, e generalizar agora criaria abstração para 2 usos só — ladder (ponytail) manda esperar um 3º caso antes de extrair.

**D3 — Guard de config exige `apiUrl`+`platformToken`+`accountId` presentes; se faltar QUALQUER um, cai no fallback global.**
Config parcial (ex.: `platformToken` ainda não migrado, só `apiUrl`/`accountId`/`apiToken` de mensageria) não deve tentar usar o Platform API com token errado — deve cair no MESMO comportamento de hoje (env global), igual R3 de RN-026.

**D4 — Cache do factory não invalida sozinho.**
Mesma limitação já aceita em `chatwoot-port-factory.ts` (comentário `// Cache interno evita recriacao`, sem TTL). Rotacionar `platformToken` de um tenant exige reiniciar o processo — não pior que o comportamento atual de `ChatwootPort`, e falha de SSO já degrada para deep-link sem derrubar a conversa (RN-019, seção Exceções).

## Risks / Trade-offs

- [Risco] Tenant configura `platformToken` incorreto ou expirado → `createUser`/`addUserToAccount`/`createSsoUrl` falha → **Mitigação**: já coberto pelo catch existente em `GetChatwootSsoUrlUseCase.execute` (RN-019: degrada pra deep-link, loga warn com `tenantId`+`correlationId`, nunca lança).
- [Risco] Cache do factory retém instância com token velho após rotação → **Mitigação**: nenhuma nesta change (D4); documentar como limitação conhecida, igual ao par de mensageria.
- [Risco] Tenant sem `platformToken` mas com env global ausente (`CHATWOOT_PLATFORM_TOKEN` não setado) → **Mitigação**: comportamento inalterado — hoje `getChatwootSsoUrl` já é `undefined` nesse caso (`index.ts:186`); a factory só entra em jogo quando o use case está habilitado.

## Migration Plan

- Sem migration de schema (JSONB).
- Deploy: código sobe com fallback ativo — nenhum tenant existente muda de comportamento até ganhar uma linha `tenant_integrations` com `platformToken`.
- Habilitar per-tenant: inserir/atualizar a linha `tenant_integrations` (provider `chatwoot`) via `TenantIntegrationRepositoryPort.save` incluindo `platformToken`, apontando pra MESMA `apiUrl`/`accountId` já usada na mensageria do tenant.
- Rollback: reverter o wiring em `index.ts` para a instância singleton (revert do commit) — sem estado a desfazer.
