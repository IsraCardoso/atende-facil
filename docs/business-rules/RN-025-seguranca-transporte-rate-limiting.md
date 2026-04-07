# RN-025 — Seguranca de transporte e rate limiting

> **Sprint:** 09 | **Status:** Em implementacao
> **Categoria:** Seguranca

---

## Contexto

O WebSocket (`ws /ws/conversations`) aceita conexoes sem autenticacao — `tenantId` vem da query string, permitindo que qualquer cliente escute broadcasts de qualquer tenant. Nenhum endpoint possui rate limiting, expondo a aplicacao a brute force e DDoS basico. Rotas de flow aceitam body sem validacao de schema.

---

## Regra

### R1 — WebSocket autenticado via JWT

- Toda conexao WebSocket DEVE apresentar token JWT valido.
- Token pode ser enviado via header `Authorization: Bearer <token>` ou query param `?token=<jwt>`.
- O servidor DEVE extrair `tenantId` do payload JWT, nunca da query string.
- Conexoes sem token ou com token invalido DEVEM ser rejeitadas com close code `4401`.
- Broadcasts continuam isolados por `tenantId` extraido do token.

### R2 — Rate limiting em rotas publicas

Rotas publicas e sensiveis DEVEM ter rate limiting por IP:

| Rota | Limite | Janela |
|---|---|---|
| `POST /auth/login` | 5 requests | 1 minuto |
| `POST /auth/register-tenant` | 3 requests | 1 minuto |
| `POST /webhook/*` | 100 requests | 1 minuto |
| Rotas de flow CRUD | 30 requests | 1 minuto |

- Requests que excedem o limite DEVEM receber HTTP 429 com header `Retry-After`.
- Implementacao via middleware Elysia (`onBeforeHandle`).
- Storage: `CachePort` (Valkey em producao, in-memory em dev).

### R3 — Validacao de input nas rotas de flow

- `POST /flows` (create): body DEVE conter `name` (string obrigatoria).
- `PUT /flows/:id` (update definition): body DEVE conter `definition` (objeto com `nodes` e `edges`).
- Requests com body invalido DEVEM receber HTTP 400 com mensagem descritiva.
- Validacao via `t.Object()` do Elysia (TypeBox) declarada na rota.

---

## Excecoes

- Health check (`GET /health`) nao tem rate limiting.
- Rotas autenticadas com JWT valido podem ter limites mais altos.
- Em ambiente de desenvolvimento (`NODE_ENV=development`), rate limiting pode ser desabilitado via flag.
