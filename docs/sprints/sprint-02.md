# Sprint 02 - Multi-tenant + Autenticacao + RBAC

> **Periodo:** 06/04 ate 08/04 | **Status:** `Planejamento`

---

# GESTAO

## Objetivo da Sprint

> *Permitir cadastro de tenant, autenticacao por JWT Bearer e autorizacao por papel em endpoints protegidos, com isolamento multi-tenant garantido por token.*

Entregar a base de identidade e acesso da plataforma com modelo escalavel de vinculacao usuario-tenant (N:N), autenticao com BetterAuth + JWT Bearer, middleware de autenticacao/autorizacao no Elysia, casos de uso de onboarding/login/usuario atual e abstractions de cache/log (Ports + Adapters + Services) funcionando em producao local.

---

## Fluxo oficial de documentacao (IA)

1. O usuario informa descricao e detalhes da proxima sprint.
2. A IA faz perguntas de clarificacao (somente o necessario) e preenche esta doc de sprint.
3. O usuario revisa e aprova a sprint.
4. Somente apos aprovacao, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** nao transferir nem detalhar RNs antes da aprovacao explicita da sprint.

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Modelo de identidade multi-tenant escalavel | `users` e `tenant_memberships` com constraints e indices para isolamento por tenant |
| 2 | Autenticacao com JWT Bearer | Login retorna token valido; middleware reconhece e injeta identidade autenticada |
| 3 | RBAC funcional (`admin`, `manager`, `agent`) | Endpoints protegidos retornam 401/403 corretamente conforme autenticacao/papel |
| 4 | Casos de uso de auth implementados | `RegisterTenant`, `CreateUser`, `Login`, `GetCurrentUser` com testes unitarios |
| 5 | Ports, Adapters e Services de cross-cutting | `CachePort` e `AppLoggerPort` com adapters reais e uso funcional em auth/rbac |
| 6 | Suporte a single-tenant | Com `MULTI_TENANT=false`, tenant padrao e fluxo autenticado funcionando |
| 7 | Qualidade automatizada da sprint | `bun run test`, `bun run lint`, `bun run build` passando no monorepo |
| 8 | Tratamento padrao de erros | Erros de auth/rbac/use case retornam envelope unico sem duplicacao de codigo nos handlers |

---

## Regras de Negocio desta Sprint

- [RN-004 - Identidade e isolamento multi-tenant por token](../business-rules/RN-004-identidade-isolamento-tenant-token.md)
- [RN-005 - Autenticacao JWT Bearer e seguranca de credenciais](../business-rules/RN-005-autenticacao-jwt-bearer-seguranca.md)
- [RN-006 - RBAC por papel com autorizacao por endpoint](../business-rules/RN-006-rbac-autorizacao-endpoints.md)
- [RN-007 - Ports, Adapters e Services para cache e logs](../business-rules/RN-007-ports-adapters-services-cache-logs.md)

> RNs serao criadas/atualizadas somente apos aprovacao explicita desta sprint.

---

## Fora do Escopo

- ❌ SSO/social login
- ❌ Fluxo de convite por email e onboarding enterprise
- ❌ Recuperacao de senha por email
- ❌ Painel de atendimento humano/inbox
- ❌ Integracoes externas (Evolution API, OpenAI)
- ❌ Refatoracao ampla do flow engine (escopo da Sprint 03)

---

## Metricas de Sucesso

- [ ] Cadastro de tenant + usuario administrador funcional via endpoint publico
- [ ] Login por email/senha retorna JWT Bearer valido
- [ ] Endpoints protegidos retornam 401 sem token e 403 com papel incorreto
- [ ] `tenant_id` e contexto de autorizacao vindos apenas do token
- [ ] Nenhuma resposta retorna senha/hash
- [ ] 100% de cobertura unitaria nos use cases de auth/rbac
- [ ] Testes E2E cobrindo cadastro de tenant, login, 401 e 403
- [ ] Modo single-tenant validado com `MULTI_TENANT=false` + `DEFAULT_TENANT_ID`
- [ ] Erros retornam payload padrao (`error`, `code`, `details`) com mapeamento consistente por status HTTP

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez. Apos cada set, apresente o checkpoint e aguarde instrucao do usuario.
> **Eficiência de contexto:** Quando houver docs longas, logs ou multiplos arquivos grandes, usar `dont-be-greedy` para leitura incremental antes de expandir analise.

