# Changelog

> Histórico de mudanças do projeto. Atualizado ao final de cada sprint ou a cada conjunto de commits significativo.
> Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
> Regra: sempre que um débito técnico registrado for resolvido, atualizar o item para `[x]` e descrever a resolução.

---

## [Não lançado]

> Mudanças em desenvolvimento que ainda não foram para produção.

### Adicionado
- 

### Alterado
- 

### Corrigido
- 

---

## [sprint-09] — 2026-04-07

> **Objetivo:** Resolver todos os débitos técnicos de Categorias 1 (Crítico), 2 (Alto) e 3 (Médio) acumulados das Sprints 01 a 08, preparando o sistema para deploy real.

### Adicionado
- Repositórios Drizzle para Auth: `DrizzleTenantRepository`, `DrizzleUserRepository`, `DrizzleMembershipRepository` com DI condicional (Drizzle quando `db` presente, in-memory como fallback).
- Repositórios Drizzle para WhatsApp/Conversation: `DrizzleSessionRepository`, `DrizzleWhatsAppInstanceRepository`, `DrizzleConversationRepository` com suporte a paginação e filtros.
- Adapter de `FlowRepositoryPort` no módulo WhatsApp para converter `FlowEntity` em `FlowDefinitionRecord` sem quebrar a interface interna.
- Autenticação JWT no WebSocket: token extraído de header `Authorization` ou query param `token`, close code 4401 para tokens inválidos.
- Rate limiting via fixed-window counter: categorias `login` (5/min), `webhook` (100/min), `flow` (30/min) com `Retry-After` header e HTTP 429.
- Validação de input TypeBox nas rotas POST/PUT de flows.
- Schema `tenant_integrations` para configuração Chatwoot por tenant com JSONB `config`, `isActive` e FK para `tenants`.
- Port e repositório `TenantIntegrationRepositoryPort` (Drizzle + in-memory) para integrações por tenant.
- Factory `createChatwootPortFactory` com cache por tenant e fallback para config global via env vars.
- Serviço `ConversationSessionSyncService` para unificar `session.mode` e `conversation.status` em transação única.
- Decorator `CachedFlowRepository` com cache Valkey (TTL 5min) e invalidação automática em `updateStatus`/`softDelete`.
- Worker app básico com BullMQ: `HealthCheckConsumer`, carregamento de env, graceful shutdown via SIGTERM/SIGINT.
- Helper `startTestDatabase` com Testcontainers para PostgreSQL efêmero (skip automático quando Docker indisponível ou Bun incompatível).
- Testes de integração para `DrizzleFlowRepository` e `DrizzleTenantRepository` contra PostgreSQL real.
- Testes unitários faltantes: `SyncChatwootStatusUseCase`, `SyncChatwootMessageUseCase`, `VerifyAccessTokenUseCase`.
- Teste de verificação de wiring DI completo (auth, flow, whatsapp modules).

### Alterado
- `packages/db` expandido com re-export de `runDrizzleMigrations` para uso em Testcontainers.
- `chatwootConversationId` removido da tabela `sessions` e entidade `SessionEntity` — single source of truth em `conversations`.
- Módulos DI (`createAuthModule`, `createFlowModule`, `createWhatsAppModule`, `createConversationModule`) aceitam `db` opcional para injeção condicional de Drizzle repos.
- `ApiEnvironment` expandida com campos Chatwoot opcionais (`chatwootAppUrl`, `chatwootSsoSecret`, `chatwootWebhookToken`).
- Flow routes agora coercem `description: null` para `undefined` ao chamar use cases (compatibilidade com `exactOptionalPropertyTypes`).

### Corrigido
- `process-incoming-message-use-case.ts`: removido `chatwootConversationId` residual no builder de nova sessão.
- `drizzle-user-repository.ts`: cast explícito de `row.email` para `EmailAddress` (branded type).
- `cached-flow-repository.test.ts`: cast do mock `get` para compatibilidade com tipo genérico de `CachePort`.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-024 — Persistência Drizzle obrigatória](../business-rules/RN-024-persistencia-drizzle-obrigatoria.md)
- [RN-025 — Segurança de transporte e rate limiting](../business-rules/RN-025-seguranca-transporte-rate-limiting.md)
- [RN-026 — Config Chatwoot por tenant](../business-rules/RN-026-config-chatwoot-por-tenant.md)

