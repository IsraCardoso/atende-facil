## Why

Hoje só existe caminho de auto-cadastro via cURL direto em `POST /auth/register-tenant` — não há tela `/signup`. E login sempre exige o `tenantSlug` em deployments multi-tenant (`LoginUseCase.resolveTenantId` lança `AUTH_TENANT_REQUIRED` sem ele), obrigando o atendente a saber e digitar um identificador técnico que ele nunca escolheu. Ambos os pontos foram aprovados no brainstorm de simplificação de UX ("Gostei, pode tocar tudo!!") e ainda não tinham sido codados.

## What Changes

- `LoginUseCase` passa a resolver o tenant pelo e-mail quando `tenantSlug` não é informado: busca as memberships ativas do usuário — 1 membership ativa → login direto nela; 0 → `AUTH_FORBIDDEN` (mesmo comportamento de hoje); 2+ → novo erro `AUTH_TENANT_AMBIGUOUS` (409) com a lista de tenants candidatos (`slug`+`name`) para o frontend oferecer escolha. `tenantSlug` explícito continua funcionando exatamente como hoje (sem mudança de comportamento quando informado).
- Nova página `/signup` (`apps/web/src/pages/signup.tsx`): formulário de nome do tenant, slug, nome do admin, e-mail e senha — consome `POST /auth/register-tenant` (já existe, público, sem mudança de contrato).
- `LoginPage` (`apps/web/src/pages/login.tsx`): campo "Tenant (slug)" deixa de ser exibido por padrão; some do formulário. Se o login retornar `AUTH_TENANT_AMBIGUOUS`, a página exibe os tenants candidatos retornados pela API como opções de seleção (progressive disclosure — só aparece pra quem realmente tem múltiplos tenants).
- Link cruzado entre `/login` e `/signup` ("Não tem conta? Cadastre-se" / "Já tem conta? Entrar").
- Rota `/signup` adicionada em `apps/web/src/main.tsx`.

### New Capabilities
- `self-service-onboarding`: cadastro de tenant via UI e login resolvido por e-mail (sem exigir tenantSlug quando não-ambíguo). Não existia capability própria — `authentication` (RN-005) cobre só formato JWT/erro; `multi-tenant` (RN-004) cobre extração de `tenant_id` do token DEPOIS de autenticado, não a resolução de tenant NO login.

## Impact

- `apps/api/src/application/use-cases/login-use-case.ts` (resolução de tenant por e-mail)
- `apps/api/src/application/errors/app-error.ts` (`AUTH_TENANT_AMBIGUOUS`, 409)
- `apps/api/src/application/use-cases/login-use-case.test.ts` (novos cenários)
- `apps/web/src/pages/signup.tsx` (novo)
- `apps/web/src/pages/login.tsx` (remove campo slug do fluxo padrão, adiciona seletor de tenant condicional)
- `apps/web/src/main.tsx` (rota `/signup`)
- `openspec/specs/self-service-onboarding/spec.md` (novo)
- Sem mudança de schema; sem mudança de contrato em `POST /auth/register-tenant` (já existe e já é público)
