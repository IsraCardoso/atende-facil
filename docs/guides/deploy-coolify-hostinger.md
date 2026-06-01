# Deploy na VPS Hostinger com Coolify

Guia para subir a stack completa: **API**, **Web**, **Worker**, **PostgreSQL**, **Valkey**, **Evolution API** e **Chatwoot**.

---

## Persistência de dados

| Dado | Onde fica | Se reiniciar só a API/Web |
|------|-----------|---------------------------|
| Tenants, usuários, flows, sessões, conversas | PostgreSQL (volume `postgres_data`) | **Mantém** |
| Cache de fluxo, locks, idempotência | Valkey (`valkey_data`) | Recalcula do Postgres |
| Sessão WhatsApp (Evolution) | Postgres `evolution` + volume `evolution_instances` | Mantém se volumes intactos |
| Anexos Chatwoot | Volume `chatwoot_storage` | Mantém |

**Perda de dados** só ocorre se apagar volumes Docker ou o banco sem backup.

Requisitos de produção na API:

- `NODE_ENV=production`
- `DATABASE_URL` e `REDIS_URL` obrigatórios
- `DEV_MOCK_WHATSAPP_SEND=false` (bloqueado em código)

---

## Pré-requisitos

- VPS Hostinger KVM com **mínimo 8 GB RAM** (stack completa)
- Domínio apontando para a VPS (ex.: `app.`, `api.`, `chat.`, `evo.`)
- [Coolify](https://coolify.io/) instalado na VPS
- Repositório Git acessível pelo Coolify

---

## 1. Bancos e cache (Coolify)

Crie no Coolify (ou use o `infra/docker-compose.production.yml`):

1. **PostgreSQL 16** com volume persistente
2. **Redis/Valkey 8** com volume persistente

Na primeira subida do Postgres, execute (ou use `infra/docker/postgres-init.sql` no compose):

```sql
CREATE DATABASE atende_facil;
CREATE DATABASE evolution;
CREATE DATABASE chatwoot;
```

---

## 2. Aplicações Bun (Coolify)

### API

| Campo | Valor |
|-------|-------|
| Dockerfile | `infra/docker/Dockerfile.api` |
| Context | raiz do repositório |
| Porta | 3000 |
| Health | `GET /health` |
| **Pre-deploy / Release** | `bun run db:migrate` (com `DATABASE_URL` do serviço) |

Variáveis: copie de [`.env.production.example`](../../.env.production.example).

Domínio sugerido: `https://api.seudominio.com`

### Worker

| Campo | Valor |
|-------|-------|
| Dockerfile | `infra/docker/Dockerfile.worker` |
| Variáveis | `DATABASE_URL`, `REDIS_URL`, `NODE_ENV=production` |

Sem porta pública.

### Web

| Campo | Valor |
|-------|-------|
| Dockerfile | `infra/docker/Dockerfile.web` |
| Env | `API_UPSTREAM=http://<host-interno-api>:3000` |
| Porta | 80 |

O nginx do container faz proxy de `/api` e `/ws` para a API.

Domínio sugerido: `https://app.seudominio.com`

`CORS_ORIGINS=https://app.seudominio.com` na API se usar domínios separados.

---

## 3. Evolution API

Use imagem `atendai/evolution-api:v2.1.1` ou serviço do compose.

- `SERVER_URL=https://evo.seudominio.com`
- `DATABASE_CONNECTION_URI` → banco `evolution`
- `AUTHENTICATION_API_KEY` → mesmo valor usado ao cadastrar instância no Atende Fácil
- Webhook da instância: `https://api.seudominio.com/webhook/evolution/{instanceId}`

---

## 4. Chatwoot

Imagem `chatwoot/chatwoot:v3.16.0` + **sidekiq**.

- `FRONTEND_URL` / `CHATWOOT_APP_URL`: `https://chat.seudominio.com`
- `SECRET_KEY_BASE`: string longa (64+ caracteres)
- `ENABLE_ACCOUNT_SIGNUP=false` em produção
- Banco: `chatwoot` no mesmo Postgres

Webhook no Chatwoot:

```text
https://api.seudominio.com/webhook/chatwoot?token=<CHATWOOT_WEBHOOK_TOKEN>
```

Eventos: `message_created`, `conversation_status_changed`.

---

## 5. Pós-deploy

1. Registrar tenant: `POST https://api.seudominio.com/auth/register-tenant`
2. Login no painel: `https://app.seudominio.com`
3. Criar e ativar fluxo
4. Cadastrar instância WhatsApp (Evolution) no tenant
5. Conectar QR na Evolution
6. Validar hand-off → Chatwoot → resposta no WhatsApp

---

## 6. Backup

- Snapshot do volume Postgres (Coolify ou Hostinger)
- Opcional: cron `pg_dump` para storage externo
- Volumes: `postgres_data`, `evolution_instances`, `chatwoot_storage`

---

## 7. Compose de referência (sem Coolify)

```bash
cp .env.production.example .env.production
# Edite secrets e URLs públicas

docker compose -f infra/docker-compose.production.yml --env-file .env.production up -d --build
docker compose -f infra/docker-compose.production.yml --env-file .env.production run --rm api bun run db:migrate
```

---

## Testes manuais de entrega

1. `GET https://api.seudominio.com/health` → `status: ok`
2. Login no web, listar flows após criar um
3. Reiniciar container **api** → flows ainda listados
4. Mensagem WhatsApp → bot responde
5. Hand-off → agente responde no Chatwoot → mensagem no celular

**Critério final:** stack sobe com volumes persistentes e fluxo bot + humano funciona com Evolution e Chatwoot configurados.
