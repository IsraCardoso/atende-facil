# Sprint 05 — Hand-off Humano + Sistema de Eventos

> **Período:** 06/04 até 13/04 | **Status:** `Concluída`

---

# 📋 GESTÃO

## Objetivo da Sprint

> *Quando um fluxo determina que é hora de um humano atender, o sistema cria uma conversa, muda o status, notifica o painel em tempo real via WebSocket e pausa o bot. Mensagens de agentes entram exclusivamente pelo Chatwoot, passam pelo backend e saem pelo provider WhatsApp correto.*

Entregar a entidade `Conversation` separada de `Session`, o sistema de eventos de domínio via Valkey Pub/Sub, a integração reversa com Chatwoot (receber webhooks do Chatwoot para sincronizar mensagens e status), WebSocket para notificações em tempo real, e use cases de transição de estado (`AssignConversation`, `CloseConversation`).

---

## Fluxo oficial de documentação (IA)

1. O usuário informa descrição e detalhes da próxima sprint.
2. A IA faz perguntas de clarificação (somente o necessário) e preenche esta doc de sprint.
3. O usuário revisa e aprova a sprint.
4. Somente após aprovação, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** não transferir nem detalhar RNs antes da aprovação explícita da sprint.

---

## Entregáveis

| # | Entregável | Critério de conclusão |
|---|---|---|
| 1 | Entidade `Conversation` com tabela e migration | Tabela criada, repositório Drizzle funcional, tipos branded exportados |
| 2 | Sistema de eventos via Valkey Pub/Sub | Eventos publicados após persistência, subscriber consome e repassa para WebSocket |
| 3 | Transições de estado atômicas | Hand-off cria conversation + emite evento. Assign e Close atualizam status e emitem eventos |
| 4 | Chatwoot webhook reverso | Mensagem de agente chega via webhook Chatwoot → backend envia ao usuário via provider WhatsApp correto |
| 5 | WebSocket de notificações | Painel recebe notificação em tempo real quando conversa muda de status |
| 6 | Use cases `AssignConversation` e `CloseConversation` | Transições testadas com 100% cobertura unitária |
| 7 | Testes E2E do fluxo completo | user→transfer→waiting→assign→msg→close→bot |

---

## Regras de Negócio desta Sprint

- [RN-014 — Conversation entity e transições de estado](../business-rules/RN-014-conversation-entity-transicoes-estado.md)
- [RN-015 — Sistema de eventos de domínio (Valkey Pub/Sub)](../business-rules/RN-015-sistema-eventos-dominio-valkey-pubsub.md)
- [RN-016 — Chatwoot webhook reverso e sincronização](../business-rules/RN-016-chatwoot-webhook-reverso-sincronizacao.md)

---

## Fora do Escopo

- ❌ Painel de atendimento humano no frontend (usa Chatwoot como inbox)
- ❌ Editor visual de fluxos no frontend
- ❌ Suporte a mídia (imagens, áudio, vídeo) — apenas texto
- ❌ IA generativa (RAG)
- ❌ Config Chatwoot por tenant (débito técnico — ver seção)
- ❌ Mapeamento `assignedTo` → userId interno (débito técnico — ver seção)
- ❌ Migração de repositórios in-memory de auth para Drizzle

---

## Métricas de Sucesso

- [ ] Mensagem de transferência do flow engine cria Conversation com status `waiting_human` e emite evento `conversation.handed_off`
- [ ] Evento publicado no Valkey é recebido pelo subscriber e chega ao WebSocket
- [ ] Agente responde no Chatwoot → webhook chega ao backend → mensagem enviada ao usuário via provider correto
- [ ] Conversa atribuída no Chatwoot → status muda para `human_active` + evento emitido
- [ ] Conversa encerrada no Chatwoot → status volta para `bot` + sessão reinicia + evento emitido
- [ ] Bot ignora mensagens quando `conversation.status !== 'bot'`
- [ ] 100% de cobertura unitária nas transições de estado
- [ ] `bun run build`, `bun run test` e `bun run lint` passando no monorepo

---

## Decisões da Sprint (pré-implementação)

| # | Decisão | Justificativa |
|---|---|---|
| D1 | `Conversation` é entidade separada de `Session` | Session = estado do bot/flow (currentNodeId, data). Conversation = ciclo de atendimento (status, assignedTo, chatwoot). Separação de responsabilidades |
| D2 | Valkey Pub/Sub para eventos de domínio | Distribuído desde o início. Funciona com múltiplas instâncias da API |
| D3 | WebSocket envia apenas notificações de estado | Dados mínimos (conversationId, phone, status). Chatwoot já provê inbox completo |
| D4 | Token fixo para autenticar webhooks Chatwoot | `CHATWOOT_WEBHOOK_TOKEN` no `.env`. Simples e suficiente para este estágio |
| D5 | Config Chatwoot global (não por tenant) | MVP com tenant único. Débito técnico registrado para migrar para config por tenant |
| D6 | `assignedTo` nullable, sem mapeamento para userId | Chatwoot gerencia atribuição. Débito técnico registrado para sincronizar com RBAC interno |
| D7 | CloseConversation reinicia sessão do zero | Comportamento mais previsível para o usuário final |

---

## Débitos Técnicos Registrados nesta Sprint

