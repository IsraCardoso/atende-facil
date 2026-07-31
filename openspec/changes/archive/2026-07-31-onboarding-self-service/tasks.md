## 1. Backend — resolução de tenant por e-mail

- [x] 1.1 `apps/api/src/application/errors/app-error.ts`: `AppErrorCode` ganha `AUTH_TENANT_AMBIGUOUS` (409)
- [x] 1.2 `apps/api/src/application/use-cases/login-use-case.ts`: `resolveTenantId` recebe o `user` já resolvido; quando `tenantSlug` ausente, lista memberships ativas via `membershipRepository.listByUserId`; 1 → resolve; 0 → `AUTH_FORBIDDEN` (comportamento atual); 2+ → busca `tenantRepository.findById` de cada candidato e lança `AUTH_TENANT_AMBIGUOUS` com `details: { tenants: [{slug, name}] }`
- [x] 1.3 `execute` já resolvia o `user` antes da chamada a `resolveTenantId` (só passou a repassá-lo como argumento)
- [x] 1.4 `login-use-case.test.ts`: cenários novos (1 membership ativa sem slug — sucesso, 2+ sem slug — `AUTH_TENANT_AMBIGUOUS` com lista, 0 sem slug — `AUTH_FORBIDDEN`, slug explícito inalterado); `create-api-server.test.ts` (integração HTTP) atualizado — o teste antigo esperava 400 `AUTH_TENANT_REQUIRED` sem slug, comportamento que esta change muda deliberadamente para 200 quando há 1 membership

## 2. Frontend — signup

- [x] 2.1 Criar `apps/web/src/pages/signup.tsx`: formulário (tenantName, tenantSlug, adminDisplayName, adminEmail, adminPassword) → `POST /auth/register-tenant`; sucesso navega para `/login`; erro exibe mensagem legível por `code` (`TENANT_SLUG_ALREADY_EXISTS`, `USER_EMAIL_ALREADY_EXISTS`, `TENANT_CONTEXT_CONFLICT`, `REQUEST_VALIDATION_ERROR`)
- [x] 2.2 `apps/web/src/main.tsx`: rota pública `/signup`
- [x] 2.3 Link cruzado `/login` ↔ `/signup`

## 3. Frontend — login sem slug

- [x] 3.1 `apps/web/src/pages/login.tsx`: campo "Tenant (slug)" removido do formulário padrão
- [x] 3.2 Resposta `AUTH_TENANT_AMBIGUOUS`: `details.tenants` renderizado como lista de botões (nome do tenant); selecionar reenvia `POST /auth/login` com o `tenantSlug` correspondente
- [x] 3.3 Estado `tenantCandidates` distingue a tela de escolha (não é erro) da tela de credenciais inválidas

## 4. Documentação e validação

- [x] 4.1 `docs/changelog/CHANGELOG.md`: entrada em inglês
- [x] 4.2 `bun test` no workspace `api` — 299 passed | 11 skipped (310)
- [x] 4.3 `bun run lint` (Biome) — `api` e `web`, 0 erros
- [x] 4.4 `tsc --noEmit` — `api` e `web`, 0 erros
- [x] 4.5 Smoke test manual no browser (Vite dev server, sem backend/DB disponível neste ambiente): `/signup` e `/login` renderizam corretamente, campo de slug ausente no login, link cruzado presente, zero erros de console. Round-trip completo contra API+Postgres real não foi exercitado nesta sessão — coberto pelos testes de integração automatizados (`create-api-server.test.ts`), que já testavam exatamente o fluxo login-sem-slug via Elysia `app.handle()`.
