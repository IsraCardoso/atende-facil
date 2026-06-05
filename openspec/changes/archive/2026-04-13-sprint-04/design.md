## Context

Archived implementation of Sprint 04 — Integração WhatsApp (Agnóstica de Provedor) + Chatwoot. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *Mensagens reais do WhatsApp chegam ao sistema, são processadas pelo flow engine e respostas são enviadas de volta ao usuário, com suporte a múltiplos provedores por tenant/instância e hand-off para atendimento humano via Chatwoot.*

Entregar a camada de mensageria no `infrastructure` da API com Ports/Adapters para 4 provedores (Evolution API, Z-API, Uazapi, Meta Cloud API), resolução dinâmica por instância/tenant, processamento fim-a-fim com lock de sessão e idempotência de webhook, e integração com Chatwoot como camada de atendimento humano desacoplada.

---

### Non-Goals
- ❌ Dashboard frontend de gerenciamento de instâncias WhatsApp
- ❌ Editor visual de fluxos no frontend
- ❌ IA generativa para resposta automática (RAG)
- ❌ Suporte a mídia (imagens, áudio, vídeo) — apenas texto nesta sprint
- ❌ Painel de atendimento humano próprio (usa Chatwoot)
- ❌ Agendamento de fluxos por horário
- ❌ Migração dos repositórios in-memory de auth para Drizzle (sprint futura)
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Fundação de Domínio e Persistência]
Rodada 2: [SET-B: Camada Agnóstica de Provider]
Rodada 3: [SET-C: Sessão, Lock e Idempotência]
Rodada 4: [SET-D: Orquestração Principal e Chatwoot]
Rodada 5: [SET-E: Endpoints Webhook e Wiring DI]
Rodada 6: [SET-F: Testes Integrados e Fechamento de Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06 | SET-A | — |
| SET-C | T07, T08, T09 | SET-A | — |
| SET-D | T10, T11, T12 | SET-B, SET-C | — |
| SET-E | T13, T14, T15 | SET-D | — |
| SET-F | T16, T17, T18 | SET-E | — |

---
```

- **SET-A**: Fundação de Domínio e Persistência]
- **SET-B**: Camada Agnóstica de Provider]
- **SET-C**: Sessão, Lock e Idempotência]
- **SET-D**: Orquestração Principal e Chatwoot]
- **SET-E**: Endpoints Webhook e Wiring DI]
- **SET-F**: Testes Integrados e Fechamento de Qualidade]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
