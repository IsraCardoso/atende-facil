## Why

RN-019 documenta um débito P0: quando um usuário é desativado ou removido de um tenant, o espelho e o acesso dele no Chatwoot permanecem ativos — não existe reconciliação. Investigação nesta change revelou que o débito é maior do que "faltar uma chamada de revogação": **não existe nenhum fluxo de desativação/remoção de usuário no codebase hoje** (`grep isActive/membership` nos use cases só encontra `create-user`/`login`/`register-tenant`). É uma feature nova, não um patch pontual.

## What Changes

- Dois use cases novos no domínio de auth (`apps/api/src/application/use-cases/`, mesmo padrão flat de `create-user-use-case.ts`):
  - `createDeactivateTenantMemberUseCase`: muda `TenantMembershipEntity.status` de `active`/`invited` para `suspended`.
  - `createRemoveTenantMemberUseCase`: remove a linha `tenant_memberships` (hard delete) — revoga o vínculo por completo.
- Ambos, quando o usuário-alvo tem `chatwootUserId`, chamam `ChatwootPlatformPort.revokeUserFromAccount` (novo método) via o MESMO `resolveChatwootPlatform` per-tenant introduzido em `chatwoot-sso-multi-tenant` — best-effort: falha na Chatwoot loga warn e NÃO bloqueia a deprovisão no Atende Fácil (mesmo padrão de `deactivate-whatsapp-integration-use-case.ts`, que trata desconexão na Evolution como best-effort).
- `MembershipRepositoryPort` ganha `updateStatus`, `remove` e `listByTenant` (necessário para o guard de "último admin").
- `RbacPolicyService`: novas permissions `auth.users.deactivate` e `auth.users.remove`, admin-only (mesmo tier de `auth.users.create`).
- Guards de domínio: (a) não é possível desativar/remover o ÚLTIMO membership `admin` ativo de um tenant (tenant ficaria sem administrador, irrecuperável via API); (b) o ator não pode deprovisionar a própria membership por este fluxo (previne lockout acidental).
- Novos endpoints em `apps/api/src/interface/http/auth-routes.ts`: `POST /auth/users/:userId/deactivate` e `DELETE /auth/users/:userId`.
- **Sem alteração em `users.isActive`** (coluna global) — o débito documentado é por-TENANT (`tenant_memberships.status`), e um usuário pode ter memberships em múltiplos tenants; a coluna global fica fora de escopo (não usada por nenhum use case hoje).

### New Capabilities
- `tenant-membership-lifecycle`: deativação e remoção de membro de tenant, com guards de último-admin e auto-deprovisionamento. Não existia capability própria para isso — `authentication` (RN-005, JWT bearer) e `authorization` (RN-006, RBAC matrix) são específicas demais; `multi-tenant` é sobre isolamento, não sobre lifecycle de membership.

### Modified Capabilities
- `chatwoot-integration`: `ChatwootPlatformPort` ganha `revokeUserFromAccount`; RN-019 débito de deprovisionamento resolvido.

## Impact

- `apps/api/src/domain/ports/auth-ports.ts` (`MembershipRepositoryPort`)
- `apps/api/src/domain/ports/chatwoot-platform-ports.ts` (`ChatwootPlatformPort.revokeUserFromAccount`)
- `apps/api/src/application/services/rbac-policy.ts` (novas permissions)
- `apps/api/src/application/use-cases/deactivate-tenant-member-use-case.ts` (novo)
- `apps/api/src/application/use-cases/remove-tenant-member-use-case.ts` (novo)
- `apps/api/src/infrastructure/chatwoot/chatwoot-platform-adapter.ts` (`revokeUserFromAccount`, `DELETE /platform/api/v1/accounts/{accountId}/account_users` — **endpoint confirmado via developers.chatwoot.com/api-reference/account-users/delete-an-account-user; o swagger publicado NÃO documenta como o `user_id` é passado (nem body nem query aparecem na spec) — implementado enviando `user_id` no body JSON, espelhando o payload do `create-an-account-user` irmão; PRECISA validação contra uma instância Chatwoot real antes de produção**
- `apps/api/src/infrastructure/repositories/drizzle-membership-repository.ts`, `in-memory-auth-repositories.ts` (implementação in-memory de `MembershipRepositoryPort` vive neste arquivo combinado)
- `apps/api/src/infrastructure/auth/create-auth-module.ts` (DI wiring)
- `apps/api/src/interface/http/auth-routes.ts` (dois endpoints novos)
- `docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md` (remove débito de deprovisionamento)
- `openspec/specs/tenant-membership-lifecycle/spec.md` (novo), `openspec/specs/chatwoot-integration/spec.md` (delta)
