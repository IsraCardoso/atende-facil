# Sprint 09 — Resolucao de Debitos Tecnicos (Expandida)

> **Periodo:** 07/04 ate 21/04 | **Status:** `Em andamento`

---

# GESTAO

## Objetivo da Sprint

> *O sistema deixa de usar repositorios in-memory em runtime, ganha seguranca real (JWT no WebSocket, rate limiting), config Chatwoot por tenant, consistencia session/conversation, cache de flow ativo em Valkey, worker basico funcional e primeiros testes de integracao com Testcontainers.*

Resolver todos os debitos tecnicos de Categoria 1 (Critico), 2 (Alto) e 3 (Medio) acumulados das Sprints 01 a 08, garantindo que o sistema esteja pronto para deploy real.

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Repos Drizzle para Auth | Tenant, User e Membership persistem no PostgreSQL |
| 2 | Repos Drizzle para WhatsApp/Conversations | Session, Instance e Conversation persistem no PostgreSQL |
| 3 | Flow module conectado ao DB real | `createFlowModule({ db })` injeta DrizzleFlowRepository |
| 4 | WebSocket autenticado via JWT | Conexao rejeitada sem token valido |
| 5 | Rate limiting em rotas publicas | Endpoints de auth, webhooks e flow limitados |
| 6 | Validacao HTTP nas rotas de flow | Body validation com schema Elysia |
| 7 | Config Chatwoot por tenant | Cada tenant tem suas proprias credenciais Chatwoot |
| 8 | Sync session.mode / conversation.status | Servico transacional garante consistencia |
| 9 | Cache de flow ativo em Valkey | findActiveByTenant usa cache com invalidacao |
| 10 | Worker app basico | BullMQ + consumer pattern + health check |
| 11 | Testes de integracao com Testcontainers | Pelo menos 2 repos testados contra PostgreSQL real |
| 12 | Testes unitarios faltantes | 3 use cases cobertos |

---

## Regras de Negocio desta Sprint

- [RN-024 — Persistencia Drizzle obrigatoria para repositorios](../business-rules/RN-024-persistencia-drizzle-obrigatoria.md)
- [RN-025 — Seguranca de transporte e rate limiting](../business-rules/RN-025-seguranca-transporte-rate-limiting.md)
- [RN-026 — Config Chatwoot por tenant](../business-rules/RN-026-config-chatwoot-por-tenant.md)

---

## Fora do Escopo

- Extracao de hooks do `flow-editor.tsx`
- PUT/DELETE no `createApiClient` generico
- Cobertura automatizada no CI
- Frontend: testes de hooks e testes UI significativos
- Mapear `assignedTo` para userId interno (feature futura)

---

## Metricas de Sucesso

- [ ] Zero repositorios in-memory no bootstrap de producao
- [ ] WebSocket autenticado via JWT
- [ ] Rate limiting em rotas publicas
- [ ] Config Chatwoot por tenant persistida em DB
- [ ] session.mode e conversation.status sincronizados via servico transacional
- [ ] Cache Valkey para flow ativo com invalidacao
- [ ] Worker app com bootstrap funcional e consumer pattern
- [ ] Pelo menos 2 testes de integracao com Testcontainers rodando
- [ ] Todos os use cases com cobertura unitaria
- [ ] Lint, build e testes passando

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez. Apos cada set, apresente o checkpoint e aguarde instrucao do usuario.
> **Eficiencia de contexto:** Quando houver docs longas, logs ou multiplos arquivos grandes, usar `dont-be-greedy` para leitura incremental antes de expandir analise.

---

## Plano de Execucao

```
Rodada 1: [SET-A: Repos Drizzle Auth]
Rodada 2: [SET-B: Repos Drizzle WhatsApp/Conversation/Flow]
Rodada 3: [SET-C: Seguranca]
Rodada 4: [SET-D: Chatwoot per-tenant + Sync session/conversation]
Rodada 5: [SET-E: Valkey Flow Cache + Worker]
Rodada 6: [SET-F: Testes + Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03, T04, T05 | — | — |
| SET-B | T06, T07, T08, T09, T10, T11, T12 | SET-A | — |
| SET-C | T13, T14, T15, T16 | SET-B | — |
| SET-D | T17, T18, T19, T20, T21, T22, T23, T24, T25, T26, T27 | SET-B | — |
| SET-E | T28, T29, T30, T31, T32, T33, T34, T35, T36 | SET-B | — |
| SET-F | T37, T38, T39, T40, T41, T42, T43 | SET-C, SET-D, SET-E | — |

---

## SET-A — Repos Drizzle para Auth

> **Escopo estimado:** ~400 linhas | **Complexidade:** Media
> **Racional:** Substituir os 3 repositorios in-memory de auth por implementacoes Drizzle persistentes.

---

### T01 — DrizzleTenantRepository

**Contexto:** `TenantRepositoryPort` (create, findById, findBySlug) esta implementado apenas em in-memory. Dados de tenants se perdem a cada restart.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-tenant-repository.ts`
- [ ] Implementar `TenantRepositoryPort`: `create`, `findById`, `findBySlug`
- [ ] Usar `tenantsTable` do schema `packages/db`
- [ ] Mapear entre schema DB e `TenantEntity` do domain

