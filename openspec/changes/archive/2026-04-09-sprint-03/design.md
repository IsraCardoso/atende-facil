## Context

Archived implementation of Sprint 03 - Flow Engine (Dominio Puro). Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *Permitir que o motor de fluxo conversacional processe mensagens, navegue entre nos, colete dados e realize handoff humano com regras deterministicas e sem acoplamento de infraestrutura.*

Entregar o core conversacional no `packages/flow` com modelagem de dominio, processamento puro de mensagens por tipo de no (`message`, `option`, `input`, `transfer`, `end`), validacao de fluxo antes de ativacao e contratos de integracao para as proximas sprints sem dependencias de banco, HTTP ou SDKs externos.

---

### Non-Goals
- ❌ Persistencia de sessao em banco
- ❌ Endpoints HTTP do flow engine
- ❌ Integracao real com Evolution API
- ❌ Dashboard frontend de edicao/operacao de fluxo
- ❌ IA generativa para resposta automatica
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Modelagem de Dominio e Contratos Base]
Rodada 2: [SET-B: Engine de Processamento e Telemetria]
Rodada 3: [SET-C: Validacao Estrutural e Regras de Ativacao]
Rodada 4: [SET-D: Integracao Final e Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | - | - |
| SET-B | T04, T05, T06 | SET-A | - |
| SET-C | T07, T08, T09 | SET-B | - |
| SET-D | T10, T11, T12 | SET-C | - |

---
```

- **SET-A**: Modelagem de Dominio e Contratos Base]
- **SET-B**: Engine de Processamento e Telemetria]
- **SET-C**: Validacao Estrutural e Regras de Ativacao]
- **SET-D**: Integracao Final e Qualidade]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
