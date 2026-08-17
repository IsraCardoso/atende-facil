## Context

Archived implementation of Sprint 09 — Resolucao de Debitos Tecnicos (Expandida). Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *O sistema deixa de usar repositorios in-memory em runtime, ganha seguranca real (JWT no WebSocket, rate limiting), config Chatwoot por tenant, consistencia session/conversation, cache de flow ativo em Valkey, worker basico funcional e primeiros testes de integracao com Testcontainers.*

Resolver todos os debitos tecnicos de Categoria 1 (Critico), 2 (Alto) e 3 (Medio) acumulados das Sprints 01 a 08, garantindo que o sistema esteja pronto para deploy real.

---

### Non-Goals
- Extracao de hooks do `flow-editor.tsx`
- PUT/DELETE no `createApiClient` generico
- Cobertura automatizada no CI
- Frontend: testes de hooks e testes UI significativos
- Mapear `assignedTo` para userId interno (feature futura)
---

## Decisions

### Execution plan (legacy SETs)

```
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
```

- **SET-A**: Repos Drizzle Auth]
- **SET-B**: Repos Drizzle WhatsApp/Conversation/Flow]
- **SET-C**: Seguranca]
- **SET-D**: Chatwoot per-tenant + Sync session/conversation]
- **SET-E**: Valkey Flow Cache + Worker]
- **SET-F**: Testes + Fechamento]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
