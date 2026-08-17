## Why
*O admin do tenant configura quais fluxos ficam ativos em quais horarios e dias da semana, e o sistema troca automaticamente. Ao receber uma mensagem, o FlowResolver determina qual fluxo usar com base no horario atual do tenant.*

---
## What Changes
Historical delivery from **sprint-10** (archived migration).
- Schema `flow_schedules` com migration
- Timezone por tenant
- FlowResolverService
- CRUD de schedules
- Worker cron de avaliacao
- Endpoint admin de reavaliacao
- Tela de agendamentos
- Tela de configuracoes
## Capabilities
### New Capabilities
- `flow-scheduling`: requirements from sprint-10
- `multi-tenant`: requirements from sprint-10
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-10`](../../docs/sprints/sprint-10.md)
- Business rules: RN-027, RN-028
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-10.md`.