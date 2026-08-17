## Why
*Permitir que o motor de fluxo conversacional processe mensagens, navegue entre nos, colete dados e realize handoff humano com regras deterministicas e sem acoplamento de infraestrutura.*

Entregar o core conversacional no `packages/flow` com modelagem de dominio, processamento puro de mensagens por tipo de no (`message`, `option`, `input`, `transfer`, `end`), validacao de fluxo antes de ativacao e contratos de integracao para as proximas sprints sem dependencias de banco, HTTP ou SDKs externos.

---
## What Changes
Historical delivery from **sprint-03** (archived migration).
- Modelo de dominio do flow engine
- Processador de mensagens puro
- Suporte a opcoes numericas + aliases textuais
- Contratos de integracao e eventos de dominio
- Validacao de fluxo para ativacao
- Controle de ciclos
- Cobertura de testes do pacote
- Qualidade da sprint
## Capabilities
### New Capabilities
- `flow-engine`: requirements from sprint-03
### Modified Capabilities
- _(archived — see main specs at `openspec/specs/`)_
## Impact
- Legacy sprint: [`sprint-03`](../../docs/sprints/sprint-03.md)
- Business rules: RN-008, RN-009, RN-010
## Legacy Reference
> Full sprint document preserved at `docs/sprints/sprint-03.md`.