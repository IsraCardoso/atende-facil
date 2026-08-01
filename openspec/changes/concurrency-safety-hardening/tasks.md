## 1. Domínio

- [x] 1.1 `apps/api/src/domain/ports/auth-ports.ts`: `MembershipRepositoryPort` ganha `updateStatusIfNotLastAdmin(tenantId: TenantId, membershipId: TenantMembershipId, status: MembershipStatus): Promise<{ ok: true; membership: TenantMembershipEntity } | { ok: false; reason: "LAST_ADMIN" }>` e `removeIfNotLastAdmin(tenantId: TenantId, userId: UserId): Promise<{ ok: true } | { ok: false; reason: "LAST_ADMIN" }>` — encapsulam lock + guard + mutação atômica (ver design.md D1). `listByTenant` permanece (ainda usado por outros callers, se houver — grep antes de remover)
- [x] 1.2 `apps/api/src/domain/ports/flow-ports.ts`: `FlowRepositoryPort` ganha `activateExclusive(tenantId: string, flowId: FlowId): Promise<{ activated: FlowEntity; previousActiveFlow: FlowEntity | null }>` (design.md D2)

## 2. Infraestrutura

- [x] 2.1 `apps/api/src/infrastructure/repositories/drizzle-membership-repository.ts`: implementar `updateStatusIfNotLastAdmin`/`removeIfNotLastAdmin` via `db.transaction(async (tx) => {...})` com `tx.select().from(tenantMembershipsTable).where(...).for("update")` travando as memberships `admin`/`active` do tenant antes de contar e decidir
- [x] 2.2 `apps/api/src/infrastructure/repositories/in-memory-auth-repositories.ts`: mesmas duas operações na implementação in-memory — sequencial, sem lock real (design.md D3)
- [x] 2.3 `apps/api/src/infrastructure/repositories/drizzle-flow-repository.ts`: implementar `activateExclusive` via `db.transaction()` com `tx.select().from(flowsTable).where(eq(status,'active')).for("update")`, demote + activate dentro da mesma transação
- [x] 2.4 `apps/api/src/infrastructure/repositories/in-memory-flow-repository.ts`: implementar `activateExclusive` sequencial, sem lock real
- [x] 2.5 Migration Drizzle nova em `packages/db/drizzle/`: query de auditoria (`SELECT tenant_id, COUNT(*) ... HAVING COUNT(*) > 1`) documentada como comentário + `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "flows_one_active_per_tenant" ON "flows" ("tenant_id") WHERE status = 'active' AND deleted_at IS NULL`; atualizar `packages/db/src/schema/flows.ts` com o `uniqueIndex` de volta na definição

## 3. Aplicação

- [x] 3.1 `apps/api/src/application/use-cases/tenant-member-deprovisioning-shared.ts`: remover `assertNotLastActiveAdmin`; `deactivate-tenant-member-use-case.ts` e `remove-tenant-member-use-case.ts` passam a chamar `updateStatusIfNotLastAdmin`/`removeIfNotLastAdmin` e traduzir `{ ok: false, reason: "LAST_ADMIN" }` para `createAppError("MEMBERSHIP_LAST_ADMIN", ...)` (mesmo código de erro atual — contrato HTTP inalterado)
- [x] 3.2 `apps/api/src/application/use-cases/flows/go-live-flow-use-case.ts` e `activate-flow-use-case.ts`: substituir as duas chamadas `updateStatus` sequenciais por uma chamada a `flowRepository.activateExclusive` (mesmos retornos `{ flow, previousActiveFlow }` — contrato do use case inalterado)
- [x] 3.3 `apps/api/src/infrastructure/repositories/cached-flow-repository.ts`: decorator ganha `activateExclusive` — delega ao inner e invalida `cacheKey(tenantId)` (mesmo padrão de `updateStatus` hoje)

## 4. Testes de concorrência

- [x] 4.1 Teste de concorrência para `updateStatusIfNotLastAdmin`/`removeIfNotLastAdmin` contra Postgres real (mesmo padrão de `drizzle-flow-repository.integration.test.ts` se existir, senão novo `drizzle-membership-repository.integration.test.ts`): disparar duas chamadas simultâneas (`Promise.all`) contra os 2 últimos admins ativos do mesmo tenant, assertar que exatamente uma falha com `reason: "LAST_ADMIN"` e o tenant termina com >= 1 admin ativo
- [x] 4.2 Teste de concorrência para `activateExclusive`: disparar duas chamadas simultâneas de ativação (flows diferentes, mesmo tenant) contra Postgres real, assertar que o tenant termina com exatamente 1 flow `active` (nunca 0, nunca 2)
- [x] 4.3 Teste unitário (repositório in-memory ou mock) cobrindo os cenários de erro adicionados nos specs desta change: `MEMBERSHIP_LAST_ADMIN` via ambos os use cases, idempotência de `activateExclusive` sobre flow já ativo

