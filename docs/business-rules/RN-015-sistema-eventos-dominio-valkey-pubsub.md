# RN-015 — Sistema de eventos de domínio (Valkey Pub/Sub)

> **Status:** `Ativa`
> **Domínio:** Infraestrutura / Eventos
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Contexto

O sistema precisa notificar componentes desacoplados (WebSocket, logs, futuro worker) quando transições de estado ocorrem nas conversas. Um EventEmitter in-process não funcionaria com múltiplas instâncias da API. Valkey Pub/Sub provê distribuição de eventos cross-instance.

---

## A Regra

**Eventos de domínio são publicados via Valkey Pub/Sub após persistência bem-sucedida. Nunca antes. Subscribers consomem eventos de forma desacoplada e idempotente.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Persistência bem-sucedida + transição de estado | Evento publicado no canal `domain-events:{tenantId}` |
| Persistência falha | Evento NÃO é publicado |
| Falha ao publicar evento | Log de erro, não impede a operação principal |
| Subscriber falha ao processar | Erro isolado, não afeta outros subscribers |
| Valkey indisponível | Publisher falha com log de erro, operação principal já foi persistida |

---

## Eventos obrigatórios

| Evento | Quando é emitido |
|---|---|
| `conversation.handed_off` | Flow engine retorna transfer, conversation muda para waiting_human |
| `conversation.human_active` | Agente assume conversa via Chatwoot |
| `conversation.bot_resumed` | Agente encerra conversa, conversation volta para bot |

---

## Exemplos

**✅ Válido:**
> Use case persiste conversation com status `waiting_human` → commit no banco OK → publica `conversation.handed_off` no Valkey → subscriber recebe e notifica WebSocket.

**❌ Inválido:**
> Use case publica evento `conversation.handed_off` → depois tenta persistir → persistência falha → evento já foi emitido com estado inconsistente.

---

## Impactos Técnicos

- **Validação:** Publicação ocorre exclusivamente dentro de use cases, após persistência
- **Afeta:** ValkeyDomainEventPublisher, ValkeyDomainEventSubscriber, WebSocket bridge, ProcessIncomingMessage, AssignConversation, CloseConversation
- **Conexões Valkey:** 3 separadas (cache, publisher, subscriber) — Pub/Sub exige conexão exclusiva

---

## Rastreabilidade

- **Solicitado por:** Requisito técnico (notificações real-time)
- **RNs relacionadas:** RN-014, RN-016
- **Sprints que implementaram:** sprint-05
- **Changelog:** docs/changelog/CHANGELOG.md
