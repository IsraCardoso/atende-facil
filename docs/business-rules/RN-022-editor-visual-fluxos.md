# RN-022 - Editor visual de fluxos

> **Status:** `Ativa`
> **Dominio:** Interface / UX
> **Criada em:** 2026-04-07 | **Atualizada em:** 2026-04-07

---

## Contexto

O admin precisa de uma interface visual para criar e editar fluxos conversacionais. Sem isso, a unica forma e manipular JSON manualmente via API, o que e impraticavel para usuarios nao tecnicos.

---

## A Regra

**O editor visual usa React Flow para renderizar nos e conexoes. Cada tipo de no (message, option, input, transfer, end) tem componente visual distinto com handles tipados. A serializacao entre React Flow e o formato do backend e bidirecional e sem perda de dados. Posicoes dos nos sao preservadas no JSON.**

---

## Regras de UX

| Regra | Descricao |
|---|---|
| Drag-and-drop | Arrastar nos da paleta para o canvas |
| Edicao inline | Sidebar de propriedades ao selecionar no |
| Save manual | Botao explicito para salvar no backend |
| Auto-save local | localStorage com debounce para backup |
| Unsaved indicator | Indicador visual quando ha alteracoes nao salvas |
| Validacao visual | Nos com erro tem borda vermelha |
| Undo/redo | Ctrl+Z/Ctrl+Y com historico de estados |

---

## Conexoes validas entre nos

| No de origem | Handles de saida | Destinos validos |
|---|---|---|
| Message | 1 saida (nextNodeId) | Qualquer no |
| Option | N saidas (1 por opcao) | Qualquer no |
| Input | 1 saida (nextNodeId) | Qualquer no |
| Transfer | 0 saidas | — (terminal) |
| End | 0 saidas | — (terminal) |

---

## Impactos Tecnicos

- **Validacao:** `apps/web/src/components/flow-editor/`, `apps/web/src/utils/flow-serializer.ts`
- **Afeta:** Frontend web (apps/web)

---

## Rastreabilidade

- **Solicitado por:** Produto
- **RNs relacionadas:** [RN-020](./RN-020-crud-ciclo-vida-flows.md), [RN-008](./RN-008-flow-engine-puro-deterministico.md)
- **Sprints que implementaram:** [sprint-08](../sprints/sprint-08.md)
