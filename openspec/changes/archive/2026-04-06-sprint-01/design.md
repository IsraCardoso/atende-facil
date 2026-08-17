## Context

Archived implementation of Sprint 01 — Monorepo + Infraestrutura Base. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *Entregar uma base técnica reproduzível e consistente para evoluir o produto com segurança nas próximas sprints.*

Configurar o monorepo com Turborepo + Bun, infraestrutura local com PostgreSQL e Valkey, app `api` com healthcheck e observabilidade mínima, package `db` com migration inicial, base de container DI tipado e cadeia de qualidade (TypeScript strict, Biome e Vitest) funcionando na raiz.

---

### Non-Goals
- ❌ Implementar regras de negócio (domínio funcional do produto)
- ❌ Criar endpoints além de `/health`
- ❌ Implementar autenticação RBAC/BetterAuth nesta sprint
- ❌ Implementar filas/consumidores reais no `worker`
- ❌ Implementar design system completo no `ui`
- ❌ Integrações externas (Evolution API, OpenAI, webhooks)
---

## Decisions

### Execution plan (legacy SETs)

```
```text
Rodada 1:  [SET-A: Fundação do Monorepo e Tooling Base]
Rodada 2:  [SET-B: API, Observabilidade e Ambientes] ║ [SET-C: Dados, Cache e Infra Local]     (paralelos — sessões independentes)
Rodada 3:  [SET-D: Integração Final e Validação de Qualidade]
```


| Set   | Tasks         | Depende de   | Paralelo com |
| ----- | ------------- | ------------ | ------------ |
| SET-A | T01, T02, T03 | —            | —            |
| SET-B | T04, T05, T06 | SET-A        | SET-C        |
| SET-C | T07, T08, T09 | SET-A        | SET-B        |
| SET-D | T10, T11, T12 | SET-B, SET-C | —            |


> **Critério de paralelismo:** dois sets são paralelos quando não compartilham arquivos e não dependem um do outro. A IA nunca executa sets paralelos na mesma sessão.
> **Estratégia de commit por set:** 1 commit por set concluído; `SET-B` e `SET-C` em sessões/branches independentes para evitar mistura de mudanças.

---
```

- **SET-A**: Fundação do Monorepo e Tooling Base]
- **SET-B**: API, Observabilidade e Ambientes] ║ [SET-C: Dados, Cache e Infra Local]     (paralelos — sessões independentes)
- **SET-D**: Integração Final e Validação de Qualidade]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
