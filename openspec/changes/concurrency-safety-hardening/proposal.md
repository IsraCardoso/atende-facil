## Why

O review final da sessão anterior (checkpoint `2026-07-31-ux-backlog-chatwoot-p0.md`) achou duas race conditions reais de TOCTOU (time-of-check-to-time-of-use) que nenhuma spec documenta hoje: (1) o guard de "último admin" em `assertNotLastActiveAdmin` lê a lista de admins ativos e decide fora de qualquer lock — duas chamadas concorrentes de deactivate/remove contra os 2 últimos admins podem ambas passar o check antes de qualquer write committar, zerando os admins do tenant; (2) o swap de flow ativo (`go-live-flow-use-case.ts`, mesmo padrão em `activate-flow-use-case.ts`) faz demote-anterior e activate-atual como duas queries `updateStatus` sequenciais e independentes — uma falha entre elas deixa o tenant com 0 ou 2 flows ativos, violando RN-020/RN-021 (unicidade). Nenhum requirement normativo cobre concorrência hoje; ambos os specs (`tenant-membership-lifecycle`, `flows`) tratam apenas o caminho sequencial.

Junto, o review também reportou gaps de cobertura de teste não-bloqueantes que ficam mais baratos de fechar na mesma change (mesmos arquivos, contexto já carregado): zero teste para `chatwoot-platform-port-factory.ts`, sem teste HTTP-route-level para os 3 endpoints novos da sessão anterior (deactivate/remove membro, signup), e `flow-templates.test.ts` sem cobertura de reachability de todos os branches.

## What Changes

- `MembershipRepositoryPort` ganha um método atômico (`deactivateIfNotLastAdmin`/`removeIfNotLastAdmin`, ou equivalente) que executa o guard de último-admin e a mutação dentro de UMA transação Postgres com `SELECT ... FOR UPDATE` travando as memberships `admin`/`active` do tenant — elimina a janela TOCTOU entre o `listByTenant` e o `updateStatus`/`remove` atuais.
- `FlowRepositoryPort` ganha um método atômico (`activateExclusive` ou equivalente) que faz demote-anterior + activate-atual dentro de UMA transação Postgres; `go-live-flow-use-case.ts` e `activate-flow-use-case.ts` passam a usá-lo em vez de duas chamadas `updateStatus` sequenciais.
- Índice único parcial em `flows` (`WHERE status = 'active'`, escopado por `tenant_id`) como defesa em profundidade contra a invariante de unicidade, independente da transação.
- Testes de concorrência (duas chamadas simultâneas contra o mesmo estado) para os dois métodos atômicos acima.
- Testes unitários para `chatwoot-platform-port-factory.ts` (resolução per-tenant, fallback, cache — mesmo padrão de `chatwoot-port-factory.test.ts` se existir).
- Testes HTTP-route-level para `POST/DELETE` de deactivate/remove de membro de tenant e para o endpoint de signup.
- Cobertura de reachability de todos os branches em `flow-templates.test.ts`.

**Sem alteração de comportamento observável no caminho feliz** — as duas mudanças de concorrência só afetam o resultado sob corrida concorrente (hoje corrompido silenciosamente); o caminho sequencial single-writer continua idêntico.

### New Capabilities
(nenhuma)

### Modified Capabilities
- `tenant-membership-lifecycle`: requirements de "Desativação de membro de tenant" e "Remoção de membro de tenant" ganham garantia de atomicidade sob concorrência para o guard de último-admin.
- `flows`: requirement RN-020 ganha garantia de atomicidade para a troca de flow ativo (nunca 0 nem 2 flows ativos simultaneamente, mesmo sob falha ou concorrência).

## Impact

- `apps/api/src/domain/ports/auth-ports.ts` (`MembershipRepositoryPort`)
- `apps/api/src/domain/ports/flow-ports.ts` (`FlowRepositoryPort`)
- `apps/api/src/application/use-cases/tenant-member-deprovisioning-shared.ts` (`assertNotLastActiveAdmin` substituído pelo método atômico do repositório)
- `apps/api/src/application/use-cases/flows/go-live-flow-use-case.ts`, `activate-flow-use-case.ts`
- `apps/api/src/infrastructure/repositories/drizzle-membership-repository.ts`, `drizzle-flow-repository.ts` (implementação da transação + `FOR UPDATE`)
- `apps/api/src/infrastructure/repositories/in-memory-auth-repositories.ts`, `in-memory-flow-repository.ts` (equivalente sem lock real — single-threaded já é atômico)
- `packages/db/src/schema/flows.ts` (índice único parcial) + migration nova em `packages/db/migrations/`
- `apps/api/src/infrastructure/chatwoot/chatwoot-platform-port-factory.ts` (teste novo, sem mudança de comportamento)
- `apps/web/src/pages/{signup}.tsx`, rotas de deactivate/remove (teste HTTP-level novo, sem mudança de comportamento)
- `apps/web/src/lib/flow-templates.test.ts` (cobertura adicional)
- `openspec/specs/tenant-membership-lifecycle/spec.md`, `openspec/specs/flows/spec.md` (requirements atualizados)
