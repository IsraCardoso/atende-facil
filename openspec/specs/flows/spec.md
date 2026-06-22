## Purpose

Flow CRUD, lifecycle, and Drizzle persistence.

Migrated from legacy business rules: RN-020, RN-021.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-020 (legacy: RN-020)
The system MUST enforce the following: Todo tenant pode ter multiplos flows. Cada flow possui um ciclo de vida com 4 estados (draft, published, active, archived). Apenas 1 flow pode estar ativo por tenant simultaneamente. A transicao para published exige validacao estrutural obrigatoria via `validateFlowDefinition`.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: RN-021 (legacy: RN-021)
The system MUST enforce the following: Flows sao persistidos na tabela `flows` do PostgreSQL via Drizzle ORM. Toda query obrigatoriamente filtra por `tenant_id`. Registros com `deleted_at` preenchido nao aparecem em queries padrao. Um unique partial index garante no maximo 1 flow ativo por tenant no nivel do banco.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: Visibilidade do fluxo ativo no contexto de integração
Quando a integração WhatsApp está conectada, o sistema MUST informar ao administrador qual fluxo conversacional está ativo no tenant ou que nenhum fluxo está ativo, respeitando RN-020 (máximo um fluxo ativo por tenant).

#### Scenario: Fluxo ativo identificado
- **WHEN** existe exatamente um fluxo com status `active` para o tenant
- **THEN** resumo operacional inclui `activeFlow.id` e `activeFlow.name`

#### Scenario: Nenhum fluxo ativo
- **WHEN** não há fluxo com status `active`
- **THEN** resumo operacional retorna `activeFlow: null` e UI orienta publicar/ativar um fluxo

#### Scenario: Consistência com regra de unicidade
- **WHEN** banco garante no máximo um fluxo ativo (partial unique index)
- **THEN** endpoint de resumo nunca retorna mais de um fluxo ativo

