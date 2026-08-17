## Context

Duas invariantes do domínio (RN-019 "1 admin ativo mínimo", RN-020/021 "1 flow ativo por tenant") são hoje enforced com um padrão check-then-act **sem transação nem lock**: ler o estado atual, decidir em memória, escrever. Sob concorrência (dois requests simultâneos), a janela entre leitura e escrita permite que ambos passem o check antes de qualquer write committar.

`FlowRepositoryPort` e `MembershipRepositoryPort` (`apps/api/src/domain/ports/`) hoje não expõem nenhum conceito de transação — cada método é uma query Drizzle isolada contra `db: PostgresJsDatabase<typeof schema>` (`packages/db/src/database.ts:36`). Nenhum lugar do codebase usa `db.transaction()` ainda; esta change introduz o padrão pela primeira vez.

**Achado relevante para o item de flows:** a tabela `flows` teve um índice único parcial (`flows_one_active_per_tenant`, `WHERE status = 'active' AND deleted_at IS NULL`) criado em `packages/db/drizzle/0004_flows_table.sql` e removido em `packages/db/drizzle/0006_drop_flows_unique_active.sql` (commit `45775d2`, sprint-10 T02). A justificativa registrada (`docs/sprints/sprint-10.md:109`) foi "com schedules, múltiplos flows `published` convivem" — mas o índice removido era escopado a `status = 'active'`, não `'published'`. Rastreando o fluxo de schedules (`flow-resolver-service.ts:88`, `create-schedule-use-case.ts:44`): um schedule referencia um `flowId` via `flowRepository.findById` (sem filtro de status) e nunca muta `flows.status`. A remoção do índice não era necessária para a feature que a motivou — é seguro reintroduzi-lo.

## Goals / Non-Goals

**Goals:**
- Eliminar a janela TOCTOU no guard de último-admin (`tenant-member-deprovisioning-shared.ts:21`) via transação + row lock.
- Eliminar a janela em que o swap de flow ativo pode deixar 0 ou 2 flows `active` simultâneos (`go-live-flow-use-case.ts`, `activate-flow-use-case.ts`).
- Reintroduzir o índice único parcial em `flows` como defesa em profundidade, validado contra o uso real de schedules.
- Fechar os gaps de cobertura de teste reportados no mesmo review (port-factory, HTTP-route-level, flow-templates).

**Non-Goals:**
- Não alterar o comportamento observável do caminho sequencial (single-writer) — mesmos códigos de erro, mesmas transições.
- Não introduzir um mecanismo genérico de Unit-of-Work/transação cross-repository — cada fix adiciona um método atômico pontual ao port relevante, escopado ao caso de uso que precisa dele.
- Não resolver a pendência de validação manual do `revokeUserFromAccount` (já rastreada em `tasks.md` da change `user-deprovisioning`, fora de escopo aqui).

## Decisions

### D1. Guard de último-admin: transação + `SELECT ... FOR UPDATE`, sem constraint de banco

Um `CHECK` constraint agregado (COUNT de admins ativos) não é expressável no Postgres. A correção é mover `assertNotLastActiveAdmin` + a mutação (`updateStatus`/`remove`) para dentro de UMA transação Drizzle (`db.transaction(async (tx) => {...})`) que trava as memberships `admin`/`active` do tenant com `.select(...).for('update')` antes de contar e decidir. Dois requests concorrentes contra os 2 últimos admins agora serializam: o segundo só lê o estado depois que o primeiro commitou (ou reverteu).

`MembershipRepositoryPort` ganha um método novo (nome final decidido em tasks.md, ex. `changeStatusIfNotLastAdmin` / `removeIfNotLastAdmin`) que encapsula lock+guard+mutação. Ele retorna um resultado tipado (`{ ok: true; membership } | { ok: false; reason: "LAST_ADMIN" }`) em vez de lançar `AppError` diretamente — `AppError`/`createAppError` vivem em `application/errors`, e a Dependency Rule do projeto proíbe `infrastructure` de depender de `application`. `tenant-member-deprovisioning-shared.ts` (application layer) traduz `reason: "LAST_ADMIN"` para `createAppError("MEMBERSHIP_LAST_ADMIN", ...)`, preservando o contrato de erro atual.

**Alternativa considerada:** constraint `EXCLUDE` ou trigger em Postgres contando admins ativos. Rejeitada — triggers agregados sobre COUNT são frágeis (recalculam em cada write, custam mais que um lock pontual) e o projeto não usa triggers em nenhum outro lugar (nenhum hit em `packages/db/drizzle/*.sql`).

### D2. Swap de flow ativo: transação + reintrodução do índice único parcial

`FlowRepositoryPort` ganha um método atômico (`activateExclusive(tenantId, flowId)`, nome final em tasks.md) que, dentro de `db.transaction()`, trava a linha `active` atual do tenant com `.for('update')`, reconfirma seu id após o lock, demove-a para `published` e ativa a linha-alvo — tudo em uma transação. `go-live-flow-use-case.ts` e `activate-flow-use-case.ts` passam a chamar este método único em vez de duas chamadas `updateStatus` sequenciais e independentes.

O índice único parcial `flows_one_active_per_tenant` (`WHERE status = 'active' AND deleted_at IS NULL`) é reintroduzido via nova migration Drizzle. Ele não conflita com o uso real de schedules (D-contexto acima) e funciona como segunda linha de defesa: mesmo que um código futuro bypasse `activateExclusive`, o banco rejeita a segunda linha `active`.

