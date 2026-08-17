# Worker (`apps/worker`)

Processo de processamento assincrono do monorepo. Nesta base inicial, o worker possui:

- bootstrap minimo;
- estrutura de pastas (`consumers`, `jobs`);
- testes unitarios basicos;
- padrao de qualidade alinhado ao restante do monorepo.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run dev --filter=worker` (na raiz) | Dev mode do worker |
| `bun run build --filter=worker` (na raiz) | Build/typecheck |
| `bun run test --filter=worker` (na raiz) | Testes unitarios |
| `bun run lint --filter=worker` (na raiz) | Lint/format check |

---

## Estrutura

```text
src/
  index.ts
  index.test.ts
  consumers/
  jobs/
```

---

## Diretrizes

- Nenhuma logica de negocio nesta sprint.
- Preparar contratos claros para evolucao de filas/eventos nas proximas sprints.
- Seguir tipagem forte para payloads de jobs quando introduzidos.