- [ ] Migrar config Chatwoot de variáveis de ambiente globais para configuração por tenant (tabela `tenant_configs` ou JSONB em `tenants`)
- [ ] Mapear `assignedTo` da Conversation para `userId` interno do sistema, integrando com RBAC e `tenant_memberships`
- [ ] Remover `chatwootConversationId` da tabela `sessions` (single source of truth em `conversations`) após migração de dados
- [ ] Unificar `session.mode` e `conversation.status` em source of truth única (conversation como master)

---

# ⚙️ ENGENHARIA

> **Instrução para a IA:** Leia o Plano de Execução antes de começar. Execute um set por vez. Após cada set, apresente o checkpoint e aguarde instrução do usuário.
> **Eficiência de contexto:** quando houver arquivos grandes, usar leitura incremental.

---

## Plano de Execução

```
Rodada 1: [SET-A: Fundação de Domínio — Conversation + Eventos]
Rodada 2: [SET-B: Infraestrutura — Repositório e Eventos Valkey]
Rodada 3: [SET-C: Use Cases de Transição de Estado]
Rodada 4: [SET-D: Chatwoot Webhook Reverso]
Rodada 5: [SET-E: WebSocket + Wiring DI]
Rodada 6: [SET-F: Testes e Fechamento de Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06 | SET-A | — |
| SET-C | T07, T08, T09 | SET-B | — |
| SET-D | T10, T11, T12 | SET-C | — |
| SET-E | T13, T14, T15 | SET-D | — |
| SET-F | T16, T17, T18 | SET-E | — |

> **Critério de paralelismo:** nenhum set é paralelo nesta sprint — cada um depende do anterior. A cadeia é sequencial por natureza (domínio → infra → use cases → endpoints → WebSocket → testes).

---

## SET-A — Fundação de Domínio — Conversation + Eventos

> 🎯 **Escopo estimado:** ~300 linhas | **Complexidade:** Média
> **Racional:** Estabelecer tipos, entidade Conversation, ports de evento e schema de banco que todos os sets subsequentes consomem.

---

### T01 — Definir entidade Conversation e tipos de domínio

**Contexto:** A Conversation é a nova entidade que tracka o ciclo de atendimento humano. Separada da Session (que tracka estado do bot/flow). Precisa de tipos branded e status discriminado.

**O que fazer:**
- [ ] Criar branded type `ConversationId` (`string & { readonly __brand: 'ConversationId' }`)
- [ ] Criar factory function `createConversationId(rawValue: string): ConversationId` com validação de vazio
- [ ] Criar union `ConversationStatus = 'bot' | 'waiting_human' | 'human_active'`
- [ ] Criar `ConversationEntity` com campos: `id: ConversationId`, `tenantId: string`, `sessionId: SessionId`, `phone: Phone`, `status: ConversationStatus`, `assignedTo: string | null`, `chatwootConversationId: ChatwootConversationId | null`, `createdAt: Date`, `updatedAt: Date`
- [ ] Criar tipos de evento de domínio: `ConversationHandedOffEvent`, `ConversationHumanActiveEvent`, `ConversationBotResumedEvent`
- [ ] Criar union discriminada `DomainEvent` que agrupa todos os eventos por `type`
- [ ] Exportar todos os tipos via barrel file do domínio

**Critérios de Aceite:**
- [ ] Tipos não dependem de infraestrutura
- [ ] Sem `any` em nenhum contrato
- [ ] Cada evento de domínio tem: `type`, `tenantId`, `conversationId`, `phone`, `timestamp`, `payload` específico
- [ ] ConversationEntity é `Readonly<{...}>`

**Notas técnicas:**
> Eventos nomeados no passado: `conversation.handed_off`, `conversation.human_active`, `conversation.bot_resumed`. O campo `type` do evento é a string discriminante. `assignedTo` é `string | null` — sem branded type por agora (débito técnico D6).

---

### T02 — Definir ports de domínio para Conversation e Eventos

**Contexto:** Use cases precisam consumir repositório de conversation e publicar/assinar eventos por interface — implementações concretas ficam no infrastructure.

**O que fazer:**
- [ ] Criar `ConversationRepositoryPort` com: `findById(tenantId, conversationId)`, `findBySessionId(tenantId, sessionId)`, `findByTenantAndStatus(tenantId, status)`, `save(conversation)`, `updateStatus(tenantId, conversationId, status, assignedTo?)`
- [ ] Criar `DomainEventPublisherPort` com: `publish(event: DomainEvent): Promise<void>`
- [ ] Criar `DomainEventSubscriberPort` com: `subscribe(eventType: DomainEvent['type'], handler: (event: DomainEvent) => void): void`, `unsubscribeAll(): void`
- [ ] Ports pertencem a `apps/api/src/domain/ports/`

**Critérios de Aceite:**
- [ ] Ports pertencem ao `domain/ports`
- [ ] Nenhum port importa infraestrutura
- [ ] `DomainEventPublisherPort` é genérico para qualquer `DomainEvent`
- [ ] `DomainEventSubscriberPort` permite múltiplos handlers por tipo de evento

**Notas técnicas:**
> O publisher é invocado dentro dos use cases após persistência. O subscriber é consumido pelo módulo WebSocket para broadcast. Separar publisher e subscriber facilita teste: publisher é mockado nos use cases, subscriber é testado isoladamente.

---

### T03 — Criar tabela `conversations` com migration

**Contexto:** O banco precisa persistir conversas como entidade separada de sessions, com link via `session_id`.

**O que fazer:**
- [ ] Criar schema `conversations` em `packages/db/src/schema/conversations.ts` com: `id` (uuid PK), `tenant_id` (FK tenants, NOT NULL), `session_id` (FK sessions, NOT NULL), `phone` (varchar 32, NOT NULL), `status` (varchar 32, default 'bot', NOT NULL), `assigned_to` (uuid, nullable), `chatwoot_conversation_id` (varchar 255, nullable), `created_at`, `updated_at`
- [ ] Adicionar índices: `tenant_id`, `session_id`, `phone`, `status`
- [ ] Adicionar unique constraint `(tenant_id, session_id)` — uma conversation por session
- [ ] Exportar via `packages/db/src/schema/index.ts`
- [ ] Gerar migration via `bun run db:generate`

**Critérios de Aceite:**
- [ ] Migration gerada sem erros
- [ ] Índices presentes para queries frequentes
- [ ] Schema segue convenção snake_case e tem `tenant_id` obrigatório
- [ ] Build do `packages/db` passa
- [ ] `assigned_to` é nullable (sem FK por agora — débito D6)

**Notas técnicas:**
> `assigned_to` será `uuid` nullable sem FK nesta sprint. Quando o mapeamento Chatwoot agent → userId interno for implementado, a FK será adicionada via nova migration. `session_id` tem FK para `sessions.id` com `ON DELETE CASCADE`.

---

## SET-B — Infraestrutura — Repositório e Eventos Valkey

> 🎯 **Escopo estimado:** ~450 linhas | **Complexidade:** Média-Alta
> **Racional:** Implementar os ports definidos no SET-A: repositório concreto (Drizzle) e sistema de eventos (Valkey Pub/Sub). Tudo que o SET-C precisa para funcionar.

---

### T04 — Implementar ConversationRepository (Drizzle + InMemory)

**Contexto:** O port `ConversationRepositoryPort` precisa de implementação concreta para persistir e consultar conversations.

**O que fazer:**
- [ ] Implementar `DrizzleConversationRepository` em `apps/api/src/infrastructure/repositories/drizzle-conversation-repository.ts` que satisfaz `ConversationRepositoryPort`
- [ ] Garantir filtro de `tenant_id` em todas as queries
- [ ] Implementar `InMemoryConversationRepository` em `apps/api/src/infrastructure/repositories/in-memory-conversation-repository.ts` para testes
- [ ] Implementar mapper `toEntity` / `fromEntity` para converter entre schema Drizzle e `ConversationEntity`

**Critérios de Aceite:**
- [ ] Repositories pertencem ao `infrastructure/repositories`
- [ ] `tenant_id` é filtro obrigatório — nunca query sem tenant
- [ ] `updateStatus` atualiza `status`, `assigned_to` (quando fornecido) e `updated_at` atomicamente
- [ ] Testes unitários com implementação in-memory

**Notas técnicas:**
> O repository concreto usa Drizzle ORM via `DatabaseConnection` do `packages/db`. O mapper converte os branded types do domínio para/de tipos primitivos do schema.

---

### T05 — Implementar ValkeyDomainEventPublisher

**Contexto:** Eventos de domínio devem ser publicados no Valkey via `PUBLISH` para que múltiplos subscribers (WebSocket, logs, futuro worker) possam consumir.

**O que fazer:**
- [ ] Implementar `ValkeyDomainEventPublisher` em `apps/api/src/infrastructure/events/valkey-event-publisher.ts` que satisfaz `DomainEventPublisherPort`
- [ ] Canal Valkey: `domain-events:{tenantId}` — segmenta eventos por tenant
- [ ] Payload serializado como JSON com schema: `{ type, tenantId, conversationId, phone, timestamp, payload }`
- [ ] Implementar `InMemoryDomainEventPublisher` para testes — armazena eventos em array interno para asserções

**Critérios de Aceite:**
- [ ] Publisher publica via `PUBLISH` no Valkey
- [ ] Canal segmentado por `tenantId`
- [ ] Serialização JSON sem `any`
- [ ] InMemory expõe `getPublishedEvents()` para testes
- [ ] Testes unitários com InMemory

**Notas técnicas:**
> O publisher usa uma conexão Valkey dedicada (não compartilha com cache). Valkey Pub/Sub exige conexões separadas para publish e subscribe. Usar a `REDIS_URL` já existente no env.

---

### T06 — Implementar ValkeyDomainEventSubscriber

**Contexto:** O WebSocket precisa consumir eventos de domínio para broadcast em tempo real. O subscriber se inscreve nos canais Valkey e repassa para handlers registrados.

**O que fazer:**
- [ ] Implementar `ValkeyDomainEventSubscriber` em `apps/api/src/infrastructure/events/valkey-event-subscriber.ts` que satisfaz `DomainEventSubscriberPort`
- [ ] `subscribe(eventType, handler)`: registra handler e se inscreve via `PSUBSCRIBE domain-events:*` (pattern subscribe para todos os tenants)
- [ ] Ao receber mensagem, desserializa JSON e invoca handlers registrados para o `type` do evento
- [ ] `unsubscribeAll()`: limpa handlers e chama `PUNSUBSCRIBE`
- [ ] Implementar `InMemoryDomainEventSubscriber` para testes

**Critérios de Aceite:**
- [ ] Subscriber usa `PSUBSCRIBE` com pattern `domain-events:*`
- [ ] Handlers são invocados apenas para o `eventType` registrado
- [ ] Múltiplos handlers por tipo são suportados
- [ ] `unsubscribeAll` limpa tudo sem crash
- [ ] Conexão Valkey separada da do publisher e do cache
- [ ] Testes unitários com InMemory

**Notas técnicas:**
> Valkey Pub/Sub: a conexão que faz `SUBSCRIBE`/`PSUBSCRIBE` fica em modo exclusivo e não pode executar outros comandos. Por isso, três conexões separadas: cache, publisher, subscriber. O `InMemoryDomainEventSubscriber` simula o dispatch síncrono para testes.

---

## SET-C — Use Cases de Transição de Estado

> 🎯 **Escopo estimado:** ~500 linhas | **Complexidade:** Alta
> **Racional:** Coração da sprint — os use cases que orquestram a criação de conversation, transições de estado e publicação de eventos. Modifica o ProcessIncomingMessage existente.

---

### T07 — Refatorar ProcessIncomingMessageUseCase para Conversation + Eventos

**Contexto:** O use case existente já faz hand-off para Chatwoot, mas não cria Conversation e não emite eventos de domínio. Precisa ser estendido.

**O que fazer:**
- [ ] Adicionar `ConversationRepositoryPort` e `DomainEventPublisherPort` às dependências do use case
- [ ] Quando uma nova sessão é criada, criar também uma `Conversation` com status `bot`
- [ ] Quando sessão já existe, buscar conversation vinculada via `findBySessionId`
- [ ] Verificar `conversation.status` em vez de `session.mode` para decidir bot vs non-bot (conversation é source of truth para routing)
- [ ] No hand-off (`action.kind === 'transferred_to_human'`):
  - Atualizar `conversation.status` para `waiting_human`
  - Persistir `chatwootConversationId` na conversation
  - Emitir evento `conversation.handed_off` via `DomainEventPublisherPort`
  - Manter `session.mode` sincronizado (atualizar via `sessionRepository.updateMode`)
- [ ] Manter compatibilidade: `session.mode` e `conversation.status` sempre em sync
- [ ] Atualizar testes unitários existentes para as novas dependências

**Critérios de Aceite:**
- [ ] Conversation é criada junto com Session (status inicial `bot`)
- [ ] Hand-off atualiza conversation + session + emite evento
- [ ] Evento emitido APÓS persistência bem-sucedida — nunca antes
- [ ] Routing usa `conversation.status` como source of truth
- [ ] Testes unitários atualizados cobrindo criação de conversation e emissão de evento
- [ ] Use case continua sem importar infrastructure

**Notas técnicas:**
> A mudança é incremental: adicionamos dependências e lógica de conversation sem quebrar o fluxo existente. O `handleHandoff` agora também persiste a conversation e publica evento. Manter backward compatibility com `session.mode` até que o débito D4 seja resolvido.

---

### T08 — Implementar AssignConversation use case

**Contexto:** Quando um atendente assume a conversa (via Chatwoot ou futuro painel), o status muda para `human_active` e um evento é emitido.

**O que fazer:**
- [ ] Criar `createAssignConversationUseCase` em `apps/api/src/application/use-cases/assign-conversation-use-case.ts`
- [ ] Dependências: `ConversationRepositoryPort`, `SessionRepositoryPort`, `DomainEventPublisherPort`, `AppLoggerPort`
- [ ] Input: `tenantId`, `conversationId`, `assignedTo` (opcional — string nullable), `correlationId`
- [ ] Validações:
  - Conversation existe e pertence ao tenant
  - Status atual é `waiting_human` (só pode atribuir se estiver esperando)
- [ ] Ações:
  - Atualizar `conversation.status` para `human_active`
  - Atualizar `conversation.assignedTo` (se fornecido)
  - Sincronizar `session.mode` para `human_active`
  - Emitir evento `conversation.human_active`
- [ ] Retornar `Result<ConversationEntity, AppError>`

**Critérios de Aceite:**
- [ ] Status só muda de `waiting_human` → `human_active` (transição inválida retorna erro)
- [ ] Evento emitido após persistência
- [ ] `assignedTo` é opcional e nullable (débito D6)
- [ ] Testes unitários: sucesso, transição inválida, conversation não encontrada
- [ ] Session.mode é sincronizado

**Notas técnicas:**
> Este use case será invocado pelo `SyncChatwootStatus` (SET-D) quando o Chatwoot notifica que a conversa foi atribuída. Também pode ser invocado diretamente por um endpoint futuro do painel.

---

### T09 — Implementar CloseConversation use case

**Contexto:** Quando o atendente encerra no Chatwoot, a conversa volta para `bot`, a sessão reinicia do zero e o evento `conversation.bot_resumed` é emitido.

**O que fazer:**
- [ ] Criar `createCloseConversationUseCase` em `apps/api/src/application/use-cases/close-conversation-use-case.ts`
- [ ] Dependências: `ConversationRepositoryPort`, `SessionRepositoryPort`, `DomainEventPublisherPort`, `AppLoggerPort`
- [ ] Input: `tenantId`, `conversationId`, `correlationId`
- [ ] Validações:
  - Conversation existe e pertence ao tenant
  - Status atual é `waiting_human` ou `human_active` (não pode fechar se já é `bot`)
- [ ] Ações:
  - Atualizar `conversation.status` para `bot`
  - Limpar `conversation.assignedTo` para `null`
  - Reiniciar sessão: `currentNodeId = null`, `mode = 'bot'`, `data = {}`, `flowId = null`
  - Sincronizar `session.mode` para `bot`
  - Emitir evento `conversation.bot_resumed`
- [ ] Retornar `Result<ConversationEntity, AppError>`

**Critérios de Aceite:**
- [ ] Status só muda de `waiting_human|human_active` → `bot`
- [ ] Sessão é reiniciada (currentNodeId, data, flowId resetados)
- [ ] Próxima mensagem do usuário inicia novo fluxo do zero
- [ ] Evento emitido após persistência
- [ ] Testes unitários: sucesso a partir de waiting_human, sucesso a partir de human_active, transição inválida (já bot)

**Notas técnicas:**
> Decisão D7: reiniciar sessão é mais previsível que continuar de onde parou. O campo `chatwootConversationId` na conversation é mantido (histórico). Na session, o `chatwootConversationId` é limpo para que futuras interações possam criar nova conversa Chatwoot se necessário.

---

## SET-D — Chatwoot Webhook Reverso

> 🎯 **Escopo estimado:** ~400 linhas | **Complexidade:** Média-Alta
> **Racional:** Receber eventos do Chatwoot (mensagem do agente, atribuição, encerramento) e traduzir para ações no sistema. Fluxo: Chatwoot → backend → provider WhatsApp.

---

### T10 — Implementar SyncChatwootMessage use case

**Contexto:** Quando um agente envia mensagem no Chatwoot, o webhook chega ao backend e a mensagem deve ser enviada ao usuário via provider WhatsApp correto. O backend é o gateway de saída — agente nunca envia direto.

**O que fazer:**
- [ ] Criar `createSyncChatwootMessageUseCase` em `apps/api/src/application/use-cases/sync-chatwoot-message-use-case.ts`
- [ ] Dependências: `ConversationRepositoryPort`, `SessionRepositoryPort`, `WhatsAppInstanceRepositoryPort`, `WhatsAppSenderPort`, `AppLoggerPort`
- [ ] Input: `chatwootConversationId`, `messageContent`, `correlationId`
- [ ] Fluxo:
  1. Buscar conversation pelo `chatwootConversationId`
  2. Buscar session vinculada para obter `tenantId` e `phone`
  3. Buscar instância WhatsApp ativa do tenant
  4. Resolver provider bundle via factory
  5. Enviar mensagem ao usuário via `WhatsAppSenderPort.sendText`
- [ ] Retornar `Result<{ sent: true }, AppError>`

**Critérios de Aceite:**
- [ ] Mensagem do agente chega ao usuário WhatsApp via provider correto
- [ ] Conversation não encontrada → erro com log
- [ ] Instância WhatsApp inativa/ausente → erro com log
- [ ] Use case não importa infrastructure
- [ ] Testes unitários: sucesso, conversation não encontrada, instância ausente

**Notas técnicas:**
> O use case precisa resolver o provider dinâmicamente a partir da instância ativa do tenant. A `ProviderFactory` (sprint 04) já existe e resolve o bundle correto. O `ConversationRepositoryPort` precisa de um método adicional: `findByChatwootConversationId(chatwootConversationId)`.

---

### T11 — Implementar SyncChatwootStatus use case

**Contexto:** Quando o Chatwoot notifica mudança de status (conversa atribuída ou encerrada), o backend deve atualizar a conversation e emitir o evento correspondente.

**O que fazer:**
- [ ] Criar `createSyncChatwootStatusUseCase` em `apps/api/src/application/use-cases/sync-chatwoot-status-use-case.ts`
- [ ] Dependências: referência aos use cases `AssignConversation` e `CloseConversation`, `ConversationRepositoryPort`, `AppLoggerPort`
- [ ] Input: `chatwootConversationId`, `eventType` (`'conversation_assigned' | 'conversation_resolved'`), `assignedAgentName` (opcional), `correlationId`
- [ ] Fluxo:
  1. Buscar conversation pelo `chatwootConversationId`
  2. Se `eventType === 'conversation_assigned'`: invocar `AssignConversation.execute`
  3. Se `eventType === 'conversation_resolved'`: invocar `CloseConversation.execute`
- [ ] Retornar resultado do use case invocado

**Critérios de Aceite:**
- [ ] Roteamento correto por `eventType` (switch exaustivo)
- [ ] Conversation não encontrada → log warn + retorno sem erro (Chatwoot pode enviar eventos de conversas não gerenciadas)
- [ ] Testes unitários: atribuição, encerramento, conversation não encontrada
- [ ] Sem lógica de negócio duplicada — delega para use cases existentes

**Notas técnicas:**
> Este use case é um orquestrador: não contém lógica de transição, apenas roteia para o use case correto. O `assignedAgentName` é guardado como `assignedTo` na conversation (string simples, sem mapeamento — débito D6).

---

### T12 — Criar endpoint webhook Chatwoot + autenticação por token

**Contexto:** O Chatwoot envia webhooks HTTP quando eventos ocorrem (mensagem enviada, conversa atribuída, conversa resolvida). O endpoint deve ser público mas autenticado por token.

**O que fazer:**
- [ ] Criar `POST /webhook/chatwoot` em `apps/api/src/interface/http/chatwoot-webhook-routes.ts`
- [ ] Validar header de autenticação contra `CHATWOOT_WEBHOOK_TOKEN` do env
- [ ] Parsear payload do Chatwoot:
  - `event === 'message_created'` + `message_type === 'outgoing'` → invocar `SyncChatwootMessage`
  - `event === 'conversation_status_changed'` + `status === 'open'` → invocar `SyncChatwootStatus('conversation_assigned')`
  - `event === 'conversation_status_changed'` + `status === 'resolved'` → invocar `SyncChatwootStatus('conversation_resolved')`
- [ ] Retornar 200 sempre (evitar retry infinito do Chatwoot)
- [ ] Retornar 401 se token inválido
- [ ] Ignorar eventos não mapeados silenciosamente (log debug)

**Critérios de Aceite:**
- [ ] Token inválido → 401
- [ ] Evento `message_created` outgoing → mensagem chega ao WhatsApp do usuário
- [ ] Evento `conversation_status_changed` resolved → conversation volta para bot
- [ ] Evento desconhecido → 200 sem processamento
- [ ] Endpoint integrado no `createApiServer`

**Notas técnicas:**
> Chatwoot webhook payload: `{ event: string, ... }`. Para `message_created`: `{ event, content, message_type, conversation: { id } }`. Para `conversation_status_changed`: `{ event, status, id }`. O campo `message_type === 'outgoing'` indica mensagem do agente (incoming = mensagem do cliente). Filtrar apenas `outgoing` para evitar loop.

---

## SET-E — WebSocket + Wiring DI

> 🎯 **Escopo estimado:** ~350 linhas | **Complexidade:** Média
> **Racional:** Conectar o sistema de eventos ao WebSocket para notificações em tempo real, e wiring final de todas as dependências no container DI.

---

### T13 — Implementar WebSocket no Elysia

**Contexto:** O painel (futuro frontend) precisa receber notificações em tempo real quando uma conversa muda de status. Elysia suporta WebSocket nativamente.

**O que fazer:**
- [ ] Criar módulo WebSocket em `apps/api/src/interface/ws/conversation-ws.ts`
- [ ] Rota: `ws /ws/conversations` com query param `tenantId` para filtrar eventos
- [ ] Ao conectar: registrar a conexão em um `ConnectionManager` (Map de `tenantId` → Set de conexões)
- [ ] Ao desconectar: remover do `ConnectionManager`
- [ ] Criar `ConnectionManager` com métodos: `addConnection(tenantId, ws)`, `removeConnection(tenantId, ws)`, `broadcastToTenant(tenantId, payload)`
- [ ] Payload de broadcast: `{ type: string, conversationId: string, phone: string, status: string, timestamp: number }`

**Critérios de Aceite:**
- [ ] Conexão WebSocket aceita com `tenantId` válido
- [ ] Conexão sem `tenantId` → reject (close com código 4001)
- [ ] Broadcast envia para todas as conexões do tenant correto
- [ ] Desconexão limpa sem memory leak
- [ ] Testes unitários do ConnectionManager

**Notas técnicas:**
> Autenticação do WebSocket será simplificada nesta sprint: `tenantId` via query param. Em sprint futura, autenticar via token JWT no handshake. O `ConnectionManager` é singleton no DI. Elysia WebSocket usa a API nativa do Bun (performante).

---

### T14 — Conectar Event Subscriber ao WebSocket

**Contexto:** O subscriber Valkey precisa repassar eventos de domínio para o WebSocket, que faz broadcast para os clientes do tenant correspondente.

**O que fazer:**
- [ ] Criar módulo `apps/api/src/infrastructure/events/event-to-websocket-bridge.ts`
- [ ] Na inicialização (bootstrap), registrar handlers no `DomainEventSubscriberPort`:
  - `conversation.handed_off` → broadcast via ConnectionManager
  - `conversation.human_active` → broadcast via ConnectionManager
  - `conversation.bot_resumed` → broadcast via ConnectionManager
- [ ] O handler extrai `tenantId` do evento e chama `connectionManager.broadcastToTenant`
- [ ] Serializar payload como JSON antes do broadcast

**Critérios de Aceite:**
- [ ] Evento publicado no Valkey → subscriber consome → WebSocket recebe
- [ ] Broadcast vai apenas para conexões do tenant correto (isolamento)
- [ ] Handler resiliente: erro em um broadcast não impede outros
- [ ] Teste unitário com InMemory publisher/subscriber + mock de ConnectionManager

**Notas técnicas:**
> A bridge é um módulo de infraestrutura que conecta dois ports. Não contém lógica de negócio. É inicializada no bootstrap após o subscriber estar pronto.

---

### T15 — Wiring DI completo e atualização de bootstrap

**Contexto:** Todas as novas dependências precisam ser registradas no container DI e conectadas ao server Elysia.

**O que fazer:**
- [ ] Atualizar `create-whatsapp-module.ts` (ou criar `create-conversation-module.ts`) com novos tokens:
  - `ConversationRepositoryPort`
  - `DomainEventPublisherPort`
  - `DomainEventSubscriberPort`
  - `AssignConversationUseCase`
  - `CloseConversationUseCase`
  - `SyncChatwootMessageUseCase`
  - `SyncChatwootStatusUseCase`
  - `ConnectionManager`
- [ ] Registrar adapters concretos: DrizzleConversationRepository, ValkeyDomainEventPublisher, ValkeyDomainEventSubscriber
- [ ] Integrar `chatwoot-webhook-routes` no `createApiServer`
- [ ] Integrar WebSocket route no `createApiServer`
- [ ] Inicializar event-to-websocket bridge no bootstrap
- [ ] Atualizar `ApiEnvironment` com novas variáveis: `CHATWOOT_API_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_WEBHOOK_TOKEN`
- [ ] Atualizar `.env.example` com as novas variáveis

**Critérios de Aceite:**
- [ ] Nenhuma instanciação com `new` fora do container
- [ ] Build compila sem erros
- [ ] Server Elysia serve rotas de webhook WhatsApp, webhook Chatwoot, auth e WebSocket simultaneamente
- [ ] Variáveis Chatwoot adicionadas ao env com validação
- [ ] `bun run build` passa

**Notas técnicas:**
> Separar em módulo próprio (`create-conversation-module.ts`) mantém responsabilidade clara. O módulo WhatsApp existente fornece `WhatsAppSenderPort` e `WhatsAppInstanceRepositoryPort` que os novos use cases consomem — resolver cross-module via tokens compartilhados. Variáveis Chatwoot devem ser opcionais se `NODE_ENV === 'development'` (permite dev sem Chatwoot real).

---

## SET-F — Testes e Fechamento de Qualidade

> 🎯 **Escopo estimado:** ~400 linhas | **Complexidade:** Média
> **Racional:** Validar fluxo completo, garantir 100% de cobertura nas transições de estado e fechar a sprint com qualidade.

---

### T16 — Testes unitários 100% cobertura em transições de estado

**Contexto:** As transições de estado são a parte mais crítica do sistema. Cada caminho deve ter teste explícito.

**O que fazer:**
- [ ] Testes de `ProcessIncomingMessage`:
  - Mensagem em modo bot → conversation criada com status bot
  - Transfer → conversation status muda para waiting_human + evento emitido
  - Mensagem em modo non-bot → encaminhada ao Chatwoot
- [ ] Testes de `AssignConversation`:
  - waiting_human → human_active (sucesso)
  - bot → human_active (erro: transição inválida)
  - human_active → human_active (erro: já atribuída)
  - Conversation inexistente (erro)
- [ ] Testes de `CloseConversation`:
  - waiting_human → bot (sucesso + sessão reiniciada)
  - human_active → bot (sucesso + sessão reiniciada)
  - bot → bot (erro: já bot)
  - Conversation inexistente (erro)
  - Verificar que session.currentNodeId, data e flowId são resetados
- [ ] Usar factories de dados para fixtures — nunca objetos literais espalhados

**Critérios de Aceite:**
- [ ] 100% cobertura unitária nas transições de estado
- [ ] Cada teste tem um único motivo para falhar
- [ ] Nomenclatura: `should [resultado] when [condição]`
- [ ] Factories compartilhadas em `test-support.ts`

**Notas técnicas:**
> Usar `InMemoryConversationRepository`, `InMemoryDomainEventPublisher` e mocks dos ports existentes. A factory `createTestConversation` recebe overrides parciais e retorna `ConversationEntity` completa.

---

### T17 — Teste E2E do fluxo completo

**Contexto:** Validar o ciclo completo: usuário pede humano → conversation criada → evento emitido → atendente atribuído → mensagem enviada → conversa encerrada → bot reinicia.

**O que fazer:**
- [ ] Criar suíte E2E em `apps/api/src/interface/http/conversation-e2e.test.ts`
- [ ] Cenário completo:
  1. Simular webhook WhatsApp com mensagem que aciona nó `transfer` no flow
  2. Verificar: conversation criada com status `waiting_human`
  3. Simular webhook Chatwoot `conversation_status_changed` → `open` (assign)
  4. Verificar: conversation status `human_active`
  5. Simular webhook Chatwoot `message_created` outgoing (agente responde)
  6. Verificar: mensagem enviada ao WhatsApp via sender mock
  7. Simular webhook Chatwoot `conversation_status_changed` → `resolved` (close)
  8. Verificar: conversation status `bot`, sessão reiniciada
  9. Simular nova mensagem do usuário
  10. Verificar: flow reinicia do zero
- [ ] Cenário de idempotência: mesmo evento Chatwoot processado duas vezes não duplica ação

**Critérios de Aceite:**
- [ ] Ciclo completo passa sem intervenção manual
- [ ] Todos os estados intermediários verificados
- [ ] Mensagem do agente chega ao mock do sender com phone e texto corretos
- [ ] Sessão reiniciada verificada (currentNodeId null, data vazio)

**Notas técnicas:**
> Usar Supertest para HTTP. In-memory repositories e publishers para isolamento. O teste monta o server Elysia completo com DI in-memory.

---

### T18 — Atualização de docs, env e checklist final

**Contexto:** Fechar a sprint com docs atualizados, variáveis de ambiente documentadas e checklist completo.

**O que fazer:**
- [ ] Atualizar `.env.example` com todas as novas variáveis e comentários explicativos
- [ ] Verificar `bun run build` passa em todos os workspaces
- [ ] Verificar `bun run test` passa em todos os workspaces
- [ ] Verificar `bun run lint` passa sem warnings
- [ ] Executar `check-compiler-errors`
- [ ] Preencher checklist final da sprint

**Critérios de Aceite:**
- [ ] Nenhuma variável nova sem entrada no `.env.example`
- [ ] Build, test e lint passando
- [ ] Sem débito técnico não documentado

**Notas técnicas:**
> As RNs e changelog são atualizados automaticamente na Cadeia de Fechamento após o último set.

---

## Testes Manuais de Entrega (Passo a Passo Executável)

> **Obrigatório para considerar a sprint entregue.**
> Descreva passos reais e executáveis (sem frases vagas), com resultado esperado por passo.

### Cenário 1 — Hand-off completo: bot → waiting_human → human_active → bot

**Objetivo:** Validar o ciclo completo de hand-off humano com eventos e sincronização Chatwoot.

**Pré-requisitos:**
- [ ] Docker em execução (PostgreSQL + Valkey)
- [ ] Variáveis de ambiente configuradas (incluindo `CHATWOOT_WEBHOOK_TOKEN`)
- [ ] `bun run db:migrate` executado com sucesso
- [ ] API rodando em modo dev: `bun run dev --filter=api`

**Passo a passo executável:**
1. Enviar `POST /webhook/:tenantId/whatsapp/:instanceId` simulando mensagem que aciona nó `transfer` no flow
   - **Resultado esperado:** Resposta 200. No banco: `conversations` com status `waiting_human`. No Valkey: evento `conversation.handed_off` publicado no canal `domain-events:{tenantId}`
2. Conectar WebSocket em `ws://localhost:3000/ws/conversations?tenantId=<tenantId>`
   - **Resultado esperado:** Conexão aceita. Se evento foi publicado antes da conexão, verificar via logs que o evento foi emitido
