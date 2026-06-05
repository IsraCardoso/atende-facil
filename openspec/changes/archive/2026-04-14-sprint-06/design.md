## Context

Archived implementation of Sprint 06 — Dashboard de Atendimento (Inbox via Chatwoot). Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *O atendente acessa o painel, vê as conversas aguardando atendimento via Chatwoot embutido, assume uma conversa, responde e encerra — tudo sem sair do sistema.*

Entregar o primeiro entregável visível ao usuário final: uma página de Inbox que embute o Chatwoot via iframe com SSO assinado pelo backend, com fallback via deep-link direto para a conversa. Backend fornece endpoints auxiliares de listagem/detalhe paginados e geração segura de URLs de acesso ao Chatwoot.

---

### Non-Goals
- Chat proprio (UI de mensagens implementada do zero)
- Config Chatwoot por tenant (debito tecnico da sprint 05)
- DrizzleConversationRepository (persistencia real — permanece in-memory nesta sprint)
- Editor visual de fluxos
- Suporte a midia (imagens, audio, video)
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Backend Wiring + Endpoints de Suporte]
Rodada 2: [SET-B: Acesso Chatwoot (SSO + URLs)]
Rodada 3: [SET-C: Fundacao Frontend]
Rodada 4: [SET-D: Inbox Page com Chatwoot]
Rodada 5: [SET-E: Testes e Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05 | SET-A | — |
| SET-C | T06, T07, T08 | — | — |
| SET-D | T09, T10 | SET-B, SET-C | — |
| SET-E | T11, T12 | SET-D | — |

---
```

- **SET-A**: Backend Wiring + Endpoints de Suporte]
- **SET-B**: Acesso Chatwoot (SSO + URLs)]
- **SET-C**: Fundacao Frontend]
- **SET-D**: Inbox Page com Chatwoot]
- **SET-E**: Testes e Fechamento]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
