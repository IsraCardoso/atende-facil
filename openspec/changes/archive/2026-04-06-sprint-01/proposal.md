## Why
*Entregar uma base técnica reproduzível e consistente para evoluir o produto com segurança nas próximas sprints.*

Configurar o monorepo com Turborepo + Bun, infraestrutura local com PostgreSQL e Valkey, app `api` com healthcheck e observabilidade mínima, package `db` com migration inicial, base de container DI tipado e cadeia de qualidade (TypeScript strict, Biome e Vitest) funcionando na raiz.

---
## What Changes
Historical delivery from **sprint-01** (archived migration).
- Monorepo base com apps e packages
- API com Elysia + `/health`
- Infra local Docker
- Banco com Drizzle + migration inicial
- Observabilidade mínima
- Tooling de qualidade
- Base de DI container
## Capabilities
### New Capabilities
- `architecture-foundation`: requirements from sprint-01
- `configuration`: requirements from sprint-01
- `observability`: requirements from sprint-01
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-01`](../../docs/sprints/sprint-01.md)
- Business rules: RN-001, RN-002, RN-003
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-01.md`.