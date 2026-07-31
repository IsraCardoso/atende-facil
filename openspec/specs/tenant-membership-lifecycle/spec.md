## Purpose

Desativação e remoção de membros de tenant (deprovisionamento), com guards de segurança (último administrador, autodeprovisionamento) e revogação best-effort de acesso a integrações externas (Chatwoot).

Migrated from legacy business rules: RN-019 (débito de deprovisionamento).
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Desativação de membro de tenant
Um admin do tenant MUST poder desativar (suspender) o membership de outro usuário no mesmo tenant. Desativar muda `TenantMembershipEntity.status` para `suspended`. A ação MUST ser autorizada via `RbacPolicyService` (permission `auth.users.deactivate`, admin-only) e MUST revogar o acesso ao Chatwoot daquele tenant quando o usuário tiver espelho federado (best-effort, ver capability `chatwoot-integration`).

#### Scenario: Admin desativa membership ativo
- **WHEN** um admin chama a desativação de um membership `active` de outro usuário no mesmo tenant
- **THEN** o membership passa para `suspended` e o acesso Chatwoot daquele tenant é revogado (best-effort)

#### Scenario: Ator sem permissão
- **WHEN** um usuário com role `manager` ou `agent` tenta desativar um membership
- **THEN** o sistema responde `AUTH_FORBIDDEN`, nenhuma mutação ocorre

#### Scenario: Alvo é o último admin ativo do tenant
- **WHEN** o membership-alvo é o único membership `admin` com `status === "active"` no tenant
- **THEN** a desativação é rejeitada — o tenant nunca fica sem administrador

#### Scenario: Ator tenta desativar a própria membership
- **WHEN** o `userId` autenticado é igual ao `userId` do membership-alvo
- **THEN** a desativação é rejeitada — previne lockout acidental

> **Legacy:** [`RN-019`](../../docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md) | **Status:** Ativa | **Domain:** Autenticação e Multi-tenant
> **Implemented in:** `user-deprovisioning`
> **Related:** RN-024, RN-026

### Requirement: Remoção de membro de tenant
Um admin do tenant MUST poder remover permanentemente o membership de outro usuário no mesmo tenant (hard delete de `tenant_memberships`). A ação MUST ser autorizada via `RbacPolicyService` (permission `auth.users.remove`, admin-only) e MUST revogar o acesso ao Chatwoot daquele tenant quando o usuário tiver espelho federado (best-effort, ver capability `chatwoot-integration`). Mesmos guards de último-admin e auto-remoção da desativação se aplicam.

#### Scenario: Admin remove membership existente
- **WHEN** um admin chama a remoção de um membership existente de outro usuário no mesmo tenant
- **THEN** a linha `tenant_memberships` é deletada e o acesso Chatwoot daquele tenant é revogado (best-effort)

#### Scenario: Membership inexistente
- **WHEN** o `userId` informado não tem membership no tenant do ator
- **THEN** o sistema responde `MEMBERSHIP_NOT_FOUND`, nenhuma mutação ocorre

#### Scenario: Alvo é o último admin ativo do tenant
- **WHEN** o membership-alvo é o único membership `admin` com `status === "active"` no tenant
- **THEN** a remoção é rejeitada — o tenant nunca fica sem administrador

#### Scenario: Ator tenta remover a própria membership
- **WHEN** o `userId` autenticado é igual ao `userId` do membership-alvo
- **THEN** a remoção é rejeitada — previne lockout acidental

> **Legacy:** [`RN-019`](../../docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md) | **Status:** Ativa | **Domain:** Autenticação e Multi-tenant
> **Implemented in:** `user-deprovisioning`
> **Related:** RN-024, RN-026