3. Enviar `POST /webhook/chatwoot` com payload `{ "event": "conversation_status_changed", "status": "open", "id": <chatwootConversationId> }` e header de token válido
   - **Resultado esperado:** Resposta 200. No banco: conversation status atualizado para `human_active`. WebSocket recebe notificação `{ type: "conversation.human_active" }`
4. Enviar `POST /webhook/chatwoot` com payload `{ "event": "message_created", "message_type": "outgoing", "content": "Olá, como posso ajudar?", "conversation": { "id": <chatwootConversationId> } }` e header de token válido
   - **Resultado esperado:** Resposta 200. Mensagem "Olá, como posso ajudar?" enviada ao WhatsApp do usuário via provider (verificável via logs do sender)
5. Enviar `POST /webhook/chatwoot` com payload `{ "event": "conversation_status_changed", "status": "resolved", "id": <chatwootConversationId> }` e header de token válido
   - **Resultado esperado:** Resposta 200. No banco: conversation status `bot`. Session: `current_node_id = null`, `mode = 'bot'`, `data = {}`. WebSocket recebe `{ type: "conversation.bot_resumed" }`
6. Enviar nova mensagem do usuário via webhook WhatsApp
   - **Resultado esperado:** Flow reinicia do nó inicial. Resposta do bot enviada normalmente

