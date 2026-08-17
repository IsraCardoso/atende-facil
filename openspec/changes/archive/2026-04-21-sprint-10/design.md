## Context

Archived implementation of Sprint 10 — Agendamento e Automacoes por Horario. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *O admin do tenant configura quais fluxos ficam ativos em quais horarios e dias da semana, e o sistema troca automaticamente. Ao receber uma mensagem, o FlowResolver determina qual fluxo usar com base no horario atual do tenant.*

---

### Non-Goals
- Agendamento por data especifica (feriados)
- Recorrencia mensal ou anual
- Multiplos timezones por tenant
- Notificacoes de transicao de schedule
- Historico de ativacao de schedules
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Schema + Domain Types]
Rodada 2: [SET-B: FlowResolver + Repository]
Rodada 3: [SET-C: API Routes + Worker Cron]
Rodada 4: [SET-D: Frontend Calendar + Settings]
Rodada 5: [SET-E: Tests + Closing]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03, T04 | — | — |
| SET-B | T05, T06, T07, T08 | SET-A | — |
| SET-C | T09, T10, T11, T12 | SET-B | — |
| SET-D | T13, T14, T15, T16, T17 | SET-C | — |
| SET-E | T18, T19, T20 | SET-D | — |

---
```

- **SET-A**: Schema + Domain Types]
- **SET-B**: FlowResolver + Repository]
- **SET-C**: API Routes + Worker Cron]
- **SET-D**: Frontend Calendar + Settings]
- **SET-E**: Tests + Closing]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
