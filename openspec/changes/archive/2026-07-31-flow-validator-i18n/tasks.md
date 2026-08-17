## 1. Mensagens de validação

- [x] 1.1 `packages/flow/src/validation.ts`: reescrever as 21 mensagens (`FlowValidationCode` × mensagem) em português acentuado, sem jargão de campo interno (`startNodeId`, `fieldKey`, `nextNodeId`, `token`)
- [x] 1.2 Conferido: `packages/flow/src/validation.test.ts` não referencia `.message` em nenhuma asserção; `code`/`details` inalterados

## 2. Validação

- [x] 2.1 `bun test` no workspace `flow` — 19 passed (3 arquivos)
- [x] 2.2 `bun run lint` (Biome) — 0 erros
- [x] 2.3 `tsc --noEmit` no workspace `flow` — 0 erros; `apps/api` (consumidor de `flow`) também revalidado — 0 erros, 45 testes relacionados passando
