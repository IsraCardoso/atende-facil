# RN-021 - Persistencia de flows com Drizzle

> **Status:** `Ativa`
> **Dominio:** Infraestrutura / Persistencia
> **Criada em:** 2026-04-07 | **Atualizada em:** 2026-04-07

---

## Contexto

Ate esta sprint, todos os repositorios do projeto sao in-memory. O modulo de flows e o primeiro a implementar persistencia real com Drizzle ORM + PostgreSQL. O pattern definido aqui servira de referencia para migrar os demais repositorios no futuro.

---

## A Regra

**Flows sao persistidos na tabela `flows` do PostgreSQL via Drizzle ORM. Toda query obrigatoriamente filtra por `tenant_id`. Registros com `deleted_at` preenchido nao aparecem em queries padrao. Um unique partial index garante no maximo 1 flow ativo por tenant no nivel do banco.**

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| Qualquer query de flow | Filtra por tenant_id obrigatoriamente |
| Query de listagem/busca | Exclui registros com deleted_at != NULL |
| Ativar flow | Constraint unica parcial bloqueia 2 ativos |
| Race condition na ativacao | Banco rejeita operacao (unique violation) |

---

## Schema obrigatorio

| Coluna | Tipo | Constraint |
|---|---|---|
| id | UUID | PK, default random |
| tenant_id | UUID | FK tenants, NOT NULL, indexed |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | nullable |
| definition | JSONB | NOT NULL, default {} |
| status | VARCHAR(20) | NOT NULL, default 'draft' |
| version | INTEGER | NOT NULL, default 1 |
| created_at | TIMESTAMPTZ | NOT NULL, default now() |
| updated_at | TIMESTAMPTZ | NOT NULL, default now() |
| deleted_at | TIMESTAMPTZ | nullable (soft delete) |

---

## Impactos Tecnicos

- **Validacao:** `packages/db/src/schema/flows.ts`, `apps/api/src/infrastructure/repositories/drizzle-flow-repository.ts`
- **Afeta:** packages/db (schema + migration), apps/api (infrastructure)

---

## Rastreabilidade

- **Solicitado por:** Engenharia
- **RNs relacionadas:** [RN-020](./RN-020-crud-ciclo-vida-flows.md)
- **Sprints que implementaram:** [sprint-07](../sprints/sprint-07.md)
