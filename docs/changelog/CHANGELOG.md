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
- [ ] Migrar config Chatwoot de variáveis de ambiente globais para configuração por tenant (tabela `tenant_configs` ou JSONB em `tenants`)
- [ ] Mapear `assignedTo` da Conversation para `userId` interno do sistema, integrando com RBAC e `tenant_memberships`
- [ ] Remover `chatwootConversationId` da tabela `sessions` (single source of truth em `conversations`) após migração de dados
- [ ] Unificar `session.mode` e `conversation.status` em source of truth única (conversation como master)
- [ ] Implementar `DrizzleConversationRepository` para produção (substituir in-memory)
- [ ] Autenticar WebSocket via JWT no handshake (atualmente usa `tenantId` query param)

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
- [ ] Substituir repositórios de auth in-memory por implementações persistentes (PostgreSQL/Drizzle) para produção.
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