### Débitos técnicos resolvidos
- [x] Substituir repositórios de auth in-memory por implementações persistentes (PostgreSQL/Drizzle) — resolvido via SET-A: `DrizzleTenantRepository`, `DrizzleUserRepository`, `DrizzleMembershipRepository` (Sprint 02 débito)
- [x] Implementar testes de integração com Testcontainers para `DrizzleFlowRepository` — resolvido via SET-F: T38-T39 com helper `startTestDatabase` e testes contra PostgreSQL real (Sprint 07 débito)
- [x] Adicionar rate limiting nas rotas de flow — resolvido via SET-C: T14 com fixed-window counter e categorias (Sprint 07 débito)
- [x] Implementar cache de flow ativo em Valkey com invalidação ao ativar/desativar — resolvido via SET-E: T28-T31 com `CachedFlowRepository` decorator (Sprint 07 débito)
- [x] Migrar config Chatwoot de variáveis de ambiente globais para configuração por tenant — resolvido via SET-D: T17-T19 com tabela `tenant_integrations` e factory per-tenant (Sprint 05 débito)
- [x] Remover `chatwootConversationId` da tabela `sessions` (single source of truth em `conversations`) — resolvido via SET-D: T26 com remoção do campo e atualização de todas as referências (Sprint 05 débito)
- [x] Unificar `session.mode` e `conversation.status` em source of truth única — resolvido via SET-D: T23 com `ConversationSessionSyncService` transacional (Sprint 05 débito)
- [x] Implementar `DrizzleConversationRepository` para produção — resolvido via SET-B: T08 com CRUD completo e paginação (Sprint 05 débito)
- [x] Autenticar WebSocket via JWT no handshake — resolvido via SET-C: T13 com validação de token no `upgrade` e close code 4401 (Sprint 05 débito)

### Débitos técnicos pendentes (não resolvidos nesta sprint)
- [ ] Extrair `flow-editor.tsx` (~430 linhas) em hooks menores: `useUndoRedo`, `useAutoSave`, `useFlowLoader` (Sprint 08)
- [ ] Adicionar suporte PUT/DELETE ao `createApiClient` genérico (Sprint 08)
- [ ] Adicionar testes unitários para `useFlowSimulation` hook (Sprint 08)
- [ ] Habilitar relatório de cobertura automatizado no package `flow` (Sprint 03)
- [ ] Habilitar relatório de cobertura automatizado no Vitest para auth/rbac (Sprint 02)
- [ ] Mapear `assignedTo` da Conversation para `userId` interno do sistema (Sprint 05)

---

## [sprint-08] — 2026-04-07

> **Objetivo:** Entregar o editor visual de fluxos com React Flow, custom nodes, serialização bidirecional, save manual/auto-save, validação client-side, simulação local e undo/redo.

### Adicionado
- Página de listagem de flows (`/flows`) com filtro por status, badges coloridos, ações de lifecycle (publicar, ativar, desativar, arquivar) e dialog de criação.
- Editor visual de fluxos (`/flows/:id/edit`) com React Flow: canvas com zoom, pan, minimap, toolbar com nome editável e indicador de unsaved changes.
- 5 custom node components visuais: MessageNode, OptionNode (com handles por opção), InputNode, TransferNode e EndNode, com cores e ícones distintos.
- Sidebar de propriedades: edição dinâmica por tipo de nó (texto, prompt, opções, fieldKey, motivo, mensagem de resumo) com adição/remoção de opções.
- Paleta de nós drag-and-drop: arrastar novos nós do sidebar para o canvas com posição precisa via `screenToFlowPosition`.
- Serialização bidirecional (`backendToReactFlow` / `reactFlowToBackend`) preservando posições, dados e edges com testes de roundtrip.
- Save manual via PUT API + auto-save em localStorage com debounce de 2 segundos e recuperação ao reabrir.
- Validação client-side via POST /flows/:id/validate com highlight visual de nós com erro (borda vermelha).
- Undo/redo com stack de estados (máximo 50 entradas), atalhos Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z e botões na toolbar.
- Simulação local importando `packages/flow` no browser: painel de chat, processamento de mensagens sem rede, reset e highlight do nó atual.
- API service tipado (`flow-api.ts`) para todas as operações de flow (CRUD, lifecycle, validação).
- Nav link "Fluxos" no AppShell com active state.

