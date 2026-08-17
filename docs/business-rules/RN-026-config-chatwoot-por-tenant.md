# RN-026 — Config Chatwoot por tenant

> **Sprint:** 09 | **Status:** Em implementacao
> **Categoria:** Multi-tenant — Integracoes

---

## Contexto

Config Chatwoot esta em variaveis de ambiente globais (`CHATWOOT_API_URL`, `CHATWOOT_API_TOKEN`, etc.), compartilhada por todos os tenants. Em producao multi-tenant, cada tenant precisa de suas proprias credenciais Chatwoot.

---

## Regra

### R1 — Persistencia per-tenant

Credenciais Chatwoot DEVEM ser armazenadas por tenant em tabela `tenant_integrations`:
- `tenant_id` (FK para tenants)
- `provider` (varchar, ex: "chatwoot")
- `config` (JSONB contendo: `apiUrl`, `apiToken`, `accountId`, `appUrl`, `ssoSecret`, `webhookToken`, `platformToken` — Platform App token, distinto do `apiToken` de mensageria; habilita SSO federado per-tenant, RN-019)
- `is_active` (boolean)
- Unique constraint: `(tenant_id, provider)`

### R2 — Resolucao per-tenant

Use cases que precisam de `ChatwootPort` DEVEM receber uma factory `(tenantId) => ChatwootPort` ao inves de um singleton global. A factory:
1. Busca config do tenant via `TenantIntegrationConfigPort`.
2. Cria `ChatwootHttpAdapter` com credenciais do tenant.
3. Mantém cache interno por tenantId para evitar recriacao.

### R3 — Fallback para env global

Se um tenant NAO tiver config de Chatwoot cadastrada:
- Usar credenciais das variaveis de ambiente globais como fallback.
- Logar warning indicando que tenant esta usando config global.
- Isso garante compatibilidade com setup existente durante migracao.

### R4 — Webhook per-tenant

Validacao do webhook Chatwoot DEVE considerar token per-tenant:
1. Extrair `tenant_id` do payload Chatwoot (via `custom_attributes.tenant_id` ja enviado pelo adapter).
2. Buscar `webhookToken` do tenant.
3. Validar header contra o token do tenant.
4. Se `tenant_id` nao presente no payload: usar token global do env (compatibilidade).

### R5 — ChatwootAccessService per-tenant

Geração de URLs de acesso (embed, deep link, SSO) DEVE usar config do tenant:
- `appUrl`, `ssoSecret`, `accountId` do tenant.
- Fallback para env global se tenant sem config.
- SSO federado via Platform API (RN-019): `GetChatwootSsoUrlUseCase` resolve o `ChatwootPlatformPort` per-tenant via `createChatwootPlatformPortFactory`, usando `apiUrl`+`platformToken`+`accountId` da config do tenant; fallback para env global (`CHATWOOT_PLATFORM_TOKEN`) se ausente.

### R6 — Segurança de credenciais

- Credenciais Chatwoot NUNCA devem ser expostas em endpoints da API.
- `apiToken` e `ssoSecret` sao dados sensiveis — em producao, considerar encryption at rest.
- Endpoints de CRUD de integracao (futuro) devem mascarar tokens em respostas.

---

## Excecoes

- Em modo single-tenant (`MULTI_TENANT=false`), config global do env e suficiente.
- Tenants sem Chatwoot configurado podem operar sem painel de atendimento humano (modo bot-only).
