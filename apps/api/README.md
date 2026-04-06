# API (`apps/api`)

Backend HTTP do monorepo, implementado com **Elysia**, seguindo arquitetura hexagonal:

- `domain/`
- `application/`
- `infrastructure/`
- `interface/`

Atualmente contem o bootstrap da API, `GET /health`, validacao de ambiente e logging JSON com `correlationId`.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run dev --filter=api` (na raiz) | Sobe API em watch mode |
| `bun run build --filter=api` (na raiz) | Typecheck/build da API |
| `bun run test --filter=api` (na raiz) | Testes unitarios da API |
| `bun run lint --filter=api` (na raiz) | Lint/format check da API |

---

## Variaveis obrigatorias

- `NODE_ENV` (`development` \| `staging` \| `production`)
- `API_HOST`
- `API_PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `LOG_LEVEL` (`debug` \| `info` \| `warn` \| `error`)

Se faltar variavel obrigatoria, a API falha cedo com erro explicito.

---

## Endpoint atual

### `GET /health`

- retorna `200` com payload `{ status: "ok", environment }`
- inclui header `x-correlation-id`
- registra log estruturado em JSON

---

## Observabilidade

- Logger JSON sem `console.log`
- Campos base: `timestamp`, `level`, `message`, `correlationId`, `context`

---

## Regras de contribuicao

- Evitar cast desnecessario na borda HTTP.
- Manter tipagem especifica em contratos de entrada/saida.
- Nao violar a dependency rule (ex.: `domain` nao depende de `infrastructure`).

