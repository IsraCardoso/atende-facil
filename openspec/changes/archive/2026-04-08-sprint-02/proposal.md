## Why
*Permitir cadastro de tenant, autenticacao por JWT Bearer e autorizacao por papel em endpoints protegidos, com isolamento multi-tenant garantido por token.*

Entregar a base de identidade e acesso da plataforma com modelo escalavel de vinculacao usuario-tenant (N:N), autenticao com BetterAuth + JWT Bearer, middleware de autenticacao/autorizacao no Elysia, casos de uso de onboarding/login/usuario atual e abstractions de cache/log (Ports + Adapters + Services) funcionando em producao local.

---
## What Changes
Historical delivery from **sprint-02** (archived migration).
- Modelo de identidade multi-tenant escalavel
- Autenticacao com JWT Bearer
- RBAC funcional (`admin`, `manager`, `agent`)
- Casos de uso de auth implementados
- Ports, Adapters e Services de cross-cutting
- Suporte a single-tenant
- Qualidade automatizada da sprint
- Tratamento padrao de erros
## Capabilities
### New Capabilities
- `multi-tenant`: requirements from sprint-02
- `authentication`: requirements from sprint-02
- `authorization`: requirements from sprint-02
- `architecture-foundation`: requirements from sprint-02
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-02`](../../docs/sprints/sprint-02.md)
- Business rules: RN-004, RN-005, RN-006, RN-007
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-02.md`.