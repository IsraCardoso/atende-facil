## Why
*O sistema deixa de usar repositorios in-memory em runtime, ganha seguranca real (JWT no WebSocket, rate limiting), config Chatwoot por tenant, consistencia session/conversation, cache de flow ativo em Valkey, worker basico funcional e primeiros testes de integracao com Testcontainers.*

Resolver todos os debitos tecnicos de Categoria 1 (Critico), 2 (Alto) e 3 (Medio) acumulados das Sprints 01 a 08, garantindo que o sistema esteja pronto para deploy real.

---
## What Changes
Historical delivery from **sprint-09** (archived migration).
- Repos Drizzle para Auth
- Repos Drizzle para WhatsApp/Conversations
- Flow module conectado ao DB real
- WebSocket autenticado via JWT
- Rate limiting em rotas publicas
- Validacao HTTP nas rotas de flow
- Config Chatwoot por tenant
- Sync session.mode / conversation.status
- Cache de flow ativo em Valkey
- Worker app basico
- Testes de integracao com Testcontainers
- Testes unitarios faltantes
## Capabilities
### New Capabilities
- `persistence`: requirements from sprint-09
- `security`: requirements from sprint-09
- `chatwoot-integration`: requirements from sprint-09
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-09`](../../docs/sprints/sprint-09.md)
- Business rules: RN-024, RN-025, RN-026
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-09.md`.