**Criterios de Aceite:**
- [ ] Implementa todos os metodos de `TenantRepositoryPort`
- [ ] Mapeia corretamente entre colunas DB e campos da entidade
- [ ] Usa `eq()` e filtros Drizzle type-safe

**Notas tecnicas:**
> Referencia: `DrizzleFlowRepository` em `apps/api/src/infrastructure/repositories/drizzle-flow-repository.ts` como padrao a seguir. Mappers devem ser funcoes puras separadas.

---

### T02 — DrizzleUserRepository

**Contexto:** `UserRepositoryPort` (create, findById, findByEmail) esta in-memory. Usuarios cadastrados desaparecem ao reiniciar.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-user-repository.ts`
- [ ] Implementar `UserRepositoryPort`: `create`, `findById`, `findByEmail`
- [ ] Usar `usersTable` do schema `packages/db`

**Criterios de Aceite:**
- [ ] Implementa todos os metodos de `UserRepositoryPort`
- [ ] `findByEmail` usa o indice unique na coluna `email`
- [ ] Mapeia `passwordHash`, `isActive` corretamente

---

### T03 — DrizzleMembershipRepository

**Contexto:** `MembershipRepositoryPort` (create, findByUserAndTenant, listByUserId) esta in-memory. Vinculos tenant-usuario nao persistem.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-membership-repository.ts`
- [ ] Implementar `MembershipRepositoryPort`: `create`, `findByUserAndTenant`, `listByUserId`
- [ ] Usar `tenantMembershipsTable` do schema `packages/db`

**Criterios de Aceite:**
- [ ] Implementa todos os metodos de `MembershipRepositoryPort`
- [ ] `findByUserAndTenant` usa indice unique composto `(tenantId, userId)`
- [ ] `listByUserId` retorna array readonly

---

### T04 — Wiring Drizzle no DI de Auth

**Contexto:** `create-auth-module.ts` registra `createInMemoryAuthRepositories()` incondicionalmente. Precisa usar Drizzle quando `db` estiver disponivel.

**O que fazer:**
- [ ] Alterar `CreateAuthModuleInput` para aceitar `db` opcional
- [ ] Quando `db` presente: registrar repos Drizzle (tenant, user, membership)
- [ ] Quando `db` ausente: manter in-memory (testes e dev sem DB)
- [ ] Atualizar `apps/api/src/index.ts` para passar `db` ao criar auth module

**Criterios de Aceite:**
- [ ] Com `DATABASE_URL` configurado, auth usa repos Drizzle
- [ ] Sem `DATABASE_URL`, auth continua funcionando com in-memory
- [ ] Bootstrap nao quebra em nenhum dos cenarios

**Notas tecnicas:**
> Padrao: condicional no wiring do DI, nao no repositorio. O repositorio Drizzle sempre recebe `db` no construtor. Referencia: `create-flow-module.ts` que ja aceita `db` opcional.

---

### T05 — Testes unitarios dos repos Auth

**Contexto:** Garantir que os 3 repos Drizzle seguem o contrato do port com port contract tests.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-auth-repositories.test.ts`
- [ ] Testar cada metodo de cada repo usando mocks de Drizzle DB
- [ ] Validar mapeamento entity <-> schema

**Criterios de Aceite:**
- [ ] Cada metodo de cada port tem pelo menos 1 teste de sucesso e 1 de caso nao encontrado
- [ ] Testes passam com `bun run test`

---

## SET-B — Repos Drizzle para Sessions, Instances, Conversations + Flow Wiring

> **Escopo estimado:** ~500 linhas | **Complexidade:** Alta
> **Racional:** Substituir os repos in-memory do dominio WhatsApp e Conversations, conectar FlowModule ao DB real e resolver duplicacao de FlowRepositoryPort.

---

### T06 — DrizzleSessionRepository

**Contexto:** `SessionRepositoryPort` (findByTenantAndPhone, save, updateMode) esta in-memory. Sessoes de conversa se perdem a cada restart.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-session-repository.ts`
- [ ] Implementar `SessionRepositoryPort`: `findByTenantAndPhone`, `save`, `updateMode`
- [ ] Usar `sessionsTable` do schema com colunas: `mode`, `currentNodeId`, `data` (JSONB), `flowId`, `chatwootConversationId`
- [ ] `save` deve fazer upsert (insert or update) baseado em `(tenantId, phone)` unique

**Criterios de Aceite:**
- [ ] Implementa todos os metodos de `SessionRepositoryPort`
- [ ] `findByTenantAndPhone` usa indice unique `(tenant_id, phone)`
- [ ] `save` persiste campos JSONB `data` corretamente
- [ ] `updateMode` atualiza `mode` e opcionalmente `chatwootConversationId`

---

### T07 — DrizzleWhatsAppInstanceRepository

