## Why
*Quando um fluxo determina que é hora de um humano atender, o sistema cria uma conversa, muda o status, notifica o painel em tempo real via WebSocket e pausa o bot. Mensagens de agentes entram exclusivamente pelo Chatwoot, passam pelo backend e saem pelo provider WhatsApp correto.*

Entregar a entidade `Conversation` separada de `Session`, o sistema de eventos de domínio via Valkey Pub/Sub, a integração reversa com Chatwoot (receber webhooks do Chatwoot para sincronizar mensagens e status), WebSocket para notificações em tempo real, e use cases de transição de estado (`AssignConversation`, `CloseConversation`).

---
## What Changes
Historical delivery from **sprint-05** (archived migration).
- Entidade `Conversation` com tabela e migration
- Sistema de eventos via Valkey Pub/Sub
- Transições de estado atômicas
- Chatwoot webhook reverso
- WebSocket de notificações
- Use cases `AssignConversation` e `CloseConversation`
- Testes E2E do fluxo completo
## Capabilities
### New Capabilities
- `conversations`: requirements from sprint-05
- `domain-events`: requirements from sprint-05
- `chatwoot-integration`: requirements from sprint-05
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-05`](../../docs/sprints/sprint-05.md)
- Business rules: RN-014, RN-015, RN-016
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-05.md`.