## Context

Archived implementation of Sprint 07 — CRUD API de Flows com Persistencia. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *O admin do tenant consegue criar, editar, listar, validar, publicar e ativar fluxos via API REST, com persistencia real no PostgreSQL.*

Entregar toda a camada backend de gerenciamento de flows: tabela no banco, entidade de dominio com ciclo de vida (draft/published/active/archived), repositorio Drizzle, use cases CRUD e lifecycle, e endpoints HTTP autenticados com tenant isolation.

---

### Non-Goals
- Editor visual de fluxos (Sprint 08)
- Simulacao de fluxos (Sprint 08)
- Versionamento de flows com historico
- DrizzleRepository para demais entidades (sessions, conversations, etc.)
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Schema + Dominio + Ports]
Rodada 2: [SET-B: Repositories + CRUD Use Cases]
Rodada 3: [SET-C: Lifecycle Use Cases + Routes + DI]
Rodada 4: [SET-D: Testes + Integracao + Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06, T07 | SET-A | — |
| SET-C | T08, T09, T10, T11, T12 | SET-B | — |
| SET-D | T13, T14, T15 | SET-C | — |

---
```

- **SET-A**: Schema + Dominio + Ports]
- **SET-B**: Repositories + CRUD Use Cases]
- **SET-C**: Lifecycle Use Cases + Routes + DI]
- **SET-D**: Testes + Integracao + Fechamento]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