### Alterado
- `main.tsx` expandido com rotas `/flows` e `/flows/:id/edit`.
- `app-shell.tsx` refatorado para sidebar opcional e navegação com items configuráveis.

### Corrigido
- Bug crítico: `createFlowApi()` era recriado a cada render causando loop infinito de re-renders — corrigido com `useMemo`.
- Compatibilidade com `exactOptionalPropertyTypes` no serializer e na listagem de flows.
- API do `processMessage` alinhada com a assinatura real do packages/flow (ordem de argumentos e nomes de propriedades).

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-022 — Editor visual de fluxos](../business-rules/RN-022-editor-visual-fluxos.md)
- [RN-023 — Simulação local de fluxos](../business-rules/RN-023-simulacao-local-fluxos.md)

### Débitos técnicos gerados
- [ ] Extrair `flow-editor.tsx` (~430 linhas) em hooks menores: `useUndoRedo`, `useAutoSave`, `useFlowLoader`
- [ ] Adicionar suporte PUT/DELETE ao `createApiClient` genérico (eliminar `putRequest`/`deleteRequest` manuais em `flow-api.ts`)
- [ ] Adicionar testes unitários para `useFlowSimulation` hook (requer setup de testing-library/react-hooks)

---

## [sprint-07] — 2026-04-07

> **Objetivo:** Entregar CRUD completo de flows via API com persistência Drizzle, ciclo de vida (draft → published → active → archived), validação para publicação e isolamento multi-tenant.

### Adicionado
- Schema Drizzle `flows` com migration versionada: `id`, `tenant_id`, `name`, `description`, `definition` (JSONB), `status`, `version`, `created_at`, `updated_at`, `deleted_at`.
- Unique index parcial `flows_one_active_per_tenant` garantindo máximo 1 flow ativo por tenant no banco.
- Tipos de domínio `FlowId` (branded type), `FlowStatus` enum e `FlowEntity` com `isValidFlowTransition`.
- Port `FlowRepositoryPort` com métodos de domínio: `findById`, `findActiveByTenant`, `findByTenantPaginated`, `save`, `updateStatus`, `softDelete`.
- Repositório `DrizzleFlowRepository` com isolamento de tenant e soft delete em todas as queries.
- Repositório `InMemoryFlowRepository` para testes unitários.
- 10 use cases de flow: Create, Update Definition, Get, List (paginado), Delete (soft), Publish, Activate, Deactivate, Archive, Validate.
- Rotas HTTP completas: GET/POST /flows, GET/PUT/DELETE /flows/:id, POST /flows/:id/{publish,activate,deactivate,archive,validate}.
- Módulo DI `createFlowModule` com registro de repositório e todos os use cases.
- Suite de testes unitários com 100% de cobertura para todos os use cases e entidades de flow.

### Alterado
- `packages/db` expandido com re-export de funções Drizzle (`and`, `count`, `eq`, `isNull`, `sql`) para centralizar instância e evitar conflito de tipos.
- `AppErrorCode` expandido com `FLOW_NOT_FOUND`, `FLOW_INVALID_TRANSITION`, `FLOW_VALIDATION_FAILED`.
- `createApiServer` aceita dependência `flow` para registrar rotas de flow.
- `apps/api/src/index.ts` atualizado para bootstrap do módulo flow.

### Corrigido
- Conflito de tipos Drizzle ORM entre `apps/api` e `packages/db` resolvido centralizando imports no package `db`.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-020 — CRUD e ciclo de vida de flows](../business-rules/RN-020-crud-ciclo-vida-flows.md)
- [RN-021 — Persistência de flows com Drizzle](../business-rules/RN-021-persistencia-flows-drizzle.md)

