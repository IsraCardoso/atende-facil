## Why
*O atendente acessa o painel, vê as conversas aguardando atendimento via Chatwoot embutido, assume uma conversa, responde e encerra — tudo sem sair do sistema.*

Entregar o primeiro entregável visível ao usuário final: uma página de Inbox que embute o Chatwoot via iframe com SSO assinado pelo backend, com fallback via deep-link direto para a conversa. Backend fornece endpoints auxiliares de listagem/detalhe paginados e geração segura de URLs de acesso ao Chatwoot.

---
## What Changes
Historical delivery from **sprint-06** (archived migration).
- Wiring do módulo conversation no bootstrap da API
- Endpoints auxiliares `GET /conversations` e `GET /conversations/:id`
- Endpoint de acesso Chatwoot (embed URL + deep-link)
- Fundação frontend (Vite + Tailwind + roteamento + tema)
- Página Inbox com Chatwoot embutido + fallback
- Testes unitários e E2E dos fluxos críticos
## Capabilities
### New Capabilities
- `chatwoot-integration`: requirements from sprint-06
- `conversations`: requirements from sprint-06
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-06`](../../docs/sprints/sprint-06.md)
- Business rules: RN-017, RN-018, RN-019
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-06.md`.