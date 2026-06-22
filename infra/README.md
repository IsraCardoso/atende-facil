# Infra (`infra`)

## Desenvolvimento local

```bash
bun run infra:up      # Postgres + Valkey + Evolution (dev)
bun run infra:down
bun run db:migrate
```

- [`docker-compose.yml`](docker-compose.yml) — dados e Evolution local
- [`docker-compose.chatwoot.yml`](docker-compose.chatwoot.yml) — Chatwoot opcional (`-f` extra)

Portas: `POSTGRES_HOST_PORT` (5432), `VALKEY_HOST_PORT` (6379), Evolution `8081`.

## Produção (VPS / Coolify)

- [`docker-compose.production.yml`](docker-compose.production.yml) — stack completa de referência
- Dockerfiles em [`docker/`](docker/)
- Guia: [`docs/guides/deploy-coolify-hostinger.md`](../docs/guides/deploy-coolify-hostinger.md)

## Arquivos Docker

| Arquivo | Serviço |
|---------|---------|
| `docker/Dockerfile.api` | API Bun |
| `docker/Dockerfile.worker` | Worker BullMQ |
| `docker/Dockerfile.web` | SPA + nginx |
| `docker/nginx-web.conf` | Proxy `/api` e `/ws` |
| `docker/postgres-init.sql` | DBs `evolution` e `chatwoot` |
