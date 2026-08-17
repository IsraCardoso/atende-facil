## Context

Archived implementation of Sprint 08 — Editor Visual de Fluxos (React Flow). Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *O admin do tenant consegue criar e editar fluxos visualmente, arrastando nos e conectando-os, com validacao em tempo real, save manual e simulacao local.*

Entregar o editor visual de fluxos usando React Flow, com custom nodes para cada tipo (message, option, input, transfer, end), serializacao bidirecional, auto-save em localStorage, save manual via API, validacao client-side, simulacao local e undo/redo.

---

### Non-Goals
- Versionamento com diff visual
- Importacao/exportacao de flows (JSON file)
- Colaboracao em tempo real
- Temas customizaveis para o editor
---

## Decisions

### Execution plan (legacy SETs)

```
```
Rodada 1: [SET-A: Setup + Listagem + Rotas]
Rodada 2: [SET-B: Editor + Custom Nodes + Serializacao]
Rodada 3: [SET-C: Save + Validacao + Undo/Redo]
Rodada 4: [SET-D: Simulacao + Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06, T07 | SET-A | — |
| SET-C | T08, T09, T10 | SET-B | — |
| SET-D | T11, T12, T13 | SET-C | — |

---
```

- **SET-A**: Setup + Listagem + Rotas]
- **SET-B**: Editor + Custom Nodes + Serializacao]
- **SET-C**: Save + Validacao + Undo/Redo]
- **SET-D**: Simulacao + Fechamento]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