### Débitos técnicos gerados
- [x] Implementar testes de integração com Testcontainers para `DrizzleFlowRepository` — resolvido na Sprint 09 (SET-F: T38-T39)
- [x] Adicionar rate limiting nas rotas de flow — resolvido na Sprint 09 (SET-C: T14)
- [x] Implementar cache de flow ativo em Valkey com invalidação ao ativar/desativar — resolvido na Sprint 09 (SET-E: T28-T31)

---

## [sprint-05] — 2026-04-06

> **Objetivo:** Entregar hand-off humano com entidade Conversation, eventos de domínio via Valkey Pub/Sub, integração reversa com Chatwoot e notificações WebSocket em tempo real.

### Adicionado
- Entidade `Conversation` separada de `Session`, com máquina de estados validada (`bot → waiting_human → human_active → bot`) e branded type `ConversationId`.
- Tabela `conversations` com migration, índices em `tenant_id`, `session_id`, `phone`, `status` e unique constraint `(tenant_id, session_id)`.
- Ports de domínio: `ConversationRepositoryPort`, `DomainEventPublisherPort`, `DomainEventSubscriberPort` — sem dependência de infraestrutura.
- Repositório `InMemoryConversationRepository` para dev/test, com isolamento de tenant em todas as queries.
- Sistema de eventos de domínio via Valkey Pub/Sub: `ValkeyDomainEventPublisher` (canal `domain-events:{tenantId}`) e `ValkeyDomainEventSubscriber` (PSUBSCRIBE `domain-events:*`).
- Implementações in-memory de publisher e subscriber para testes, com `getPublishedEvents()` e `dispatch()`.
- Use case `AssignConversationUseCase`: transição `waiting_human → human_active` com validação de máquina de estados e emissão de evento `conversation.human_active`.
- Use case `CloseConversationUseCase`: transição `waiting_human|human_active → bot` com reinício completo de sessão (decisão D7) e emissão de evento `conversation.bot_resumed`.
- Use case `SyncChatwootMessageUseCase`: recebe mensagem do agente Chatwoot via webhook e envia ao WhatsApp do usuário via provider correto.
- Use case `SyncChatwootStatusUseCase`: orquestrador que roteia eventos de status do Chatwoot para `AssignConversation` ou `CloseConversation`.
- Endpoint `POST /webhook/chatwoot` com autenticação por token fixo (`CHATWOOT_WEBHOOK_TOKEN`), parsing de payloads `message_created` e `conversation_status_changed`.
- WebSocket Elysia em `ws /ws/conversations` com `ConnectionManager` isolando broadcasts por `tenantId`.
- Bridge `event-to-websocket`: conecta DomainEventSubscriber ao ConnectionManager para notificações em tempo real.
- Módulo DI `create-conversation-module.ts` integrando todos os novos componentes.
- Factories de teste compartilhadas em `test-support.ts`: `createFakeLogger`, `createTestConversation`, `createTestSession`, `createFakeSessionRepository`.

### Alterado
- `ProcessIncomingMessageUseCase` refatorado para criar `Conversation` junto com `Session`, usar `conversation.status` como source of truth para routing e emitir `conversation.handed_off` no hand-off.
- `AppErrorCode` expandido com `CONVERSATION_NOT_FOUND`, `CONVERSATION_INVALID_TRANSITION`, `WHATSAPP_INSTANCE_NOT_FOUND`.
- `ApiEnvironment` expandida com variáveis Chatwoot opcionais (`CHATWOOT_API_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_WEBHOOK_TOKEN`).
- `createApiServer` aceita dependência opcional `conversation` para registrar rotas Chatwoot webhook e WebSocket.
- `.env.example` atualizado com `CHATWOOT_WEBHOOK_TOKEN`.

### Corrigido
- Nenhum.

### Decisões técnicas registradas
- D1: `Conversation` separada de `Session` (separação de responsabilidades)
- D2: Valkey Pub/Sub para eventos (distribuído desde o início)
- D3: WebSocket push-only com payload mínimo
- D4: Token fixo para webhook Chatwoot
- D5: Config Chatwoot global (MVP, débito registrado)
- D6: `assignedTo` nullable sem FK (Chatwoot gerencia)
- D7: CloseConversation reinicia sessão do zero