---

## Plano de Execucao

```text
Rodada 1:  [SET-A: Modelo de Identidade e Contratos]
Rodada 2:  [SET-B: Autenticacao JWT + Middleware RBAC]
Rodada 3:  [SET-C: Ports/Adapters/Services de Cache e Logs]
Rodada 4:  [SET-D: Integracao Final + Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | - | - |
| SET-B | T04, T05, T06 | SET-A | - |
| SET-C | T07, T08, T09 | SET-B | - |
| SET-D | T10, T11, T12 | SET-C | - |

> **Criterio de paralelismo:** nesta sprint, os sets foram mantidos sequenciais por compartilharem contexto de identidade, seguranca e wiring de DI.

---

## SET-A - Modelo de Identidade e Contratos

> Escopo estimado: ~520 linhas | Complexidade: Media
> **Racional:** fechar a fundacao de dados e contratos antes de plugar autenticacao/autorizacao.

---

### T01 - Modelar identidade multi-tenant escalavel (N:N)

**Contexto:** com a opcao escalavel, um usuario pode participar de multiplos tenants com papeis distintos.

**O que fazer:**
- [ ] Definir modelo de dominio para `User`, `Tenant` e `TenantMembership` (vinculo usuario-tenant-role).
- [ ] Definir invariantes minimas (email valido, role valida, vinculo unico por tenant+user).
- [ ] Definir DTOs sem exposicao de senha/hash.

**Criterios de Aceite:**
- [ ] Modelo suporta um usuario em multiplos tenants.
- [ ] Papel e tenant ativo de autorizacao podem ser derivados no login/token.
- [ ] Nao existe campo sensivel exposto em contratos de saida.

**Notas tecnicas:**
> A estrategia de login deve carregar contexto de tenant ativo para emitir claims JWT coerentes com RBAC por tenant.

---

### T02 - Criar migrations/schema para `users` e `tenant_memberships`

**Contexto:** o banco precisa refletir o modelo escalavel e garantir isolamento via constraints/indices.

**O que fazer:**
- [ ] Criar tabela `users` com campos de identidade e credencial hash.
- [ ] Criar tabela `tenant_memberships` com `tenant_id`, `user_id`, `role`, `status` e timestamps.
- [ ] Definir constraints e indices: `unique(users.email)`, `unique(tenant_id,user_id)`, indice por `tenant_id` e por `role` quando aplicavel.

**Criterios de Aceite:**
- [ ] `bun run db:migrate` aplica migration sem erro.
- [ ] Integridade referencial com FK para `tenants` e `users`.
- [ ] Queries por tenant nao geram varredura full-table para cenarios comuns.

**Notas tecnicas:**
> `tenant_id` deve continuar indexado e nunca ser confiado por entrada do body na camada HTTP.

---

### T03 - Definir Ports e contratos de aplicacao

**Contexto:** a sprint inclui explicitamente Ports, Adapters e Services para auth/rbac e cross-cutting.

**O que fazer:**
- [ ] Definir Ports de identidade: `UserRepositoryPort`, `TenantRepositoryPort`, `MembershipRepositoryPort`.
- [ ] Definir Ports de seguranca: `AuthTokenPort` (issue/verify JWT), `PasswordHasherPort`.
- [ ] Definir Ports cross-cutting: `CachePort`, `AppLoggerPort`.
- [ ] Definir contrato padrao de erro (`AppError`) e catalogo inicial de codigos de auth/rbac.

**Criterios de Aceite:**
- [ ] Casos de uso dependem apenas dos Ports, nao de SDK/ORM/clientes concretos.
- [ ] Contratos estao semanticos e estritos, sem `any`.
- [ ] Taxonomia de erros de auth/rbac definida para resposta HTTP consistente.
- [ ] Estrategia de tratamento de erro evita repeticao de `try/catch` e mapeamento manual em cada endpoint.

**Notas tecnicas:**
> Contratos de cache devem suportar TTL e namespace de chave para evitar colisao entre tenants.

---

## SET-B - Autenticacao JWT + Middleware RBAC

> Escopo estimado: ~560 linhas | Complexidade: Alta
> **Racional:** implementar fluxo de seguranca fim-a-fim na borda HTTP com claims de tenant/papel.

---

### T04 - Integrar BetterAuth com estrategia JWT Bearer

**Contexto:** decisao aprovada para Sprint 02: autenticacao via Bearer token (JWT).

**O que fazer:**
- [ ] Integrar BetterAuth com emissao e validacao de JWT Bearer.
- [ ] Definir claims minimas: `sub(userId)`, `tenantId`, `role`, `exp`, `iat`.
- [ ] Definir fluxo de login com selecao de tenant ativo quando usuario possuir multiplos vinculos.

**Criterios de Aceite:**
- [ ] Login valido retorna token Bearer utilizavel em endpoint protegido.
- [ ] Token invalido/expirado resulta em 401 com mensagem padronizada.
- [ ] Claims contem tenant/papel corretos para autorizacao.

**Notas tecnicas:**
> Caso usuario tenha mais de um tenant, o login deve exigir identificador de contexto (`tenantSlug` ou equivalente) para evitar ambiguidade de papel.

---

### T05 - Implementar middleware de autenticacao e guard RBAC

**Contexto:** seguranca multi-tenant exige extrair `tenant_id` apenas do token e bloquear acesso indevido por role.

**O que fazer:**
- [ ] Criar middleware de autenticacao no Elysia para ler header `Authorization: Bearer ...`.
- [ ] Injetar identidade autenticada no contexto request (`userId`, `tenantId`, `role`).
- [ ] Criar guard RBAC por endpoint (admin/manager/agent) com resposta 403.
- [ ] Criar handler global de erros HTTP para transformar `AppError` em payload padrao.

**Criterios de Aceite:**
- [ ] Sem token -> 401.
- [ ] Token valido e role incorreta -> 403.
- [ ] Nenhum endpoint protegido usa `tenant_id` vindo do body.
- [ ] Respostas de erro seguem payload padrao sem duplicacao de codigo nos controllers.

**Notas tecnicas:**
> `tenant_id` do path pode existir por ergonomia de rota, mas deve ser validado contra o claim do token antes de qualquer use case sensivel.

---

### T06 - Implementar use cases e endpoints de auth

**Contexto:** valor de negocio desta sprint depende de fluxo completo: cadastrar tenant, criar usuario, logar e obter usuario atual.

**O que fazer:**
- [ ] Implementar use cases: `RegisterTenant`, `CreateUser`, `Login`, `GetCurrentUser`.
- [ ] Implementar endpoints correspondentes com validacao de input na borda.
- [ ] Garantir sanitizacao de resposta (sem senha/hash em qualquer payload).
- [ ] Garantir que erros de regra/infra saiam como `AppError` com codigo semantico.

**Criterios de Aceite:**
- [ ] Endpoint de cadastro cria tenant + primeiro admin com vinculo correto.
- [ ] `CreateUser` acessivel apenas por `admin`.
- [ ] `GetCurrentUser` retorna identidade do tenant ativo com role atual.

**Notas tecnicas:**
> Se `MULTI_TENANT=false`, o fluxo deve operar no `DEFAULT_TENANT_ID` sem exigir tenant no body.

---

## SET-C - Ports/Adapters/Services de Cache e Logs

> Escopo estimado: ~500 linhas | Complexidade: Media
> **Racional:** plugar cross-cutting aprovado para funcionar ja na Sprint 02, sem acoplamento indevido.

---

### T07 - Implementar adapters para `CachePort` e `AppLoggerPort`

**Contexto:** os use cases precisam de cache/log por contrato, nao por implementacao concreta.

**O que fazer:**
- [ ] Implementar `ValkeyCacheAdapter` para producao local.
- [ ] Implementar `InMemoryCacheAdapter` para testes e fallback local controlado.
- [ ] Implementar adapter de logger estruturado consumindo o logger JSON existente.

**Criterios de Aceite:**
- [ ] `CachePort` suporta `get/set/delete` com TTL.
- [ ] `AppLoggerPort` registra eventos com `correlationId`, `tenantId` e contexto.
- [ ] Adapters possuem testes de integracao/unidade basicos.

**Notas tecnicas:**
> TTL default deve ser curto e explicitamente configuravel por caso de uso.

---

### T08 - Implementar Services de aplicacao para cache e policy RBAC

**Contexto:** Service agrega regra de negocio/aplicacao; Port so define fronteira tecnica.

**O que fazer:**
- [ ] Implementar `IdentityCacheService` para cachear leitura de identidade atual.
- [ ] Implementar `RbacPolicyService` com matriz de permissoes inicial (`admin`,`manager`,`agent`).
- [ ] Definir invalidacao de cache nos fluxos de alteracao de membership/role.

**Criterios de Aceite:**
- [ ] `GetCurrentUser` usa cache com TTL curto e fallback transparente.
- [ ] Politica RBAC centralizada, testavel e sem duplicacao em controllers.
- [ ] Alteracao de role invalida cache associado ao usuario/tenant afetado.

**Notas tecnicas:**
> Chaves de cache devem incluir tenant e user para evitar vazamento entre tenants.

---

### T09 - Integrar DI container e wiring dos novos contratos

**Contexto:** a regra do projeto exige instancia via container tipado e lazy.

**O que fazer:**
- [ ] Registrar Ports, Adapters e Services no container manual.
- [ ] Garantir lifetimes corretos (adapters singleton, services conforme necessidade).
- [ ] Ajustar bootstrap para resolver dependencias via container.

**Criterios de Aceite:**
- [ ] Nenhum `new` fora da composicao principal para dependencias relevantes.
- [ ] Wiring reproduzivel em dev/test sem service locator implicito.
- [ ] Testes de container cobrem resolucao de contratos novos.

**Notas tecnicas:**
> Em caso de dependencia ciclica, quebrar por interface mais granular antes de seguir.

---

## SET-D - Integracao Final e Qualidade

> Escopo estimado: ~460 linhas | Complexidade: Media
> **Racional:** consolidar comportamento esperado da sprint com evidencias automatizadas e manuais.

---

### T10 - Cobertura unitario total dos use cases e services de auth/rbac

**Contexto:** o criterio da sprint exige cobertura unitario total dos use cases.

**O que fazer:**
- [ ] Escrever testes unitarios para `RegisterTenant`, `CreateUser`, `Login`, `GetCurrentUser`.
- [ ] Cobrir cenarios de erro: credencial invalida, tenant ausente, role sem permissao.
- [ ] Cobrir `IdentityCacheService` e `RbacPolicyService`.

**Criterios de Aceite:**
- [ ] 100% de cobertura unitario nos use cases de auth/rbac.
- [ ] Sem `any` em testes/mocks.
- [ ] Cada teste com motivo unico de falha.

**Notas tecnicas:**
> Priorizar fakes/stubs por contrato; evitar mock acoplado a detalhe interno.

---

### T11 - Testes de integracao e E2E de seguranca

**Contexto:** endpoints de auth e guardas RBAC precisam de validacao ponta a ponta.

**O que fazer:**
- [ ] Implementar E2E de: registrar tenant, login, endpoint protegido sem token (401), endpoint com role errada (403).
- [ ] Implementar testes de integracao para middleware de auth e extração de tenant por token.
- [ ] Validar sanitizacao de respostas sem hash/senha.

**Criterios de Aceite:**
- [ ] Todos os cenarios obrigatorios de E2E passando.
- [ ] Tenant context sempre coerente entre token e acesso ao repositorio.
- [ ] Nenhum endpoint protegido aceita `tenant_id` do body.

**Notas tecnicas:**
> Sempre validar o caso negativo de role e de token expirado.

---

### T12 - Validacao de single-tenant e checklist operacional final

**Contexto:** modo single-tenant faz parte do escopo e precisa prova executavel.

**O que fazer:**
- [ ] Validar startup e auth com `MULTI_TENANT=false` + `DEFAULT_TENANT_ID`.
- [ ] Validar scripts globais (`build/test/lint`) apos integracao completa.
- [ ] Consolidar checklist manual da sprint com resultados esperados.

**Criterios de Aceite:**
- [ ] Fluxo de login e endpoint protegido funciona em single-tenant.
- [ ] Qualidade global passando na raiz do monorepo.
- [ ] Sprint pronta para gate de aprovacao e posterior geracao de RNs.

**Notas tecnicas:**
> Tratar explicitamente ausencia de `DEFAULT_TENANT_ID` quando `MULTI_TENANT=false`.

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

> **Obrigatorio para considerar a sprint entregue.**

### Cenario 1 - Onboarding e login JWT em modo multi-tenant

**Objetivo:** comprovar cadastro de tenant, criacao de usuario admin e autenticacao Bearer.

**Pre-requisitos:**
- [ ] Infra local ativa (`bun run infra:up`)
- [ ] Migrations aplicadas (`bun run db:migrate`)
- [ ] API em execucao (`bun run dev --filter=api`)

**Passo a passo executavel:**
1. Chamar endpoint de cadastro de tenant (com admin inicial).
   - **Resultado esperado:** tenant, usuario admin e membership criados com sucesso.
2. Chamar endpoint de login com email/senha + tenant ativo.
   - **Resultado esperado:** retorno de token JWT Bearer valido.
3. Chamar endpoint protegido `GET /auth/me` com token.
   - **Resultado esperado:** 200 com identidade do usuario no tenant ativo, sem hash/senha.

**Criterio de aprovacao do cenario:**
- [ ] Fluxo onboarding + login + leitura de usuario atual concluido sem erro bloqueante.

---

### Cenario 2 - Seguranca de endpoints (401 e 403)

**Objetivo:** validar guardas de autenticacao e autorizacao por role.

**Pre-requisitos:**
- [ ] Usuario autenticado com token valido
- [ ] Endpoint admin-only disponivel (ex.: `POST /auth/users`)

**Passo a passo executavel:**
1. Chamar endpoint protegido sem header `Authorization`.
   - **Resultado esperado:** 401.
2. Chamar endpoint admin-only com token de `agent` ou `manager`.
   - **Resultado esperado:** 403.
3. Repetir chamada com token de `admin`.
   - **Resultado esperado:** sucesso (2xx).

**Criterio de aprovacao do cenario:**
- [ ] Politica RBAC aplicada conforme matriz de papeis definida.

---

### Cenario 3 - Modo single-tenant

**Objetivo:** validar comportamento com `MULTI_TENANT=false`.

**Pre-requisitos:**
- [ ] `MULTI_TENANT=false`
- [ ] `DEFAULT_TENANT_ID` configurado no ambiente

**Passo a passo executavel:**
1. Reiniciar API com variaveis de single-tenant.
   - **Resultado esperado:** bootstrap sem falha de configuracao.
2. Fazer login e chamar endpoint protegido.
   - **Resultado esperado:** token e autorizacao usando `DEFAULT_TENANT_ID`.
3. Executar `bun run test` e `bun run lint`.
   - **Resultado esperado:** suite de qualidade sem erros bloqueantes.

**Criterio de aprovacao do cenario:**
- [ ] Fluxo autenticado funciona sem exigir tenant do body.

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao `Testes Manuais de Entrega (Passo a Passo Executavel)` preenchida, executavel e detalhada
- [ ] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [ ] Decisoes tecnicas novas registradas em `docs/decisions/`
- [ ] Sem debito tecnico nao documentado
- [ ] Debitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolucao
- [ ] RNs respeitadas em toda implementacao
