## Context

`LoginUseCase.resolveTenantId` (`apps/api/src/application/use-cases/login-use-case.ts:40-79`) exige `tenantSlug` sempre que `tenantMode.multiTenant === true`, lançando `AUTH_TENANT_REQUIRED` sem ele. O frontend (`login.tsx`) já envia `tenantSlug: tenantSlug || undefined` — ou seja, a UI já permite campo vazio, é o BACKEND que rejeita. `POST /auth/register-tenant` (`register-tenant-use-case.ts`) já existe, é público e não precisa mudar — só falta UI consumindo.

## Goals / Non-Goals

**Goals:**
- Login funciona sem `tenantSlug` para o caso comum (usuário com 1 tenant).
- Caso raro (usuário em 2+ tenants) tem um caminho explícito, não um erro genérico.
- Tela de signup usa o endpoint já existente, sem mudar seu contrato.

**Non-Goals:**
- Convite de usuário para tenant existente via e-mail (fora do escopo — já existe `POST /auth/users`, admin-only, não é auto-cadastro).
- Troca de tenant ativo DEPOIS de logado (multi-tenant switcher no painel) — não pedido.
- Verificação de e-mail / double opt-in no signup — não pedido, mesmo nível de segurança do `register-tenant` atual (senha + validação de formato, sem confirmação por e-mail).

## Decisions

**D1 — Resolução de tenant por e-mail ocorre DEPOIS da verificação de senha, não antes.**
Mesma ordem já usada hoje (`login-use-case.ts:106-118`: busca usuário → verifica senha → resolve tenant). Preserva o comportamento de segurança existente (não vazar existência de tenant/membership antes de confirmar a senha).

**D2 — Ambiguidade retorna a LISTA de tenants candidatos no `details` do erro, não um novo endpoint de "listar meus tenants".**
Alternativa considerada: endpoint separado `GET /auth/tenants-for-email` chamado ANTES do login. Rejeitada: exigiria 2 round-trips no caso comum só para descobrir que não há ambiguidade, e vazaria a lista de tenants de um e-mail sem verificar a senha primeiro (oráculo de enumeração). Embutir a lista no erro 409 do PRÓPRIO `/auth/login` mantém 1 round-trip no caso comum e só revela tenants candidatos depois que a senha já foi confirmada.

**D3 — Erro novo `AUTH_TENANT_AMBIGUOUS` (409), não reaproveitar `AUTH_TENANT_REQUIRED` (400).**
Semântica diferente: `AUTH_TENANT_REQUIRED` significa "faltou informar, e o servidor não sabe decidir sozinho" (400, erro de request); `AUTH_TENANT_AMBIGUOUS` significa "a senha está certa, mas há mais de uma opção válida" (409, conflito de estado) — o frontend precisa distinguir "peça o campo" de "mostre uma escolha com os nomes retornados".

**D4 — Frontend: campo de slug não é removido do código, só escondido por padrão.**
Alternativa considerada: remover o campo inteiramente e reintroduzir só quando `AUTH_TENANT_AMBIGUOUS` chegar. Rejeitada: mais estado para gerenciar (mostrar/esconder um `Input` de texto livre) do que necessário — como o backend já aceita `tenantSlug` opcional, a resposta ambígua retorna os CANDIDATOS (slug+name) e o frontend renderiza um seletor de OPÇÕES (não um campo de texto livre), mais seguro contra erro de digitação do que reexibir o campo de texto.

## Risks / Trade-offs

- [Risco] Usuário com 2+ tenants ativos digitando a MESMA senha em todos — o 409 revela nomes de tenant a alguém que já provou saber a senha; aceitável (é o próprio dono da conta).
- [Risco] `listByUserId` roda em toda tentativa de login sem slug — custo de 1 query extra por login vs. hoje. Aceitável (tabela pequena por usuário, poucas memberships).
- [Trade-off] Signup sem verificação de e-mail: mesmo nível de confiança do `register-tenant-use-case` atual — não é regressão, é o comportamento já existente exposto numa UI.

## Migration Plan

Sem migration de schema. Sem mudança de contrato em endpoints existentes (`register-tenant` inalterado; `login` aceita o mesmo body, só relaxa a obrigatoriedade de `tenantSlug` e adiciona um novo `code` possível na resposta de erro). Deploy: código sobe, comportamento antigo (com `tenantSlug` explícito) inalterado; usuários com 1 tenant passam a poder omitir o campo imediatamente.