### Regras de negócio implementadas
- [RN-014 — Conversation entity e transições de estado](../business-rules/RN-014-conversation-entity-transicoes-estado.md)
- [RN-015 — Sistema de eventos de domínio (Valkey Pub/Sub)](../business-rules/RN-015-sistema-eventos-dominio-valkey-pubsub.md)
- [RN-016 — Chatwoot webhook reverso e sincronização](../business-rules/RN-016-chatwoot-webhook-reverso-sincronizacao.md)

### Débitos técnicos gerados
- [x] Migrar config Chatwoot de variáveis de ambiente globais para configuração por tenant — resolvido na Sprint 09 (SET-D: T17-T19)
- [ ] Mapear `assignedTo` da Conversation para `userId` interno do sistema, integrando com RBAC e `tenant_memberships`
- [x] Remover `chatwootConversationId` da tabela `sessions` — resolvido na Sprint 09 (SET-D: T26)
- [x] Unificar `session.mode` e `conversation.status` em source of truth única — resolvido na Sprint 09 (SET-D: T23)
- [x] Implementar `DrizzleConversationRepository` para produção — resolvido na Sprint 09 (SET-B: T08)
- [x] Autenticar WebSocket via JWT no handshake — resolvido na Sprint 09 (SET-C: T13)

---

## [sprint-03] — 2026-04-06

> **Objetivo:** Entregar o flow engine puro para processar mensagens, navegar entre nós, coletar dados e sinalizar handoff humano com validação estrutural de ativação.

### Adicionado
- Modelagem de domínio do `packages/flow` com contratos semânticos para `Flow`, `FlowNode`, `Session`, `Edge`, `ProcessResult` e eventos de domínio.
- Implementação de `processMessage(session, message, flow)` cobrindo os nós `message`, `option`, `input`, `transfer` e `end`.
- Parsing de opção por número (`1..N`) e por texto (`label`/`aliases`), com retorno determinístico para entrada inválida.
- Contratos de integração para observabilidade/publicação de eventos (`FlowExecutionObserverPort`, `FlowEventPublisherPort`) sem acoplamento de infraestrutura.
- Módulo `validateFlowDefinition` com validações estruturais, alcançabilidade, caminhos terminais e regras de ciclo controlado.
- Nova suíte de testes unitários do package `flow` cobrindo engine, validação e exports públicos.

### Alterado
- Surface pública de `packages/flow/src/index.ts` reorganizada para exportar domínio, engine e validação de forma explícita.
- README do package `flow` atualizado com API pública, regras de execução e limites arquiteturais.

### Corrigido
- Proteção de runtime contra loop automático no engine para evitar travamento em fluxos inválidos.
- Normalização de tipagem estrita em testes de validação para unions de nós com narrowing seguro.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-008 — Engine de fluxo puro e determinístico](../business-rules/RN-008-flow-engine-puro-deterministico.md)
- [RN-009 — Semântica de nós e transição de sessão](../business-rules/RN-009-semantica-nos-transicao-sessao.md)
- [RN-010 — Validação de fluxo para ativação segura](../business-rules/RN-010-validacao-fluxo-ativacao-segura.md)

### Débitos técnicos gerados
- [ ] Habilitar relatório de cobertura automatizado no package `flow` para comprovar formalmente o alvo de 100% no CI.

---

## [sprint-02] — 2026-04-06

> **Objetivo:** Permitir cadastro de tenant, autenticação JWT Bearer e autorização RBAC com isolamento multi-tenant por token.

### Adicionado
- Modelo de identidade multi-tenant com `users` e `tenant_memberships`, incluindo constraints e índices para vínculo N:N entre usuário e tenant.
- Use cases de auth (`RegisterTenant`, `CreateUser`, `Login`, `GetCurrentUser`) com tipagem estrita, `AppError` padronizado e testes unitários cobrindo cenários de sucesso e erro.
- Ports e adapters de cross-cutting para cache e logs (`CachePort`, `AppLoggerPort`, `ValkeyCacheAdapter`, `InMemoryCacheAdapter`, adapter de logger estruturado).
- Services de aplicação para política RBAC e cache de identidade (`RbacPolicyService`, `IdentityCacheService`) integrados ao módulo de auth.
- Testes de integração/E2E para fluxos obrigatórios de auth, 401 sem token, 403 por role, isolamento de `tenantId` por token e cenário single-tenant.

