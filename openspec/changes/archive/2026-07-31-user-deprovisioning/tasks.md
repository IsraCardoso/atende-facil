## 1. Domínio

- [x] 1.1 `apps/api/src/domain/ports/auth-ports.ts`: `MembershipRepositoryPort` ganha `updateStatus(membershipId, status)`, `remove(tenantId, userId)`, `listByTenant(tenantId)`
- [x] 1.2 `apps/api/src/domain/ports/chatwoot-platform-ports.ts`: `ChatwootPlatformPort` ganha `revokeUserFromAccount(chatwootUserId: string) => Promise<void>`; `ChatwootPlatformPortResolver` (já existente) reusado
- [x] 1.3 `apps/api/src/application/services/rbac-policy.ts`: `RbacPermission` ganha `auth.users.deactivate` e `auth.users.remove`; `permissionMatrixByRole` — admin-only (mesmo tier de `auth.users.create`)
- [x] 1.4 `apps/api/src/application/errors/app-error.ts`: `AppErrorCode` ganha `MEMBERSHIP_NOT_FOUND` (404), `MEMBERSHIP_LAST_ADMIN` (409), `MEMBERSHIP_SELF_ACTION_FORBIDDEN` (403)

## 2. Infraestrutura

- [x] 2.1 `apps/api/src/infrastructure/repositories/drizzle-membership-repository.ts`: implementar `updateStatus`, `remove`, `listByTenant`
- [x] 2.2 `apps/api/src/infrastructure/repositories/in-memory-auth-repositories.ts`: mesmas três operações na implementação in-memory
- [x] 2.3 `apps/api/src/infrastructure/chatwoot/chatwoot-platform-adapter.ts`: `revokeUserFromAccount` — `DELETE /platform/api/v1/accounts/{accountId}/account_users` com `user_id` no body JSON (inferido do payload do `POST` irmão — swagger publicado não documenta o parâmetro no DELETE; comentário no código sinalizando a inferência); `requestPlatform` ganha suporte a `DELETE` e a respostas com corpo vazio

## 3. Aplicação

- [x] 3.1 Criar `apps/api/src/application/use-cases/deactivate-tenant-member-use-case.ts`: `createDeactivateTenantMemberUseCase` — valida permission, busca membership-alvo (`findByUserAndTenant`), guard último-admin, guard auto-deprovisionamento, `updateStatus(..., "suspended")`, revoga Chatwoot best-effort, invalida `identityCacheService`
- [x] 3.2 Criar `apps/api/src/application/use-cases/remove-tenant-member-use-case.ts`: `createRemoveTenantMemberUseCase` — mesma validação, `remove(tenantId, userId)` em vez de `updateStatus`
- [x] 3.2.1 Extraído `apps/api/src/application/use-cases/tenant-member-deprovisioning-shared.ts` — guards (auto-ação, último-admin) e revogação Chatwoot best-effort, compartilhados pelos dois use cases (2 consumidores reais, evita divergência silenciosa entre deactivate/remove)
- [x] 3.3 Testes unitários para os dois use cases (12 cenários): sucesso + revoga Chatwoot, `AUTH_FORBIDDEN` (role errado), `MEMBERSHIP_SELF_ACTION_FORBIDDEN`, `MEMBERSHIP_NOT_FOUND`, `MEMBERSHIP_LAST_ADMIN`, sem `chatwootUserId` pula a chamada, falha do Chatwoot não bloqueia a mutação (best-effort), re-convite após remoção (unique constraint liberado)

## 4. Interface HTTP

- [x] 4.1 `apps/api/src/interface/http/auth-routes.ts`: `POST /auth/users/:userId/deactivate` e `DELETE /auth/users/:userId`, autenticados; autorização já dentro do use case (RBAC) — rota só extrai `authClaims`/`params`
- [x] 4.2 Erros de domínio mapeados via `AppError`/`.onError` global já existente em `create-api-server.ts` (nenhum try/catch por rota necessário, mesmo padrão de `/me` e `POST /users`)

## 5. Wiring (DI)

- [x] 5.1 `apps/api/src/infrastructure/auth/create-auth-module.ts`: `CreateAuthModuleInput` ganha `resolveChatwootPlatform?: ChatwootPlatformPortResolver`; registrado como token singleton e injetado nos dois novos use cases
- [x] 5.1.1 `apps/api/src/index.ts`: reordenado — `tenantIntegrationRepository` + `resolveChatwootPlatform` (factory única, reusada tanto pelo SSO quanto pelo deprovisionamento) construídos ANTES de `createAuthModule`, passados como dependência; `getChatwootSsoUrl` passa a reusar a MESMA instância de factory em vez de criar uma segunda
- [x] 5.2 `apps/api/src/interface/http/create-api-server.ts` e `auth-routes.ts`: `deactivateTenantMemberUseCase`/`removeTenantMemberUseCase` expostos e roteados

## 6. Documentação e validação manual

- [x] 6.1 `docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md`: débito de deprovisionamento marcado resolvido, nota de resolução
- [x] 6.2 `docs/changelog/CHANGELOG.md`: entrada em inglês, débito marcado `[x]`
- [ ] 6.3 **Validação manual pendente antes de produção**: confirmar contra uma instância Chatwoot real (ou ambiente de staging) que `DELETE /platform/api/v1/accounts/{accountId}/account_users` aceita `user_id` no body — o swagger publicado não documenta o parâmetro (ver design.md D2). Não bloqueia o merge (best-effort/degradação graciosa já cobre a falha), mas bloqueia confiar na revogação em produção sem essa confirmação.

## 7. Validação automatizada

- [x] 7.1 `bun test` no workspace `api` — 297 passed | 11 skipped (308)
- [x] 7.2 `bun run lint` (Biome) — 0 erros
- [x] 7.3 `tsc --noEmit` no workspace `api` — 0 erros
