## Context

RN-019 débito: "Sem deprovisionamento: o papel no Chatwoot é definido só na primeira federação e nunca reconciliado. Um usuário desativado ou removido do tenant mantém o espelho e o acesso ao Chatwoot ativos — requer remoção manual pelo operador até que `ChatwootPlatformPort` ganhe um método de revogação."

O domínio já modela `TenantMembershipEntity.status: "active" | "invited" | "suspended"` (`apps/api/src/domain/auth-types.ts:13`) — o estado "desativado" já existe no tipo, só nunca foi escrito por nenhum use case. `MembershipRepositoryPort` só tem `create`/`findByUserAndTenant`/`listByUserId` — não há update nem delete.

Autorização no codebase segue DOIS padrões distintos hoje: `RbacPolicyService.assertAllowed(role, permission)` dentro do use case (domínio `auth` — `create-user-use-case.ts`, `get-current-user-use-case.ts`) e `assertAdminRole(role, set)` na camada de rota (domínio `whatsapp-integration`). Esta change fica no domínio `auth` — segue o padrão `RbacPolicyService`, coerente com os vizinhos diretos.

## Goals / Non-Goals

**Goals:**
- Desativar (suspender) ou remover um membership revoga o acesso ao Chatwoot daquele tenant, best-effort.
- Nenhum tenant fica sem administrador via este fluxo (guard de último-admin).
- Ator não consegue se autodeprovisionar por este endpoint (previne lockout).

**Non-Goals:**
- Reativação de membership suspenso (não pedido; adiciona uma 3ª ação sem necessidade documentada — YAGNI).
- `users.isActive` (coluna global) — não usada por nenhum use case hoje; o débito é por-tenant, não global. Fora de escopo.
- Suporte a usuário com memberships em múltiplos tenants apontando para instâncias Chatwoot DIFERENTES (o mesmo `users.chatwoot_user_id` é global por usuário Atende Fácil — um usuário em 2 tenants com Chatwoot configurado em instâncias diferentes teria o espelho vinculado à conta do tenant que fez SSO primeiro). Gap pré-existente, não introduzido nem resolvido aqui; fora do escopo dos dois débitos documentados em RN-019.
- Endpoint de CRUD completo de membros (listar, editar role) — só as duas ações do débito (deactivate/remove).

## Decisions

**D1 — `revokeUserFromAccount` remove o usuário da CONTA do tenant, não deleta o Chatwoot user global.**
Alternativa considerada: `DELETE /platform/api/v1/users/{id}` (deleta o Chatwoot user inteiro). Rejeitada: destruiria o espelho mesmo que o usuário continue ativo em OUTRO tenant (users.chatwoot_user_id é global). Remover da conta (`DELETE /accounts/{account_id}/account_users`) revoga exatamente o acesso àquele tenant, preservando o espelho para outros vínculos.

**D2 — Endpoint `DELETE .../account_users` confirmado via developers.chatwoot.com, mas o parâmetro `user_id` não está documentado no swagger publicado (nem body nem query aparecem na spec — só o `account_id` de path).** Implementado enviando `user_id` no body JSON, espelhando o payload do endpoint irmão `POST .../account_users` (`{user_id, role}`) e a convenção Rails de `params` aceitar body em qualquer verbo. **Isto é uma inferência, não uma confirmação — marcado como pendência de validação manual contra uma instância Chatwoot real antes do primeiro uso em produção** (tasks.md 6.x).

**D3 — Guard de último-admin conta memberships `status === "active"` com `role === "admin"` no tenant, exclui o próprio alvo da contagem.**
`listByTenant` (novo) retorna todos os memberships do tenant; a use case filtra e conta. Se o alvo é o único admin ativo restante, rejeita com erro de domínio antes de qualquer mutação ou chamada ao Chatwoot.

**D4 — Falha na chamada ao Chatwoot (`revokeUserFromAccount`) é best-effort: loga warn, não interrompe a deprovisão no Atende Fácil.**
Mesmo padrão de `deactivate-whatsapp-integration-use-case.ts` (`try { await connection.disconnect(config) } catch { /* best-effort */ }`). A fonte de verdade de acesso é o Atende Fácil — o membership muda de status/é removido independente do Chatwoot responder. Consequência aceita: se o Chatwoot estiver indisponível no momento da deprovisão, o acesso lá permanece até uma nova tentativa manual (mesmo risco documentado no débito original, só que agora com uma tentativa automática best-effort em vez de zero tentativas).

**D5 — Remover (`remove`) faz hard delete de `tenant_memberships`, não soft-delete.**
A tabela não tem `deleted_at` (verificado no schema, `packages/db/src/schema/tenant-memberships.ts`); `onDelete: "cascade"` já existe na FK de `tenants`/`users`. Introduzir soft-delete aqui expandiria escopo (migration nova, filtro em TODO leitor de membership) sem pedido explícito — YAGNI. O `unique(tenantId, userId)` da tabela também exige isso: sem hard delete, o usuário nunca poderia ser re-convidado ao mesmo tenant (colisão de unique constraint).

## Risks / Trade-offs

- [Risco] `revokeUserFromAccount` com parâmetro inferido (D2) pode falhar silenciosamente em produção se o Chatwoot rejeitar o shape do body → **Mitigação**: best-effort (D4) já garante que isso não trava a deprovisão no Atende Fácil; warn logado com o erro real da Platform API para o operador investigar. Tasks.md marca validação manual como pendência antes de habilitar em produção.
- [Risco] Guard de último-admin consulta `listByTenant` a cada deprovisão — custo extra de 1 query. **Mitigação**: tabela pequena por tenant (dezenas de linhas), sem índice adicional necessário (já indexado por `tenant_id`).
- [Risco] Hard delete de membership perde histórico de quem já foi membro do tenant. **Mitigação**: fora de escopo (não pedido); se necessário no futuro, é auditoria via evento de domínio, não estado da tabela.

## Migration Plan

Sem migration de schema — `tenant_memberships.status` já suporta `suspended`; `remove` usa DELETE já suportado pela tabela (sem soft-delete a adicionar). Deploy: código sobe, endpoints ficam disponíveis imediatamente para admins autenticados. Rollback: reverter o commit — sem estado a desfazer (mutations são idempotentes: deprovisionar um membership já suspenso/removido é no-op ou erro `MEMBERSHIP_NOT_FOUND`, nunca corrompe dado).
