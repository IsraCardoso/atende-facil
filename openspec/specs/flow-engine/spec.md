## Purpose

Deterministic conversational flow execution, nodes, and validation.

Migrated from legacy business rules: RN-008, RN-009, RN-010.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-008 (legacy: RN-008)
O processamento de mensagem do flow engine MUST ser puro: recebe `session`, `message` e `flow`, e retorna apenas o novo estado e as acoes/eventos calculados, sem acoplamento com DB, HTTP, DI container ou I/O externo.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: RN-009 (legacy: RN-009)
The system MUST enforce the following: Cada tipo de no possui semantica fixa e obrigatoria: `message` envia texto e avanca; `option` aceita resposta numerica ou alias textual e navega; `input` coleta dado em `Session.data`; `transfer` muda modo para `waiting_human`; `end` encerra fluxo.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: RN-010 (legacy: RN-010)
The system MUST enforce the following: Um fluxo so pode ser considerado apto para ativacao quando passar na validacao estrutural completa: no inicial existente, destinos validos, campos obrigatorios por tipo, ausencia de no orfao, e ausencia de ciclo automatico sem escape. Warnings estruturais tambem bloqueiam ativacao. As mensagens de cada issue de validação MUST ser em português correto e acentuado, descrevendo o problema na perspectiva de quem monta o fluxo no editor visual — sem citar nomes de campo/variável internos (`startNodeId`, `fieldKey`, `nextNodeId` etc.). `code` e `details` permanecem como contrato programático estável; `message` é apenas apresentação.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Issue de validação exibida ao usuário
- **WHEN** `validateFlowDefinition` retorna uma issue de qualquer `code`
- **THEN** o campo `message` é uma frase em português acentuado, sem jargão de nome de campo interno, compreensível por quem não é desenvolvedor