`activateExclusive` retorna um resultado tipado (`{ ok: true; activated; previousActiveFlow } | { ok: false; reason: "ACTIVATION_CONFLICT" }`), simétrico ao D1 — quando o `unique_violation` (SQLSTATE `23505`) do índice dispara (duas ativações concorrentes sem flow ativo prévio pra travar, ou a mesma corrida vista pelo lado perdedor mesmo com flow prévio — ver nota de teste abaixo), o repositório captura o erro e devolve `ok: false` em vez de deixar o erro bruto do driver subir; os use cases traduzem pra `createAppError("FLOW_ACTIVATION_CONFLICT", ...)` (409). A UPDATE final também exige `deletedAt IS NULL` — sem essa guarda, um `softDelete` concorrente no meio da troca produziria uma linha `active`+soft-deletada invisível pra `findById`/`findActiveByTenant` e fora do alcance do índice (que só cobre `deleted_at IS NULL`).

**Nota de teste (achado do `/review`, persona testing):** sob `READ COMMITTED`, quando já existe um flow ativo prévio, o vencedor da corrida pelo `FOR UPDATE` demove-o e commita primeiro; o perdedor (que estava bloqueado nesse lock) acorda e RE-AVALIA o `WHERE` contra a versão já commitada — o flow demovido não bate mais em `status='active'` e some do resultado do perdedor, que passa a agir como se não houvesse flow ativo algum. Ou seja: quem efetivamente impede os DOIS lados de vencerem, mesmo com um flow ativo pré-existente, é o índice único — o lock garante só a atomicidade do swap demote+activate de quem vence primeiro, não a exclusão mútua entre alvos diferentes. As duas integration tests (com e sem flow ativo prévio) observam o mesmo resultado por esse motivo.

**Alternativa considerada:** manter só a transação, sem o índice. Rejeitada — o índice é grátis (nenhum código legítimo hoje viola `status='active'` único) e cobre também erros de programação futuros fora do use case, que uma transação isolada não pega.

**Alternativa considerada:** manter só o índice, sem transação. Rejeitada — o índice sozinho vira um unique-violation error na segunda transação concorrente, mas não evita a janela de "0 flows ativos" entre o demote e o commit; a transação é necessária para atomicidade do swap em si.

### D3. Repositórios in-memory (testes) permanecem sem lock real

`createInMemoryFlowRepository`/`in-memory-auth-repositories.ts` são single-threaded (Node event loop, sem I/O real entre leitura e escrita) — já são atômicos por construção. Os métodos novos (`activateExclusive`, guard de último-admin) são implementados nas versões in-memory como as mesmas operações sequenciais de hoje, sem lock explícito, apenas para satisfazer o mesmo `FlowRepositoryPort`/`MembershipRepositoryPort`. Os testes de concorrência real (Test scenarios do tasks.md) rodam contra `drizzle-flow-repository.integration.test.ts`/equivalente para membership, com Postgres real.

## Risks / Trade-offs

- **[Risco]** Reintroduzir o índice único pode falhar a migration se o banco atual (dev/staging) já tiver, por algum bug pré-existente, 2 flows `active` para o mesmo tenant → **[Mitigação]** a migration falha alto (não silenciosamente) nesse caso; o SQL carrega como comentário a query de auditoria (`SELECT tenant_id, COUNT(*) FROM flows WHERE status='active' AND deleted_at IS NULL GROUP BY tenant_id HAVING COUNT(*) > 1`) pro operador rodar manualmente se a migration falhar, diagnosticar e corrigir os dados antes de tentar de novo — não é um pre-flight automatizado, é um diagnóstico documentado pro caminho de falha.
- **[Risco]** `SELECT ... FOR UPDATE` sem `NOWAIT`/`SKIP LOCKED` bloqueia a segunda transação até a primeira commitar — sob alta concorrência real (não esperada neste domínio: 1 admin/1 flow-swap por tenant é uma ação humana rara) isso vira fila serializada, não erro → **[Mitigação]** aceitável dado o volume; documentado como trade-off deliberado, não revisitar sem medição real de contenção.
- **[Risco]** Timeout de transação padrão do `postgres-js` (`connect_timeout: 10`, sem `statement_timeout` explícito em `packages/db/src/database.ts:28-32`) pode deixar uma transação travada em lock indefinidamente se o client cair no meio → **[Mitigação]** fora de escopo desta change (afeta toda transação futura, não só estas duas); registrar como Observação para follow-up separado, não bloqueia este fix.

## Migration Plan

1. Migration Drizzle nova: `CREATE UNIQUE INDEX "flows_one_active_per_tenant" ON "flows" ("tenant_id") WHERE status = 'active' AND deleted_at IS NULL` — **sem `CONCURRENTLY`**, deliberado: o migrator do `drizzle-orm/postgres-js` roda todas as migrations pendentes dentro de UMA transação (`session.transaction`), e `CREATE INDEX CONCURRENTLY` não pode executar dentro de um bloco de transação — usar o mesmo padrão sem `CONCURRENTLY` do `0004_flows_table.sql` original. Trade-off aceito: a criação do índice toma um lock `ACCESS EXCLUSIVE` breve na tabela `flows` durante o deploy (tabela pequena por tenant, não uma tabela de alto volume).
2. Deploy dos métodos atômicos nos repositórios Drizzle (sem mudança de assinatura pública dos use cases — `go-live-flow-use-case.ts`/`activate-flow-use-case.ts`/`tenant-member-deprovisioning-shared.ts` trocam a chamada interna, contrato HTTP inalterado).
3. Rollback: `DROP INDEX IF EXISTS "flows_one_active_per_tenant"` reverte o passo 1; reverter o código para as chamadas sequenciais antigas reverte os passos de aplicação (nenhuma migration de dados irreversível envolvida).

## Open Questions

Nenhuma — mecanismo, escopo e nomes finais dos métodos ficam fechados em `tasks.md`.
