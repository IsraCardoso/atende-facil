## Why
*Mensagens reais do WhatsApp chegam ao sistema, são processadas pelo flow engine e respostas são enviadas de volta ao usuário, com suporte a múltiplos provedores por tenant/instância e hand-off para atendimento humano via Chatwoot.*

Entregar a camada de mensageria no `infrastructure` da API com Ports/Adapters para 4 provedores (Evolution API, Z-API, Uazapi, Meta Cloud API), resolução dinâmica por instância/tenant, processamento fim-a-fim com lock de sessão e idempotência de webhook, e integração com Chatwoot como camada de atendimento humano desacoplada.

---
## What Changes
Historical delivery from **sprint-04** (archived migration).
- Contratos canônicos inbound/outbound/status
- Tabelas `sessions` e `whatsapp_instances`
- 4 adapters de provider completos
- ProviderFactory com resolução dinâmica
- Lock de sessão no Valkey
- Idempotência de webhook
- ProcessIncomingMessageUseCase
- Integração Chatwoot (hand-off)
- Endpoints webhook seguros
- Testes de integração e contrato
## Capabilities
### New Capabilities
- `whatsapp-integration`: requirements from sprint-04
- `chatwoot-integration`: requirements from sprint-04
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-04`](../../docs/sprints/sprint-04.md)
- Business rules: RN-011, RN-012, RN-013
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-04.md`.