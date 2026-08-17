## Context

Archived implementation of Sprint 02 - Multi-tenant + Autenticacao + RBAC. Migrated from custom SDD workflow.

## Goals / Non-Goals

### Goals
- *Permitir cadastro de tenant, autenticacao por JWT Bearer e autorizacao por papel em endpoints protegidos, com isolamento multi-tenant garantido por token.*

Entregar a base de identidade e acesso da plataforma com modelo escalavel de vinculacao usuario-tenant (N:N), autenticao com BetterAuth + JWT Bearer, middleware de autenticacao/autorizacao no Elysia, casos de uso de onboarding/login/usuario atual e abstractions de cache/log (Ports + Adapters + Services) funcionando em producao local.

---

### Non-Goals
- ❌ SSO/social login
- ❌ Fluxo de convite por email e onboarding enterprise
- ❌ Recuperacao de senha por email
- ❌ Painel de atendimento humano/inbox
- ❌ Integracoes externas (Evolution API, OpenAI)
- ❌ Refatoracao ampla do flow engine (escopo da Sprint 03)
---

## Decisions

### Execution plan (legacy SETs)

```
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
```

- **SET-A**: Modelo de Identidade e Contratos]
- **SET-B**: Autenticacao JWT + Middleware RBAC]
- **SET-C**: Ports/Adapters/Services de Cache e Logs]
- **SET-D**: Integracao Final + Qualidade]

## Migration Plan

N/A — already deployed. Specs consolidated in `openspec/specs/`.

## Open Questions

- None (archived delivery).