### Alterado
- Composição de dependências do auth centralizada no container DI com resolução lazy e lifetimes explícitos.
- Rotas e middleware HTTP de auth com extração de token Bearer, derive de contexto autenticado e envelope único de erro.
- Configuração de ambiente da API expandida para `MULTI_TENANT`, `DEFAULT_TENANT_ID`, `AUTH_SECRET` e TTL de token.

### Corrigido
- Execução global de lint no monorepo estabilizada com formatação consistente entre workspaces.
- Fluxos de teste e build consolidados para garantir `bun run build`, `bun run test` e `bun run lint` passando na raiz.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-004 — Identidade e isolamento multi-tenant por token](../business-rules/RN-004-identidade-isolamento-tenant-token.md)
- [RN-005 — Autenticação JWT Bearer e segurança de credenciais](../business-rules/RN-005-autenticacao-jwt-bearer-seguranca.md)
- [RN-006 — RBAC por papel com autorização por endpoint](../business-rules/RN-006-rbac-autorizacao-endpoints.md)
- [RN-007 — Ports, Adapters e Services para cache e logs](../business-rules/RN-007-ports-adapters-services-cache-logs.md)

### Débitos técnicos gerados
- [x] Substituir repositórios de auth in-memory por implementações persistentes (PostgreSQL/Drizzle) — resolvido na Sprint 09 (SET-A: T01-T03)
- [ ] Habilitar relatório de cobertura automatizado no Vitest para comprovar a meta de 100% nos use cases de auth/rbac.

---

## [sprint-01] — 2026-04-06

> **Objetivo:** Configurar a fundação técnica do projeto com monorepo funcional, observabilidade mínima e infraestrutura local reproduzível.

### Adicionado
- Estrutura de monorepo com Turborepo + Bun, apps (`api`, `web`, `worker`) e packages (`types`, `db`, `flow`, `auth`, `ui`, `container`).
- API Elysia com endpoint `GET /health`, logger JSON estruturado e `correlationId` por requisição.
- Base de DI container tipado com suporte a singleton/transient e lazy instantiation.
- Infraestrutura local com `infra/docker-compose.yml` para PostgreSQL 16 e Valkey, incluindo healthchecks.
- Package `db` com Drizzle ORM, schema inicial `tenants`, migration versionada e scripts de `db:migrate`/`valkey:check`.
- Cobertura mínima de testes unitários em todos os workspaces.

### Alterado
- Scripts de raiz expandidos com `db:generate`, `db:migrate`, `valkey:check`, `infra:up`, `infra:down` e `infra:ps`.
- Estratégia de `test` dos workspaces ajustada para exigir arquivos de teste (remoção de `--passWithNoTests` onde já há cobertura).

### Corrigido
- Mensagens explícitas para edge cases de inicialização: variável de ambiente ausente, falha de conexão com DB/Valkey e porta HTTP em uso.
- Portas do Docker Compose parametrizadas (`POSTGRES_HOST_PORT` e `VALKEY_HOST_PORT`) para contornar conflito de porta já ocupada no host.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-001 — Fundação técnica e isolamento de camadas](../business-rules/RN-001-fundacao-tecnica-isolamento-camadas.md)
- [RN-002 — Configuração de ambientes e segredos](../business-rules/RN-002-configuracao-ambientes-segredos.md)
- [RN-003 — Observabilidade mínima com correlationId](../business-rules/RN-003-observabilidade-correlation-id.md)

### Débitos técnicos gerados
- [x] Substituído cast de contexto em `apps/api/src/interface/http/create-api-server.ts` por tipagem inferida nativa do Elysia. Também foi tipado `resolveCorrelationId(request: Request)` para manter consistência da borda HTTP. (resolvido em 2026-04-06)

---

<!--
## [sprint-XX] — YYYY-MM-DD
...
-->
