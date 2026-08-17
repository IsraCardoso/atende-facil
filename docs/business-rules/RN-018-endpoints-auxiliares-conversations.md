# RN-018 — Endpoints Auxiliares de Conversations com Tenant Isolation

> **Versão:** 1.0 | **Status:** Ativa | **Sprint:** 06

---

## A Regra

**Endpoints de listagem e detalhe de conversations devem sempre filtrar por `tenant_id` extraído do token autenticado. Listagens devem ser paginadas obrigatoriamente, com limite máximo por página.**

---

## Motivação

Garantir isolamento multi-tenant e evitar exposição acidental de dados entre tenants. Paginação protege contra queries sem limite em tabelas com volume crescente.

---

## Detalhamento

1. `GET /conversations`: lista conversas do tenant autenticado, com paginação obrigatória.
   - Query params aceitos: `status` (filtro opcional), `page` (default 1), `limit` (default 20, max 100).
   - Resposta inclui `data[]`, `total`, `page`, `limit`, `hasMore`.
2. `GET /conversations/:id`: retorna detalhe de uma conversa do tenant autenticado.
   - Se conversa não pertence ao tenant ou não existe: 404.
3. O `tenant_id` é sempre extraído do token JWT — nunca aceito do body, query ou path.
4. Nenhum endpoint de conversations é público — autenticação obrigatória.

---

## Exceções

Nenhuma.

---

## Impacto

| Área | Impacto |
|---|---|
| Backend | Rotas autenticadas com filtro de tenant |
| Segurança | Isolamento multi-tenant em toda query |
| Performance | Paginação obrigatória evita queries custosas |
