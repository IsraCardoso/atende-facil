# Infra (`infra`)

Infraestrutura local para desenvolvimento do monorepo.

Atualmente inclui:

- PostgreSQL 16
- Valkey 8
- healthchecks para ambos os servicos

---

## Arquivos

- `docker-compose.yml` — composicao local dos servicos de dados

---

## Comandos recomendados (a partir da raiz)

```bash
bun run infra:up
bun run infra:ps
bun run infra:down
```

---

## Portas

- Postgres host port: `POSTGRES_HOST_PORT` (padrao `5432`)
- Valkey host port: `VALKEY_HOST_PORT` (padrao `6379`)

Se a porta padrao estiver ocupada, sobrescreva antes de subir:

```bash
# exemplo (Windows cmd)
set POSTGRES_HOST_PORT=55432 && set VALKEY_HOST_PORT=56379 && bun run infra:up
```

---

## Boas praticas

- Nao adicionar servicos fora do escopo da sprint sem alinhamento.
- Sempre validar `healthy` antes de executar migracoes.
- Derrubar ambiente ao final de validacoes locais para evitar conflito de porta.

