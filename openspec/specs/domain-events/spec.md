## Purpose

Domain events and Valkey pub/sub messaging.

Migrated from legacy business rules: RN-015.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Sistema de eventos de domínio (Valkey Pub/Sub) (legacy: RN-015)
The system MUST enforce the following: Eventos de domínio são publicados via Valkey Pub/Sub após persistência bem-sucedida. Nunca antes. Subscribers consomem eventos de forma desacoplada e idempotente.

#### Scenario: Persistência bem-sucedida + transição de estado
- **WHEN** Persistência bem-sucedida + transição de estado
- **THEN** Evento publicado no canal `domain-events:{tenantId}`

#### Scenario: Persistência falha
- **WHEN** Persistência falha
- **THEN** Evento NÃO é publicado

#### Scenario: Falha ao publicar evento
- **WHEN** Falha ao publicar evento
- **THEN** Log de erro, não impede a operação principal

#### Scenario: Subscriber falha ao processar
- **WHEN** Subscriber falha ao processar
- **THEN** Erro isolado, não afeta outros subscribers

#### Scenario: Valkey indisponível
- **WHEN** Valkey indisponível
- **THEN** Publisher falha com log de erro, operação principal já foi persistida

> **Legacy:** [`RN-015`](../../docs/business-rules/RN-015-sistema-eventos-dominio-valkey-pubsub.md) | **Status:** Ativa | **Domain:** Infraestrutura / Eventos
> **Implemented in:** `sprint-05`
> **Related:** RN-014, RN-016
