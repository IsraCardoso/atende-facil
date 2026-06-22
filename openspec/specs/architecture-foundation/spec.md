## Purpose

Hexagonal architecture, layer isolation, ports and adapters.

Migrated from legacy business rules: RN-001, RN-007.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Fundação técnica e isolamento de camadas (legacy: RN-001)
Durante a Sprint 01, todo código MUST respeitar estritamente o isolamento de camadas definido no `engineering.mdc`, e o package `flow` MUST permanecer completamente puro (sem dependências de DB, HTTP, DI ou frameworks externos).

#### Scenario: Módulo em `domain`
- **WHEN** Módulo em `domain`
- **THEN** Não pode importar `infrastructure`, `interface` ou libs de integração externa

#### Scenario: Módulo em `application`
- **WHEN** Módulo em `application`
- **THEN** Pode depender apenas de `domain`

#### Scenario: Módulo em `interface`
- **WHEN** Módulo em `interface`
- **THEN** Pode depender de `application`, mas não de implementações de `infrastructure` por atalho

#### Scenario: Package `flow`
- **WHEN** Package `flow`
- **THEN** Deve permanecer isolado, sem acesso a banco, HTTP, fila, DI ou variáveis de ambiente

#### Scenario: Tentativa de introduzir lógica de negócio nesta sprint
- **WHEN** Tentativa de introduzir lógica de negócio nesta sprint
- **THEN** Deve ser recusada e replanejada para sprint posterior

> **Legacy:** [`RN-001`](../../docs/business-rules/RN-001-fundacao-tecnica-isolamento-camadas.md) | **Status:** Ativa | **Domain:** Arquitetura e Fundação Técnica
> **Implemented in:** `sprint-01`
> **Related:** RN-002, RN-003
### Requirement: RN-007 (legacy: RN-007)
The system MUST enforce the following: Funcionalidades de cache e logs devem ser acessadas por Ports (`CachePort`, `AppLoggerPort`) consumidos por use cases/services; implementações concretas devem existir como Adapters de infraestrutura, e regras de aplicação (TTL, chave, política) devem ficar em Services dedicados.

#### Scenario: Caso de uso precisa cache
- **WHEN** Caso de uso precisa cache
- **THEN** Usa `CachePort` via DI; não instancia cliente Redis/Valkey diretamente

#### Scenario: Caso de uso precisa log
- **WHEN** Caso de uso precisa log
- **THEN** Usa `AppLoggerPort` com `correlationId` e `tenantId`

#### Scenario: Regra de TTL/chave/invalidação
- **WHEN** Regra de TTL/chave/invalidação
- **THEN** Deve estar em Service de aplicação, não no controller

#### Scenario: Testes unitários
- **WHEN** Testes unitários
- **THEN** Podem usar adapter in-memory ou fake por contrato

> **Legacy:** [`RN-007`](../../docs/business-rules/RN-007-ports-adapters-services-cache-logs.md) | **Status:** Ativa | **Domain:** Arquitetura de Aplicação e Observabilidade
> **Implemented in:** `sprint-02`
> **Related:** RN-004, RN-005, RN-006
