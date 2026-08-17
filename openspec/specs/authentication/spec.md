## Purpose

JWT bearer authentication and session security.

Migrated from legacy business rules: RN-005.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-005 (legacy: RN-005)
A autenticação da Sprint 02 MUST usar JWT Bearer; toda falha de autenticação/autorização MUST retornar payload de erro padronizado (`error`, `code`, `details` opcional) via handler centralizado; nunca retornar senha ou hash em qualquer resposta.

#### Scenario: Login com credenciais válidas
- **WHEN** Login com credenciais válidas
- **THEN** Retorna token JWT Bearer com claims mínimas (`sub`, `tenantId`, `role`, `exp`, `iat`)

#### Scenario: Token ausente/inválido/expirado
- **WHEN** Token ausente/inválido/expirado
- **THEN** Retorna 401 com payload de erro padronizado

#### Scenario: Erro de regra de auth/rbac
- **WHEN** Erro de regra de auth/rbac
- **THEN** Retorna `code` semântico e status HTTP coerente, sem try/catch duplicado por endpoint

#### Scenario: Resposta de endpoints de auth
- **WHEN** Resposta de endpoints de auth
- **THEN** Nunca inclui senha ou hash

> **Legacy:** [`RN-005`](../../docs/business-rules/RN-005-autenticacao-jwt-bearer-seguranca.md) | **Status:** Ativa | **Domain:** Autenticação e Segurança
> **Implemented in:** `sprint-02`
> **Related:** RN-004, RN-006
