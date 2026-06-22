## Context

Archived implementation of Sprint 05 — Hand-off Humano + Sistema de Eventos. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *Quando um fluxo determina que é hora de um humano atender, o sistema cria uma conversa, muda o status, notifica o painel em tempo real via WebSocket e pausa o bot. Mensagens de agentes entram exclusivamente pelo Chatwoot, passam pelo backend e saem pelo provider WhatsApp correto.*

Entregar a entidade `Conversation` separada de `Session`, o sistema de eventos de domínio via Valkey Pub/Sub, a integração reversa com Chatwoot (receber webhooks do Chatwoot para sincronizar mensagens e status), WebSocket para notificações em tempo real, e use cases de transição de estado (`AssignConversation`, `CloseConversation`).

---

### Non-Goals
- ❌ Painel de atendimento humano no frontend (usa Chatwoot como inbox)
- ❌ Editor visual de fluxos no frontend
- ❌ Suporte a mídia (imagens, áudio, vídeo) — apenas texto
- ❌ IA generativa (RAG)
- ❌ Config Chatwoot por tenant (débito técnico — ver seção)
- ❌ Mapeamento `assignedTo` → userId interno (débito técnico — ver seção)
- ❌ Migração de repositórios in-memory de auth para Drizzle
---

## Decisions

### Execution plan (legacy SETs)

```
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
```

- **SET-A**: Fundação de Domínio — Conversation + Eventos]
- **SET-B**: Infraestrutura — Repositório e Eventos Valkey]
- **SET-C**: Use Cases de Transição de Estado]
- **SET-D**: Chatwoot Webhook Reverso]
- **SET-E**: WebSocket + Wiring DI]
- **SET-F**: Testes e Fechamento de Qualidade]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
