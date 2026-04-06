# DB (`packages/db`)

Pacote responsavel por persistencia e infraestrutura de dados:

- configuracao tipada de ambiente (`DATABASE_URL`, `REDIS_URL`);
- schema e migration com Drizzle ORM;
- conexao com PostgreSQL;
- validacao de conectividade com Valkey.

---

## Estrutura principal

```text
src/
  config.ts
  database.ts
  valkey.ts
  schema/
  scripts/
drizzle/
drizzle.config.ts
```

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run db:generate` (na raiz) | Gera migrations Drizzle |
| `bun run db:migrate` (na raiz) | Aplica migrations |
| `bun run valkey:check` (na raiz) | Valida conexao com Valkey |
| `bun run build --filter=db` (na raiz) | Build/typecheck |
| `bun run test --filter=db` (na raiz) | Testes unitarios |
| `bun run lint --filter=db` (na raiz) | Lint/format check |

---

## Variaveis de ambiente essenciais

- `DATABASE_URL` (formato `postgres://` ou `postgresql://`)
- `REDIS_URL` (formato `redis://`)

---

## Tipagem forte aplicada

- `DatabaseUrl` e `ValkeyUrl` como branded types;
- validacao fail-fast na carga de configuracao;
- mensagens de erro explicitas para falhas de conexao.

---

## Observacoes operacionais

- Migration inicial cria a tabela `tenants`.
- Em ambientes com porta ocupada no host, usar `POSTGRES_HOST_PORT`/`VALKEY_HOST_PORT` no compose.