**Contexto:** `WhatsAppInstanceRepositoryPort` (findByTenantAndId, findActiveByTenant) esta in-memory com um `seedInstance` extra.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-whatsapp-instance-repository.ts`
- [ ] Implementar `WhatsAppInstanceRepositoryPort`: `findByTenantAndId`, `findActiveByTenant`
- [ ] Verificar se tabela `whatsapp_instances` existe no schema; se nao, criar migration

**Criterios de Aceite:**
- [ ] Implementa os 2 metodos do port
- [ ] `findActiveByTenant` filtra por `tenantId` e retorna array readonly
- [ ] Schema DB alinhado com `WhatsAppInstanceEntity`

**Notas tecnicas:**
> Verificar se `packages/db/src/schema/` ja tem uma tabela para instances. Se nao existir, criar schema + migration como parte desta task.

---

### T08 — DrizzleConversationRepository

**Contexto:** `ConversationRepositoryPort` (7 metodos) esta in-memory. Conversations nao persistem.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-conversation-repository.ts`
- [ ] Implementar todos os 7 metodos: `findById`, `findBySessionId`, `findByChatwootConversationId`, `findByTenantAndStatus`, `findByTenantPaginated`, `save`, `updateStatus`
- [ ] `findByTenantPaginated` deve usar `count()` + `offset/limit` para paginacao
- [ ] `updateStatus` deve atualizar `status` e opcionalmente `assignedTo`

**Criterios de Aceite:**
- [ ] Todos os 7 metodos implementados
- [ ] Paginacao funciona com count total correto
- [ ] Filtro por `status` na paginacao e opcional

**Notas tecnicas:**
> Referencia de paginacao: `DrizzleFlowRepository.findByTenantPaginated`. Usar `and()`, `eq()`, `isNull()` do Drizzle centralizado em `packages/db`.

---

### T09 — Wiring Drizzle no WhatsApp e Conversation modules

**Contexto:** `create-whatsapp-module.ts` e `create-conversation-module.ts` registram in-memory incondicionalmente.

**O que fazer:**
- [ ] Alterar `CreateWhatsAppModuleInput` para aceitar `db` opcional
- [ ] Quando `db` presente: registrar `DrizzleSessionRepository`, `DrizzleWhatsAppInstanceRepository`
- [ ] Alterar `CreateConversationModuleInput` para aceitar `db` opcional
- [ ] Quando `db` presente: registrar `DrizzleConversationRepository`
- [ ] Atualizar `apps/api/src/index.ts` para passar `db` a ambos os modules

**Criterios de Aceite:**
- [ ] Com `DATABASE_URL`, repos Drizzle sao injetados
- [ ] Sem `DATABASE_URL`, in-memory continua funcionando
- [ ] Todos os use cases continuam recebendo as dependencias corretas

---

### T10 — Conectar FlowModule ao DB real

**Contexto:** `apps/api/src/index.ts` chama `createFlowModule({})` sem passar `db`, forçando o in-memory.

**O que fazer:**
- [ ] Alterar bootstrap para `createFlowModule({ db })` quando `db` disponivel
- [ ] Verificar que `DrizzleFlowRepository` e usado corretamente

**Criterios de Aceite:**
- [ ] Flow CRUD persiste no PostgreSQL quando `DATABASE_URL` esta configurado
- [ ] Testes existentes de flow use cases continuam passando (usam in-memory)

---

### T11 — Resolver FlowRepositoryPort duplicado

**Contexto:** `whatsapp-ports.ts` define um `FlowRepositoryPort` simplificado (so `findActiveByTenant`) enquanto `flow-ports.ts` define o completo. O whatsapp module usa um stub que sempre retorna `null`.

**O que fazer:**
- [ ] Unificar: whatsapp module deve usar o FlowRepositoryPort de `flow-ports.ts` (ou receber apenas `findActiveByTenant` via interface narrow)
- [ ] Remover ou marcar como deprecated o `FlowRepositoryPort` duplicado em `whatsapp-ports.ts`
- [ ] Conectar o `processIncomingMessage` ao repo de flow real (via DI do whatsapp module)

**Criterios de Aceite:**
- [ ] Apenas 1 definicao de FlowRepositoryPort no codebase (ou 1 narrow + 1 full com heranca)
- [ ] `processIncomingMessage` consegue carregar o flow ativo do tenant

---

### T12 — Testes unitarios dos repos WhatsApp/Conversation

**Contexto:** Garantir que os repos Drizzle seguem contratos dos ports.

**O que fazer:**
- [ ] Criar testes para `DrizzleSessionRepository`
- [ ] Criar testes para `DrizzleConversationRepository`
- [ ] Criar testes para `DrizzleWhatsAppInstanceRepository`

**Criterios de Aceite:**
- [ ] Cada metodo de cada port tem pelo menos 1 teste
- [ ] Testes passam com `bun run test`

---

## SET-C — Seguranca: WebSocket JWT + Rate Limiting + Validacao HTTP

> **Escopo estimado:** ~350 linhas | **Complexidade:** Media
> **Racional:** Fechar vulnerabilidades de seguranca identificadas: WebSocket aberto, zero throttling, validacao fraca.

---

### T13 — JWT no handshake do WebSocket

**Contexto:** WebSocket em `ws /ws/conversations` extrai `tenantId` da query string sem autenticacao. Qualquer pessoa pode se conectar.

**O que fazer:**
- [ ] Extrair token JWT do header `Authorization` ou query param `token` no upgrade request
- [ ] Validar token usando `AuthTokenPort.verify`
- [ ] Extrair `tenantId` do payload JWT (nao da query string)
- [ ] Rejeitar conexao com close code 4401 se token invalido/ausente
- [ ] Atualizar `ConnectionManager` para usar tenantId do token