**Critério de aprovação do cenário:**
- [ ] Todos os 6 passos executados com resultados esperados confirmados

---

### Cenário 2 — Segurança do webhook Chatwoot

**Objetivo:** Validar que o endpoint rejeita webhooks com token inválido.

**Pré-requisitos:**
- [ ] API rodando

**Passo a passo executável:**
1. Enviar `POST /webhook/chatwoot` sem header de autenticação
   - **Resultado esperado:** Resposta 401
2. Enviar `POST /webhook/chatwoot` com token inválido no header
   - **Resultado esperado:** Resposta 401
3. Enviar `POST /webhook/chatwoot` com token válido e evento desconhecido `{ "event": "unknown_event" }`
   - **Resultado esperado:** Resposta 200, nenhum processamento (log debug)

**Critério de aprovação do cenário:**
- [ ] Token inválido/ausente sempre retorna 401
- [ ] Eventos desconhecidos são ignorados graciosamente

---

### Cenário 3 — WebSocket isolamento multi-tenant

**Objetivo:** Validar que WebSocket envia eventos apenas para o tenant correto.

**Pré-requisitos:**
- [ ] API rodando com pelo menos 2 tenants configurados

**Passo a passo executável:**
1. Conectar WebSocket A com `tenantId=tenant-1`
2. Conectar WebSocket B com `tenantId=tenant-2`
3. Provocar hand-off no `tenant-1` (via webhook WhatsApp)
   - **Resultado esperado:** WebSocket A recebe evento. WebSocket B NÃO recebe
4. Conectar WebSocket C sem `tenantId`
   - **Resultado esperado:** Conexão rejeitada com código 4001

**Critério de aprovação do cenário:**
- [ ] Isolamento de tenant verificado no WebSocket

---

## Checklist Final da Sprint

- [ ] Todos os sets concluídos e aprovados
- [ ] Todos os critérios de aceite validados
- [ ] Seção `Testes Manuais de Entrega (Passo a Passo Executável)` preenchida, executável e detalhada
- [ ] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [ ] Decisões técnicas novas registradas em `docs/decisions/`
- [ ] Sem débito técnico não documentado
- [ ] Débitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolução
- [ ] RNs respeitadas em toda implementação
