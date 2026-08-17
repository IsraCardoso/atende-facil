## Purpose

Tenant isolation, identity from token, and per-tenant timezone.

Migrated from legacy business rules: RN-004, RN-028.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-004 (legacy: RN-004)
Em endpoints protegidos, o `tenant_id` de autorização e acesso a dados MUST ser extraído exclusivamente do token autenticado (claims), sendo proibido confiar em `tenant_id` vindo do body da requisição.

#### Scenario: Requisição autenticada válida
- **WHEN** Requisição autenticada válida
- **THEN** `tenant_id` efetivo vem do token

#### Scenario: Body contém `tenant_id` diferente do token
- **WHEN** Body contém `tenant_id` diferente do token
- **THEN** Requisição deve ser rejeitada com erro de autorização

#### Scenario: Modo single-tenant (`MULTI_TENANT=false`)
- **WHEN** Modo single-tenant (`MULTI_TENANT=false`)
- **THEN** Contexto deve usar `DEFAULT_TENANT_ID` validado em bootstrap

#### Scenario: Endpoint público (registro inicial)
- **WHEN** Endpoint público (registro inicial)
- **THEN** Pode receber dados de tenant, sem acesso a dados protegidos

> **Legacy:** [`RN-004`](../../docs/business-rules/RN-004-identidade-isolamento-tenant-token.md) | **Status:** Ativa | **Domain:** Identidade e Segurança Multi-tenant
> **Implemented in:** `sprint-02`
> **Related:** RN-005, RN-006, RN-007
### Requirement: Timezone por tenant (legacy: RN-028)
The system MUST enforce the following: 

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