**Criterios de Aceite:**
- [ ] Conexao sem token: rejeitada com code 4401
- [ ] Conexao com token invalido: rejeitada com code 4401
- [ ] Conexao com token valido: aceita, tenantId extraido do JWT
- [ ] Broadcasts continuam isolados por tenant

**Notas tecnicas:**
> Elysia WebSocket tem acesso ao request no handler `open`. Usar `request.headers.get('authorization')` ou `query.token`. `AuthTokenPort.verify` retorna `JwtTokenClaims` com `tenantId`.

---

### T14 — Rate limiting middleware

**Contexto:** Nenhum endpoint tem throttling. Vulneravel a brute force e DDoS basico.

**O que fazer:**
- [ ] Criar middleware rate limiter (sliding window ou fixed window) usando `CachePort` (Valkey em prod, in-memory em dev)
- [ ] Aplicar em rotas: POST /auth/login (5 req/min), POST /webhook/* (100 req/min), rotas de flow CRUD (30 req/min)
- [ ] Retornar HTTP 429 com header `Retry-After`

**Criterios de Aceite:**
- [ ] Login: bloqueado apos 5 tentativas em 1 minuto
- [ ] Webhook: bloqueado apos 100 requests em 1 minuto
- [ ] Resposta 429 inclui `Retry-After`

**Notas tecnicas:**
> Implementar como Elysia plugin (`onBeforeHandle`). Chave do rate limit: `rl:{route}:{ip}`. Usar `CachePort.set` com TTL = janela. Contador via `get` + `set` atomicos.

---

### T15 — Validacao de input nas rotas de flow

**Contexto:** Rotas de flow aceitam body sem validacao de schema. Dados invalidos chegam aos use cases.

**O que fazer:**
- [ ] Adicionar `body` validation com `t.Object()` do Elysia (TypeBox) nas rotas: POST /flows (create), PUT /flows/:id (update definition)
- [ ] Validar campos obrigatorios: `name` (string), `definition` (objeto com `nodes` e `edges`)
- [ ] Retornar 400 com mensagem descritiva para body invalido

**Criterios de Aceite:**
- [ ] POST /flows sem `name`: retorna 400
- [ ] PUT /flows/:id com `definition` invalido: retorna 400
- [ ] Requests validos continuam funcionando normalmente

---

### T16 — Testes de seguranca

**Contexto:** Validar que as protecoes funcionam corretamente.

**O que fazer:**
- [ ] Teste: WebSocket rejeita conexao sem JWT
- [ ] Teste: WebSocket aceita conexao com JWT valido
- [ ] Teste: rate limiter bloqueia apos exceder limite
- [ ] Teste: rate limiter permite requests dentro do limite

**Criterios de Aceite:**
- [ ] Todos os testes passam
- [ ] Cobertura dos cenarios criticos de seguranca

---

## SET-D — Chatwoot per-tenant + Sync session/conversation

> **Escopo estimado:** ~500 linhas | **Complexidade:** Alta
> **Racional:** Migrar config Chatwoot de global para per-tenant e garantir consistencia entre session.mode e conversation.status.

---

### T17 — Tabela tenant_integrations

**Contexto:** Config Chatwoot esta em variaveis de ambiente globais. Cada tenant precisa de suas proprias credenciais.

**O que fazer:**
- [ ] Criar schema `packages/db/src/schema/tenant-integrations.ts` com colunas: `id`, `tenantId` (FK), `provider` (varchar, ex: "chatwoot"), `config` (JSONB — apiUrl, apiToken, accountId, appUrl, ssoSecret, webhookToken), `isActive` (boolean), `createdAt`, `updatedAt`
- [ ] Criar migration Drizzle
- [ ] Exportar no barrel `packages/db/src/schema/index.ts`

**Criterios de Aceite:**
- [ ] Tabela criada com FK para tenants
- [ ] Indice unique em `(tenant_id, provider)`
- [ ] Migration executa sem erros

**Notas tecnicas:**
> Usar JSONB para config permite flexibilidade para futuras integracoes (Evolution API config, etc.) sem novas migrations. Campos sensiveis (apiToken, ssoSecret) ficam no JSONB — em producao, considerar encryption at rest.

---

### T18 — TenantIntegrationConfigPort + DrizzleRepository

**Contexto:** Dominio precisa de um port para acessar configs de integracao por tenant.

**O que fazer:**
- [ ] Criar `TenantIntegrationConfigPort` em `apps/api/src/domain/ports/` com metodos: `findByTenantAndProvider(tenantId, provider)`, `save(config)`
- [ ] Criar tipo `TenantIntegrationEntity` no domain
- [ ] Criar `DrizzleTenantIntegrationRepository` em `apps/api/src/infrastructure/repositories/`
- [ ] Criar `InMemoryTenantIntegrationRepository` para testes

**Criterios de Aceite:**
- [ ] Port definido sem dependencia de infraestrutura
- [ ] Drizzle repo implementa todos os metodos
- [ ] In-memory repo disponivel para testes

---

### T19 — Factory getChatwootPortForTenant

**Contexto:** Atualmente `ChatwootPort` e um singleton global (in-memory). Precisa resolver per-tenant.

**O que fazer:**
- [ ] Criar factory `createChatwootPortFactory` que recebe `TenantIntegrationConfigPort` e retorna `(tenantId) => ChatwootPort`
- [ ] Internamente: busca config do tenant, cria `ChatwootHttpAdapter` com credenciais do tenant
- [ ] Cache interno por tenantId para evitar recriacao a cada chamada
- [ ] Fallback: se tenant nao tem config, usar variaveis de ambiente globais (compatibilidade)

**Criterios de Aceite:**
- [ ] Tenants com config propria: usa credenciais do tenant
- [ ] Tenants sem config: fallback para env global
- [ ] Cache evita instanciar adapter repetidamente

---

### T20 — Refatorar modules para factory Chatwoot

**Contexto:** `createWhatsAppModule` e `createConversationModule` usam singleton `ChatwootPort`. Precisam usar factory per-tenant.

**O que fazer:**
- [ ] Alterar `createWhatsAppModule` para receber `chatwootPortFactory: (tenantId) => ChatwootPort` ao inves de `ChatwootPort` singleton
- [ ] Alterar `processIncomingMessageUseCase` para resolver `ChatwootPort` via factory usando `tenantId` da mensagem
- [ ] Alterar `createConversationModule` para receber factory e propaga-la para use cases
- [ ] Atualizar bootstrap em `index.ts`

**Criterios de Aceite:**
- [ ] Use cases resolvem ChatwootPort per-tenant
- [ ] Bootstrap funciona com e sem config de integracao

---

### T21 — Webhook Chatwoot per-tenant

**Contexto:** `chatwoot-webhook-routes.ts` valida um unico `webhookToken` global. Precisa validar per-tenant.

**O que fazer:**
- [ ] Extrair `tenantId` do payload Chatwoot (via `custom_attributes.tenant_id` que o adapter ja envia)
- [ ] Buscar config do tenant via `TenantIntegrationConfigPort`
- [ ] Validar `webhookToken` contra o token do tenant
- [ ] Fallback: se tenant nao tem config, usar token global do env

**Criterios de Aceite:**
- [ ] Webhook com token do tenant correto: processado
- [ ] Webhook com token incorreto: rejeitado 401
- [ ] Webhook sem custom_attributes.tenant_id: usa token global (compatibilidade)

---

### T22 — ChatwootAccessService per-tenant

**Contexto:** `ChatwootAccessService` usa `ChatwootAccessConfig` fixa do env. Precisa carregar config do tenant.

**O que fazer:**
- [ ] Refatorar `createChatwootAccessService` para aceitar `TenantIntegrationConfigPort`
- [ ] Metodo `generateAccessUrl` deve buscar config do tenant (appUrl, ssoSecret, accountId)
- [ ] Fallback para env global se tenant sem config

**Criterios de Aceite:**
- [ ] Tenant com config: URLs geradas com dados do tenant
- [ ] Tenant sem config: URLs geradas com dados globais
- [ ] HMAC gerado corretamente com ssoSecret do tenant

---

### T23 — ConversationSessionSyncService

**Contexto:** `session.mode` e `conversation.status` sao atualizados separadamente em varios use cases, com risco de divergencia.

**O que fazer:**
- [ ] Criar `ConversationSessionSyncService` em `apps/api/src/application/services/`
- [ ] Metodo `syncModeAndStatus({ tenantId, sessionId, conversationId, newMode, assignedTo?, chatwootConversationId? })`: atualiza `session.mode` e `conversation.status` em sequencia garantida
- [ ] Aceita `SessionRepositoryPort` e `ConversationRepositoryPort` como dependencias

**Criterios de Aceite:**
- [ ] Um unico ponto de atualizacao para ambos os campos
- [ ] Ambos os campos ficam consistentes apos cada chamada
- [ ] Servico e testavel isoladamente com mocks

**Notas tecnicas:**
> Sem transacao SQL real por enquanto (repos podem ser in-memory em testes). A consistencia e garantida pela sequencia: atualizar session primeiro, depois conversation. Se conversation falhar, o proximo processamento detecta e corrige.

---

### T24 — Refatorar ProcessIncomingMessage.handleHandoff

**Contexto:** `handleHandoff` atualiza `session.mode` e `conversation.status` separadamente.

**O que fazer:**
- [ ] Injetar `ConversationSessionSyncService` no use case
- [ ] Substituir chamadas separadas a `sessionRepository.updateMode` e `conversationRepository.updateStatus` por `syncService.syncModeAndStatus`
- [ ] Remover logica duplicada de atualizacao

**Criterios de Aceite:**
- [ ] Handoff usa sync service
- [ ] Testes existentes continuam passando
- [ ] `chatwootConversationId` ainda e propagado corretamente

---

### T25 — Refatorar Assign e Close conversation

**Contexto:** `AssignConversationUseCase` e `CloseConversationUseCase` tambem atualizam session.mode e conversation.status separadamente.

**O que fazer:**
- [ ] Injetar `ConversationSessionSyncService` em ambos
- [ ] Usar `syncService.syncModeAndStatus` para transicoes
- [ ] `CloseConversation`: sync mode para "bot", resetar session

**Criterios de Aceite:**
- [ ] Ambos use cases usam sync service
- [ ] Transicoes de estado continuam validadas por `isValidTransition`
- [ ] Testes existentes continuam passando

---

### T26 — Remover chatwootConversationId da tabela sessions

**Contexto:** `chatwootConversationId` existe em `sessions` e `conversations`. Source of truth deve ser `conversations`.

**O que fazer:**
- [ ] Criar migration Drizzle para dropar coluna `chatwoot_conversation_id` de `sessions`
- [ ] Atualizar schema `packages/db/src/schema/sessions.ts`
- [ ] Atualizar `SessionEntity` no domain (remover campo)
- [ ] Atualizar `SessionRepositoryPort.updateMode` para nao aceitar mais `chatwootConversationId`
- [ ] Atualizar todos os chamadores de `updateMode` para propagar chatwootConversationId via conversation, nao session
- [ ] Atualizar `ConversationSessionSyncService` para escrever chatwootConversationId apenas em conversations

**Criterios de Aceite:**
- [ ] Coluna removida do schema e da migration
- [ ] Nenhuma referencia a `session.chatwootConversationId` no codigo
- [ ] `conversations.chatwootConversationId` e o unico source of truth
- [ ] Testes atualizados e passando

---

### T27 — Testes do sync service e adaptacao

**Contexto:** Garantir que a unificacao funciona e os testes existentes continuam validos.

**O que fazer:**
- [ ] Testes unitarios do `ConversationSessionSyncService`
- [ ] Adaptar testes de `ProcessIncomingMessageUseCase` para usar sync service
- [ ] Adaptar testes de `AssignConversationUseCase` e `CloseConversationUseCase`

**Criterios de Aceite:**
- [ ] Sync service testado com todos os cenarios de transicao
- [ ] Todos os testes existentes continuam passando (com adaptacoes)
- [ ] Zero regressoes

---

## SET-E — Valkey Flow Cache + Worker Infra

> **Escopo estimado:** ~400 linhas | **Complexidade:** Media
> **Racional:** Otimizar carregamento de flow ativo com cache Valkey e criar infraestrutura basica do worker app.

---

### T28 — CachedFlowRepository (decorator)

**Contexto:** `findActiveByTenant` faz query no PostgreSQL a cada mensagem. Flow ativo muda raramente — candidato ideal para cache.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/cached-flow-repository.ts`
- [ ] Implementar como decorator sobre `FlowRepositoryPort`
- [ ] `findActiveByTenant`: buscar em `CachePort` primeiro (chave: `flow:active:{tenantId}`), fallback para repo real, armazenar com TTL configuravel (default 5 min)
- [ ] Demais metodos: delegate direto ao repo real (sem cache)

**Criterios de Aceite:**
- [ ] Cache hit: retorna do Valkey sem query DB
- [ ] Cache miss: busca no DB e armazena no cache
- [ ] TTL configuravel via parametro
- [ ] Metodos de escrita delegam diretamente

**Notas tecnicas:**
> Decorator pattern: `CachedFlowRepository` recebe `FlowRepositoryPort` e `CachePort` no construtor. Implementa `FlowRepositoryPort`. Apenas `findActiveByTenant` usa cache.

---

### T29 — Invalidacao de cache ao mudar status

**Contexto:** Quando um flow e ativado/desativado, o cache deve ser invalidado para o tenant.

**O que fazer:**
- [ ] Alterar `ActivateFlowUseCase` para limpar cache apos ativacao: `cachePort.delete('flow:active:{tenantId}')`
- [ ] Alterar `DeactivateFlowUseCase` para limpar cache apos desativacao
- [ ] Injetar `CachePort` nos use cases via DI

**Criterios de Aceite:**
- [ ] Apos ativar flow: cache invalidado
- [ ] Apos desativar flow: cache invalidado
- [ ] Proxima chamada a `findActiveByTenant` busca do DB

---

### T30 — Wiring CachedFlowRepository no DI

**Contexto:** Conectar o decorator no DI module de flow.

**O que fazer:**
- [ ] Alterar `create-flow-module.ts` para envolver `DrizzleFlowRepository` com `CachedFlowRepository` quando `cachePort` disponivel
- [ ] Passar `CachePort` do Valkey (ou in-memory) como dependencia
- [ ] Atualizar bootstrap em `index.ts`

**Criterios de Aceite:**
- [ ] Com Valkey disponivel: cache ativo
- [ ] Sem Valkey: repo Drizzle direto (sem decorator)
- [ ] Nenhuma mudanca na interface publica do flow module

---

### T31 — Testes do CachedFlowRepository

**Contexto:** Validar comportamento do decorator.

**O que fazer:**
- [ ] Teste: cache miss busca no repo real e armazena
- [ ] Teste: cache hit retorna sem chamar repo real
- [ ] Teste: invalidacao limpa cache corretamente

**Criterios de Aceite:**
- [ ] Todos os cenarios testados com mocks de CachePort e FlowRepositoryPort
- [ ] Testes passam com `bun run test`

---

### T32 — Instalar BullMQ no worker

**Contexto:** Worker app esta vazio (scaffold). Precisa de BullMQ para processamento assincrono.

**O que fazer:**
- [ ] Adicionar `bullmq` como dependencia em `apps/worker/package.json`
- [ ] Adicionar `redis` (ioredis) se necessario para conexao BullMQ
- [ ] Rodar `bun install` na raiz do monorepo

**Criterios de Aceite:**
- [ ] `bullmq` instalado e resolvivel em `apps/worker`
- [ ] `bun install` sem erros

---

### T33 — WorkerEnvironment + bootstrap

**Contexto:** Worker precisa de configuracao e startup.

**O que fazer:**
- [ ] Criar `apps/worker/src/config/env.ts` com `WorkerEnvironment` (REDIS_URL, NODE_ENV, LOG_LEVEL)
- [ ] Criar bootstrap basico em `apps/worker/src/index.ts`: carregar env, conectar ao Valkey, health check, log de startup
- [ ] Criar health check endpoint ou log periodico

**Criterios de Aceite:**
- [ ] Worker inicia sem erros quando REDIS_URL esta configurado
- [ ] Log de startup indica conexao com Valkey

---

### T34 — BaseConsumer + HealthCheckJob

**Contexto:** Padrao base para consumers de filas.

**O que fazer:**
- [ ] Criar `apps/worker/src/consumers/base-consumer.ts`: classe abstrata com `processJob`, `onFailed`, `getName`
- [ ] Criar `apps/worker/src/jobs/health-check-job.ts`: job de exemplo que loga "health check ok"
- [ ] Criar `apps/worker/src/consumers/health-check-consumer.ts`: consumer que processa HealthCheckJob

**Criterios de Aceite:**
- [ ] BaseConsumer define contrato para novos consumers
- [ ] HealthCheckJob e processavel pelo consumer

---

### T35 — Conexao BullMQ + graceful shutdown

**Contexto:** Worker deve se conectar ao Valkey via BullMQ e encerrar graciosamente.

**O que fazer:**
- [ ] No bootstrap: criar `Worker` BullMQ conectado ao `REDIS_URL`
- [ ] Registrar handler de `SIGTERM` e `SIGINT` para `worker.close()` e desconectar
- [ ] Log de shutdown bem-sucedido

**Criterios de Aceite:**
- [ ] Worker processa jobs da fila
- [ ] Ctrl+C encerra graciosamente sem jobs pendentes perdidos

---

### T36 — Testes do worker

**Contexto:** Validar bootstrap e consumer pattern.

**O que fazer:**
- [ ] Teste unitario do `WorkerEnvironment` (validacao de vars obrigatorias)
- [ ] Teste unitario do `BaseConsumer` (contrato abstrato)

**Criterios de Aceite:**
- [ ] Testes passam com `bun run test`

---

## SET-F — Testes + Fechamento

> **Escopo estimado:** ~400 linhas | **Complexidade:** Media
> **Racional:** Cobrir use cases sem testes, adicionar Testcontainers para integracao, fechar debitos e validar sprint.

---

### T37 — Testes unitarios faltantes

**Contexto:** 3 use cases sem cobertura: `SyncChatwootStatusUseCase`, `SyncChatwootMessageUseCase`, `VerifyAccessTokenUseCase`.

**O que fazer:**
- [ ] Criar teste para `SyncChatwootStatusUseCase` (cenarios: conversation_assigned, conversation_resolved, conversation nao encontrada)
- [ ] Criar teste para `SyncChatwootMessageUseCase` (cenarios: mensagem enviada, conversation nao encontrada, instance nao encontrada)
- [ ] Criar teste para `VerifyAccessTokenUseCase` (cenarios: token valido, token invalido, token expirado)

**Criterios de Aceite:**
- [ ] Cada use case tem pelo menos 3 cenarios testados
- [ ] Testes passam com `bun run test`

---

### T38 — Setup Testcontainers

**Contexto:** Zero testes de integracao contra DB real. Testcontainers permite PostgreSQL efemero para testes.

**O que fazer:**
- [ ] Instalar `testcontainers` e `@testcontainers/postgresql` em `apps/api` (devDependency)
- [ ] Criar helper `apps/api/src/test-utils/pg-container.ts`: inicia container PostgreSQL, roda migrations, retorna `db` pronto
- [ ] Configurar timeout adequado no Vitest para testes de integracao

**Criterios de Aceite:**
- [ ] Helper inicia container PostgreSQL com schema completo
- [ ] Container e destruido apos os testes
- [ ] Migrations rodam automaticamente

**Notas tecnicas:**
> Testcontainers requer Docker rodando na maquina. Testes de integracao devem ser separados dos unitarios (sufixo `.integration.test.ts`) ou filtrados por tag para nao rodar em CI sem Docker.

---

### T39 — Teste de integracao DrizzleFlowRepository

**Contexto:** Validar que o repo de flow funciona contra PostgreSQL real.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-flow-repository.integration.test.ts`
- [ ] Testar: create, findById, findActiveByTenant, updateStatus, softDelete
- [ ] Testar: unique constraint `flows_one_active_per_tenant` (apenas 1 flow ativo por tenant)

**Criterios de Aceite:**
- [ ] CRUD completo testado contra PostgreSQL real
- [ ] Constraint de 1 flow ativo por tenant verificada
- [ ] Teste roda e passa com Docker disponivel

---

### T40 — Teste de integracao Auth repo

**Contexto:** Validar pelo menos 1 repo de auth contra PostgreSQL real.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-auth-repositories.integration.test.ts`
- [ ] Testar `DrizzleTenantRepository`: create + findById + findBySlug
- [ ] Testar unique constraint em slug

**Criterios de Aceite:**
- [ ] CRUD testado contra PostgreSQL real
- [ ] Constraint unique em slug verificada

---

### T41 — Verificar wiring completo

**Contexto:** Validar que DI injeta repos Drizzle corretamente quando env esta configurado.

**O que fazer:**
- [ ] Verificar que `createAuthModule({ db })` retorna use cases funcionais com Drizzle
- [ ] Verificar que `createWhatsAppModule({ db })` usa repos Drizzle
- [ ] Verificar que `createFlowModule({ db })` usa DrizzleFlowRepository

**Criterios de Aceite:**
- [ ] Nenhum repo in-memory usado quando `db` esta presente
- [ ] Bootstrap completo funciona sem erros

---

### T42 — Build + lint + test final

**Contexto:** Validacao final da sprint.

**O que fazer:**
- [ ] Rodar `bun run lint` na raiz — zero erros
- [ ] Rodar `bun run build` na raiz — compilacao bem-sucedida
- [ ] Rodar `bun run test` na raiz — todos os testes passam

**Criterios de Aceite:**
- [ ] Lint: 0 erros, 0 warnings
- [ ] Build: sucesso em todos os workspaces
- [ ] Test: todos passam (unitarios + integracao se Docker disponivel)

---

### T43 — Atualizar CHANGELOG com debitos resolvidos

**Contexto:** Debitos tecnicos resolvidos devem ser marcados como `[x]` no changelog.

**O que fazer:**
- [ ] Marcar como `[x]` todos os debitos resolvidos nesta sprint no `docs/changelog/CHANGELOG.md`
- [ ] Adicionar nota de resolucao em cada item
- [ ] Adicionar entrada da Sprint 09 no changelog

**Criterios de Aceite:**
- [ ] Todos os debitos resolvidos marcados com `[x]`
- [ ] Entrada da Sprint 09 com todas as mudancas documentadas

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 — Persistencia Auth com PostgreSQL

**Objetivo:** Validar que tenant, user e membership persistem no banco real.

**Pre-requisitos:**
- [ ] Docker em execucao (`bun run infra:up`)
- [ ] Variaveis de ambiente configuradas (DATABASE_URL, REDIS_URL, AUTH_SECRET)

**Passo a passo executavel:**
1. Iniciar API: `bun run dev --filter=api`
   - **Resultado esperado:** Log "Server started" sem erros de conexao DB
2. POST /auth/register-tenant com body `{ "tenantName": "Test", "email": "test@test.com", "password": "Test1234!", "displayName": "Test User" }`
   - **Resultado esperado:** 201 com tenant e token JWT
3. Reiniciar API (Ctrl+C + `bun run dev --filter=api`)
   - **Resultado esperado:** Servidor reinicia normalmente
4. POST /auth/login com `{ "email": "test@test.com", "password": "Test1234!" }`
   - **Resultado esperado:** 200 com token JWT — dados persistiram apos restart

**Criterio de aprovacao do cenario:**
- [ ] Login funciona apos restart da API — dados no PostgreSQL

---

### Cenario 2 — WebSocket autenticado

**Objetivo:** Validar que WebSocket requer JWT.

**Pre-requisitos:**
- [ ] API rodando com auth configurado

**Passo a passo executavel:**
1. Conectar WebSocket sem token: `wscat -c ws://localhost:3000/ws/conversations`
   - **Resultado esperado:** Conexao rejeitada (close code 4401)
2. Obter token via POST /auth/login
3. Conectar WebSocket com token: `wscat -c "ws://localhost:3000/ws/conversations?token=<jwt>"`
   - **Resultado esperado:** Conexao aceita, sem erros

**Criterio de aprovacao do cenario:**
- [ ] Sem token: rejeitado. Com token: aceito.

---

### Cenario 3 — Rate limiting

**Objetivo:** Validar que rate limiting funciona.

**Pre-requisitos:**
- [ ] API rodando

**Passo a passo executavel:**
1. Enviar 6 POST /auth/login em menos de 1 minuto (com credenciais quaisquer)
   - **Resultado esperado:** 5 primeiros retornam 200/401, 6o retorna 429 com header Retry-After

**Criterio de aprovacao do cenario:**
- [ ] Request 6 retorna 429

---

### Cenario 4 — Worker basico

**Objetivo:** Validar que worker inicia e se conecta ao Valkey.

**Pre-requisitos:**
- [ ] Docker em execucao (Valkey rodando)
- [ ] REDIS_URL configurado

**Passo a passo executavel:**
1. Iniciar worker: `bun run dev --filter=worker`
   - **Resultado esperado:** Log indica conexao com Valkey bem-sucedida
2. Enviar SIGTERM (Ctrl+C)
   - **Resultado esperado:** Log indica shutdown gracioso

**Criterio de aprovacao do cenario:**
- [ ] Worker inicia e encerra sem erros

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao `Testes Manuais de Entrega (Passo a Passo Executavel)` preenchida, executavel e detalhada
- [ ] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [ ] Decisoes tecnicas novas registradas em `docs/decisions/`
- [ ] Sem debito tecnico nao documentado
- [ ] Debitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolucao
- [ ] RNs respeitadas em toda implementacao
