## Purpose

Visual flow builder and local simulation.

Migrated from legacy business rules: RN-022, RN-023.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-022 (legacy: RN-022)
The system MUST enforce the following: O editor visual usa React Flow para renderizar nos e conexoes. Cada tipo de no (message, option, input, transfer, end) tem componente visual distinto com handles tipados. A serializacao entre React Flow e o formato do backend e bidirecional e sem perda de dados. Posicoes dos nos sao preservadas no JSON.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: RN-023 (legacy: RN-023)
The system MUST enforce the following: A simulacao executa o packages/flow engine diretamente no browser, sem chamadas de rede. O usuario interage via painel de chat simulado na sidebar. O no atual e destacado visualmente durante a simulacao. A simulacao pode ser resetada a qualquer momento.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