## 5. Cobertura de teste — gaps do review anterior

- [x] 5.1 `apps/api/src/infrastructure/chatwoot/chatwoot-platform-port-factory.test.ts` (novo): resolução per-tenant, fallback global, cache por tenantId, e o bug já corrigido em `917c032` (erro transiente de DB não deve cachear o fallback permanentemente) — mesmo padrão de `chatwoot-port-factory.test.ts` se existir
- [x] 5.2 Testes HTTP-route-level (padrão `create-api-server.test.ts`, `app.handle(new Request(...))`) para: `POST /auth/users/:userId/deactivate`, `DELETE /auth/users/:userId`, e o endpoint de signup — sucesso, 403 sem permissão, 404/409 nos guards
- [x] 5.3 `apps/web/src/lib/flow-templates.test.ts`: cobertura de reachability para todos os templates da galeria (hoje só alguns branches cobertos — conferir quais faltam antes de escrever)

## 6. Documentação e validação

- [x] 6.1 `docs/changelog/CHANGELOG.md`: entrada em inglês para os dois fixes de concorrência
- [x] 6.2 `bunx tsc -p apps/api/tsconfig.json --noEmit` — 0 erros (também `apps/web/tsconfig.json` — 0 erros)
- [x] 6.3 `bun --cwd=apps/api run test` — 318/318 passed, 18 skipped (56 arquivos, 3 skipados). **Docker Desktop indisponível nesta sessão** (`docker ps` falhou) — os testes de concorrência de 4.1/4.2 e os 3 arquivos `*.integration.test.ts` (incluindo os 2 novos) foram **escritos e type-checados, mas NUNCA executados de fato** nesta sessão; `describe.skipIf(!dockerAvailable)` os pulou automaticamente. Rodar com Docker disponível antes de mergear pra confirmar não-flakiness real.
- [x] 6.4 `bun --cwd=apps/web run test` — 11/11 passed (3 arquivos)
- [x] 6.5 `bunx biome check --write apps/api apps/web packages/db` — 0 erros (5 arquivos reformatados automaticamente, sem mudança de comportamento)
- [x] 6.6 `bunx openspec validate --specs --changes "concurrency-safety-hardening" --strict` — 21/21 specs + change válidos

## 7. Achados do `/review` multi-persona (11 agentes) — todos aplicados

- [x] 7.1 `updateStatusIfNotLastAdmin`'s UPDATE não escopava `tenant_id` (só o SELECT do lock escopava) — 3 revisores concordaram (project-standards, correctness, security). Corrigido em `drizzle-membership-repository.ts`.
- [x] 7.2 `updateStatus`/`remove` (sem guard) ficaram sem caller de produção após o rewire — attractive nuisance que reabriria a corrida corrigida. Removidos do `MembershipRepositoryPort` e das duas implementações (Drizzle + in-memory). `listByTenant` mantido (uso genérico plausível, usado pelo próprio teste de integração).
- [x] 7.3 `activateExclusive`'s `unique_violation` (índice `flows_one_active_per_tenant`) vazava sem tratamento até um 500 genérico — 3 revisores concordaram (reliability, api-contract, adversarial). `ActivateExclusiveResult` virou union discriminada (`{ok:true,...} | {ok:false,reason:"ACTIVATION_CONFLICT"}`), novo código `FLOW_ACTIVATION_CONFLICT` (409) em `app-error.ts`, use cases traduzem.
- [x] 7.4 `activateExclusive`'s UPDATE do alvo sem guarda `deletedAt IS NULL` — corrida com `softDelete` concorrente podia reativar um flow soft-deletado como "ghost row" invisível. Corrigido.
- [x] 7.5 `design.md` citava `CREATE INDEX CONCURRENTLY` mas a migration real (corretamente) não usa — o migrator do Drizzle roda tudo numa transação, `CONCURRENTLY` não pode. Também corrigida a descrição da audit-query (documentada como comentário de diagnóstico pós-falha, não pre-flight automatizado). `design.md` atualizado.
- [x] 7.6 Teste de corrida "com flow ativo prévio" tinha asserção fraca (só contava o total, não settled/ok por chamada) — passaria mesmo se `.for('update')` fosse removido. Reescrito com asserções `ok`/conflito explícitas + comentário explicando o mecanismo real (EvalPlanQual sob READ COMMITTED).
- [x] 7.7 JSDoc em helper privado de teste (`collectReachableNodeIds`) e módulo sem doc-comment (`auth-ports.ts`, `in-memory-auth-repositories.ts`) — ajustados.
- [ ] 7.8 Não aplicado (fora de escopo, registrado como risco residual): JWT de admin desativado permanece válido até expirar — `verify-access-token-use-case.ts` só checa assinatura/expiração, não status de membership ao vivo. Achado por 2 revisores (security, testing). Requer decisão arquitetural maior (TTL, revocation list, ou live-check) — não é bug introduzido por esta change.
