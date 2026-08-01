## MODIFIED Requirements

### Requirement: Desativação de membro de tenant
Um admin do tenant MUST poder desativar (suspender) o membership de outro usuário no mesmo tenant. Desativar muda `TenantMembershipEntity.status` para `suspended`. A ação MUST ser autorizada via `RbacPolicyService` (permission `auth.users.deactivate`, admin-only) e MUST revogar o acesso ao Chatwoot daquele tenant quando o usuário tiver espelho federado (best-effort, ver capability `chatwoot-integration`). **O guard de último-admin (ver cenário abaixo) MUST ser avaliado e aplicado dentro de uma única operação atômica com a mutação — nunca como uma leitura seguida de uma escrita independente — de forma que duas desativações/remoções concorrentes contra os 2 últimos admins ativos do tenant não possam ambas passar no guard.**

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

#### Scenario: Duas desativações concorrentes contra os 2 últimos admins
- **WHEN** dois admins ativos são os únicos dois administradores do tenant, e chegam simultaneamente uma desativação do admin A (chamada por B) e uma desativação do admin B (chamada por A)
- **THEN** exatamente uma das duas chamadas é rejeitada com o guard de último-admin — nunca as duas passam, e o tenant nunca fica com 0 admins ativos

> **Legacy:** [`RN-019`](../../docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md) | **Status:** Ativa | **Domain:** Autenticação e Multi-tenant
> **Implemented in:** `user-deprovisioning`
> **Related:** RN-024, RN-026

### Requirement: Remoção de membro de tenant
Um admin do tenant MUST poder remover permanentemente o membership de outro usuário no mesmo tenant (hard delete de `tenant_memberships`). A ação MUST ser autorizada via `RbacPolicyService` (permission `auth.users.remove`, admin-only) e MUST revogar o acesso ao Chatwoot daquele tenant quando o usuário tiver espelho federado (best-effort, ver capability `chatwoot-integration`). Mesmos guards de último-admin e auto-remoção da desativação se aplicam, **incluindo a garantia de atomicidade sob concorrência descrita no requirement de Desativação** — o guard de último-admin é avaliado no mesmo lock/transação usado pela desativação, já que uma remoção e uma desativação concorrentes contra os últimos 2 admins têm a mesma janela de corrida.

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

#### Scenario: Remoção e desativação concorrentes contra os 2 últimos admins
- **WHEN** dois admins ativos são os únicos dois administradores do tenant, e chegam simultaneamente uma remoção do admin A (chamada por B) e uma desativação do admin B (chamada por A)
- **THEN** exatamente uma das duas chamadas é rejeitada com o guard de último-admin — nunca as duas passam, e o tenant nunca fica com 0 admins ativos

> **Legacy:** [`RN-019`](../../docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md) | **Status:** Ativa | **Domain:** Autenticação e Multi-tenant
> **Implemented in:** `user-deprovisioning`
> **Related:** RN-024, RN-026
