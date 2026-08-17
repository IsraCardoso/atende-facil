## Purpose

RBAC and endpoint-level access control.

Migrated from legacy business rules: RN-006.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-006 (legacy: RN-006)
Todo endpoint protegido MUST aplicar autorização por papel (`admin`, `manager`, `agent`) com política centralizada; ausência de autenticação retorna 401 e autenticação válida sem permissão retorna 403.

#### Scenario: Endpoint público de registro
- **WHEN** Endpoint público de registro
- **THEN** Não requer token

#### Scenario: Endpoint protegido sem token
- **WHEN** Endpoint protegido sem token
- **THEN** 401

#### Scenario: Endpoint protegido com token válido e role permitida
- **WHEN** Endpoint protegido com token válido e role permitida
- **THEN** acesso autorizado

#### Scenario: Endpoint protegido com token válido e role não permitida
- **WHEN** Endpoint protegido com token válido e role não permitida
- **THEN** 403

> **Legacy:** [`RN-006`](../../docs/business-rules/RN-006-rbac-autorizacao-endpoints.md) | **Status:** Ativa | **Domain:** Autorização e Controle de Acesso
> **Implemented in:** `sprint-02`
> **Related:** RN-004, RN-005, RN-007
