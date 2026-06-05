## Purpose

Structured logging, correlation IDs, and operational visibility.

Migrated from legacy business rules: RN-003.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Observabilidade mínima com correlationId (legacy: RN-003)
Toda entrada de log operacional em runtime MUST ser estruturada em JSON e incluir `correlationId`; em fluxo HTTP, o `correlationId` MUST ser gerado na borda da requisição e propagado durante o processamento, sendo proibido uso direto de `console.log`.

#### Scenario: Requisição HTTP recebida
- **WHEN** Requisição HTTP recebida
- **THEN** Gerar ou reutilizar `correlationId` e anexar aos logs do request

#### Scenario: Logs durante processamento da mesma requisição
- **WHEN** Logs durante processamento da mesma requisição
- **THEN** Manter o mesmo `correlationId`

#### Scenario: Eventos de bootstrap sem contexto HTTP
- **WHEN** Eventos de bootstrap sem contexto HTTP
- **THEN** Usar `correlationId` técnico estável (ex.: `system`)

#### Scenario: Erro operacional
- **WHEN** Erro operacional
- **THEN** Logar com `level` apropriado e contexto mínimo para diagnóstico

#### Scenario: Uso de `console.log` em código de runtime
- **WHEN** Uso de `console.log` em código de runtime
- **THEN** Deve ser substituído por logger estruturado

> **Legacy:** [`RN-003`](../../docs/business-rules/RN-003-observabilidade-correlation-id.md) | **Status:** Ativa | **Domain:** Observabilidade e Operação
> **Implemented in:** `sprint-01`
> **Related:** RN-001, RN-002
