## Why
*O admin do tenant consegue criar, editar, listar, validar, publicar e ativar fluxos via API REST, com persistencia real no PostgreSQL.*

Entregar toda a camada backend de gerenciamento de flows: tabela no banco, entidade de dominio com ciclo de vida (draft/published/active/archived), repositorio Drizzle, use cases CRUD e lifecycle, e endpoints HTTP autenticados com tenant isolation.

---
## What Changes
Historical delivery from **sprint-07** (archived migration).
- Tabela `flows` com migration Drizzle
- Entidade FlowEntity com ciclo de vida
- DrizzleFlowRepository + InMemoryFlowRepository
- CRUD completo (Create, Update, Get, List, Delete)
- Lifecycle (Publish, Activate, Deactivate, Archive)
- Testes unitarios dos use cases
## Capabilities
### New Capabilities
- `flows`: requirements from sprint-07
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-07`](../../docs/sprints/sprint-07.md)
- Business rules: RN-020, RN-021
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-07.md`.