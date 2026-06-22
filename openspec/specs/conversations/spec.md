## Purpose

Conversation entity, state transitions, and auxiliary endpoints.

Migrated from legacy business rules: RN-014, RN-018.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Conversation entity e transições de estado (legacy: RN-014)
Toda interação que envolve hand-off humano MUST ser gerenciada por uma entidade Conversation separada da Session. As transições de status são atômicas, rastreáveis e validadas por máquina de estados.

#### Scenario: Nova sessão criada
- **WHEN** Nova sessão criada
- **THEN** Conversation criada automaticamente com status `bot`

#### Scenario: Flow engine retorna `transferred_to_human`
- **WHEN** Flow engine retorna `transferred_to_human`
- **THEN** Conversation muda para `waiting_human`, evento emitido

#### Scenario: Agente assume conversa (via Chatwoot)
- **WHEN** Agente assume conversa (via Chatwoot)
- **THEN** Conversation muda para `human_active`, evento emitido

#### Scenario: Agente encerra conversa (via Chatwoot)
- **WHEN** Agente encerra conversa (via Chatwoot)
- **THEN** Conversation volta para `bot`, sessão reinicia do zero, evento emitido

#### Scenario: Transição inválida (ex: bot → human_active)
- **WHEN** Transição inválida (ex: bot → human_active)
- **THEN** Erro retornado, nenhuma mudança persistida

#### Scenario: Mensagem recebida com conversation.status !== 'bot'
- **WHEN** Mensagem recebida com conversation.status !== 'bot'
- **THEN** Bot ignora, mensagem encaminhada ao Chatwoot

> **Legacy:** [`RN-014`](../../docs/business-rules/RN-014-conversation-entity-transicoes-estado.md) | **Status:** Ativa | **Domain:** Atendimento / Sessão
> **Implemented in:** `sprint-05`
> **Related:** RN-015, RN-016, RN-012
### Requirement: Endpoints Auxiliares de Conversations com Tenant Isolation (legacy: RN-018)
The system MUST enforce the following: Endpoints de listagem e detalhe de conversations devem sempre filtrar por `tenant_id` extraído do token autenticado. Listagens devem ser paginadas obrigatoriamente, com limite máximo por página.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

