# Spec Driven V3 Monorepo

Monorepo orientado a **Spec Driven Development** para uma plataforma SaaS multi-tenant de automacao de atendimento.

O projeto segue padroes de arquitetura hexagonal + DDD lightweight, com foco em:

- tipagem forte e semantica (`Email`, `TenantId`, `DatabaseUrl`, etc.);
- reproducibilidade local (`Docker Compose`, scripts de raiz);
- rastreabilidade por sprint, RN e changelog;
- qualidade continua (`build`, `test`, `lint`) em todos os workspaces.

---

## Stack principal

- **Monorepo:** Turborepo
- **Runtime / package manager:** Bun
- **API:** Elysia
- **Banco:** PostgreSQL 16 + Drizzle ORM
- **Cache/Fila:** Valkey
- **Qualidade:** TypeScript strict, Vitest, Biome

---

## Estrutura

```text
apps/
  api/      API HTTP (Elysia)
  web/      SPA React
  worker/   Processamento assincrono

packages/
  types/      Tipos compartilhados (fortes e especificos)
  db/         Drizzle, schema, migrations, conexoes DB/Valkey
  flow/       Nucleo puro (sem DB/HTTP/DI)
  auth/       Base inicial de autenticacao
  ui/         Tokens e base de design system
  container/  Container DI manual e tipado

infra/
  docker-compose.yml

docs/
  context/
  business-rules/
  sprints/
  changelog/
```

---

## Pre-requisitos

- Bun `>= 1.3.x`
- Docker + Docker Compose

---

## Quick start

1. **Instalar dependencias**

```bash
bun install
```

2. **Subir infraestrutura local**

```bash
bun run infra:up
```

3. **Executar migracoes**

```bash
bun run db:migrate
```

4. **Subir ambiente de desenvolvimento**

```bash
bun run dev
```

5. **Validar qualidade**

```bash
bun run build
bun run test
bun run lint
```

---

## Scripts da raiz

| Script | Descricao |
|---|---|
| `bun run dev` | Sobe workspaces com task `dev` |
| `bun run build` | Build/typecheck de todos os workspaces |
| `bun run test` | Executa testes de todos os workspaces |
| `bun run lint` | Executa Biome em todos os workspaces |
| `bun run typecheck` | Alias para validacao de build/typecheck |
| `bun run db:generate` | Gera migration Drizzle em `packages/db` |
| `bun run db:migrate` | Executa migration Drizzle em `packages/db` |
| `bun run valkey:check` | Valida conectividade com Valkey |
| `bun run infra:up` | Sobe `postgres` e `valkey` via Docker Compose |
| `bun run infra:ps` | Mostra status dos containers |
| `bun run infra:down` | Derruba infraestrutura local |

---

## Portas e ambientes

- API: `API_PORT` (padrao `3000`)
- PostgreSQL host port: `POSTGRES_HOST_PORT` (padrao `5432`)
- Valkey host port: `VALKEY_HOST_PORT` (padrao `6379`)

Se alguma porta estiver ocupada, sobrescreva a variavel antes de subir:

```bash
# exemplo (Windows cmd)
set POSTGRES_HOST_PORT=55432 && set VALKEY_HOST_PORT=56379 && bun run infra:up
```

---

## Padroes obrigatorios

- **Sem `any`** e com `strict` em todos os workspaces.
- **Tipagem forte e especifica** para conceitos semanticos.
- **Sem `console.log`** em runtime; usar logger estruturado.
- **Flow puro** em `packages/flow` (sem DB/HTTP/DI).
- **Debito tecnico resolvido deve ser marcado como `[x]`** no changelog/sprint.

---

## Referencias importantes

- `docs/context/project.md` — contexto tecnico do projeto
- `docs/sprints/sprint-01.md` — escopo e execucao da Sprint 01
- `docs/changelog/CHANGELOG.md` — historico e debitos tecnicos
- `.cursor/rules/engineering.mdc` — regras de engenharia e arquitetura

