# Contexto do Projeto

> **Este arquivo é lido pela IA antes de qualquer implementação.** Mantenha-o atualizado. É a fonte de verdade sobre o que é este projeto e como ele funciona.

---

## O que é este projeto

Plataforma SaaS de automação de atendimento via WhatsApp. Permite que empresas (retailers) configurem fluxos de atendimento determinísticos — com menus, coleta de dados e triagem automática — sem depender de um desenvolvedor. Possui um editor visual de fluxos (estilo n8n), painel de atendimento humano (inbox), suporte a multi-tenant, agendamento de fluxos por horário e roadmap de integração com IA (RAG por cliente e de FAQS, informações gerais e etc).

O produto é genérico e pode ser usado por qualquer segmento. O caso de uso inicial é uma farmácia de manipulação.

---

## Stack tecnológica

| Camada | Tecnologia | Observação |
|---|---|---|
| Monorepo | Turborepo | Apps: `api`, `web`, `worker`. Packages: `types`, `db`, `flow`, `auth`, `ui` |
| Runtime (backend) | Bun | Runtime e package manager |
| Framework HTTP | Elysia | Rotas, plugins, validação de schema |
| Frontend | React 18 + Vite | SPA — sem Next.js |
| Estilização | TailwindCSS + shadcn/ui | Design system próprio no package `ui` |
| Editor de fluxo | React Flow | Drag & drop de nós no builder |
| Banco de dados | PostgreSQL 16 | Schema multi-tenant, migrations versionadas |
| ORM / Query Builder | Drizzle ORM | Type-safe, integrado com migrations |
| Cache / Fila | Valkey | Cache de sessões e fluxos ativos; filas com BullMQ |
| Autenticação | BetterAuth | Sessions, RBAC, integração com Elysia |
| Integração WhatsApp | Evolution API | Webhook receptor, envio de mensagens |
| Vetor (futuro) | pgvector | RAG — embeddings por tenant |
| Infra local | Docker Compose | PostgreSQL + Valkey + API + Worker |
| Deploy | Coolify + Docker | Staging e produção em VPS — ver `docs/guides/deploy-coolify-hostinger.md` |
| Testes | Vitest + Supertest | Unitários, integração, E2E |
| Lint / Format | Biome | Estilo Airbnb-like, strict |

---

## Estrutura de pastas

```
.
├── apps/
│   ├── api/                    # Backend — Elysia
│   │   └── src/
│   │       ├── domain/         # Entidades, value objects, interfaces de repositório
│   │       ├── application/    # Use cases, DTOs
│   │       ├── infrastructure/ # Repositórios concretos, adapters externos
│   │       └── interface/      # Controllers HTTP, webhook handlers, guards
│   ├── web/                    # Frontend — React + Vite
│   │   └── src/
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/       # Chamadas à API
│   └── worker/                 # Processamento assíncrono — filas, eventos
│       └── src/
│           ├── consumers/
│           └── jobs/
│
├── packages/
│   ├── types/                  # Tipos e interfaces compartilhados entre apps
│   ├── db/                     # Schema Drizzle, migrations, client
│   ├── flow/                   # Flow Engine (lógica de domínio pura)
│   ├── auth/                   # RBAC, middleware, helpers de sessão
│   └── ui/                     # Design system, componentes, temas
│
├── infra/
│   ├── docker-compose.yml      # Ambiente local
│   └── Dockerfile              # Build de produção
│
└── docs/
    ├── context/project.md
    ├── business-rules/
    ├── sprints/
    ├── decisions/
    └── changelog/CHANGELOG.md
```

---

## Arquitetura: DDD Lightweight + Hexagonal

```
Domain       → Entidades, value objects, regras de negócio puras
Application  → Use cases, orquestração, DTOs
Infrastructure → Implementações concretas (DB, APIs externas)
Interface    → HTTP, webhooks, adapters de entrada
```

**Regra de dependência:**
- `domain` não importa nada externo
- `application` importa apenas `domain`
- `infrastructure` importa `domain`
- `interface` importa `application`

---

## Modelo de sessão e modo de atendimento

Cada conversa tem um modo:

```typescript
type SessionMode = 'bot' | 'waiting_human' | 'human_active'
```

Transições:
- `bot` → `waiting_human`: usuário pede humano OU nó de transferência no fluxo
- `waiting_human` → `human_active`: atendente assume a conversa no painel
- `human_active` → `bot`: atendente encerra e retorna ao bot (opcional)

---

## Multi-tenant

- Todas as tabelas possuem `tenant_id` indexado
- `tenant_id` é sempre extraído do token autenticado — nunca do corpo da requisição
- Suporte a modo single-tenant via `MULTI_TENANT=false` + `DEFAULT_TENANT_ID` no `.env`

---

## Convenções de código

- **Nomenclatura:** `camelCase` para variáveis e funções, `PascalCase` para classes e tipos, `kebab-case` para arquivos e pastas
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`)
- **Erros:** sempre retornar `{ error: "mensagem legível", code: "ERRO_CODIGO" }` com status HTTP correto
- **Validação:** sempre na borda (interface layer), antes de chegar ao use case
- **Logs:** estruturados em JSON com `correlationId` e `tenantId` sempre presentes

### Tipagem forte e específica (obrigatória)

- **Não usar `string` genérica** para dados com semântica de domínio/infra (ex.: e-mail, IDs, URLs de conexão, correlation id)
- **Preferir tipos explícitos e específicos**, como branded types e value objects (ex.: `Email`, `TenantId`, `DatabaseUrl`, `ValkeyUrl`)
- **Validação e normalização** devem ocorrer na criação do tipo específico (fail-fast em caso inválido)
- **Objetivo:** reduzir ambiguidade, evitar troca acidental de valores entre contextos e aumentar segurança de refatoração

### JSDoc estratégico (obrigatório)

- **Documentar o porquê, não o quê.** JSDoc deve explicar contratos, invariantes e decisões — nunca narrar código óbvio.
- **Module-level obrigatório:** todo arquivo `.ts` (exceto barrels/index) deve ter um JSDoc de módulo no topo explicando sua responsabilidade em 1-2 linhas.
- **Ports e interfaces:** documentar o contrato (ex.: "Lock distribuído com TTL de 10s para serializar processamento").
- **Exported functions:** documentar factory functions com semântica de negócio e `@throws` quando aplicável.
- **Branded types:** explicar por que o tipo existe (type-safety, prevenção de mistura de IDs).
- **Proibido:** JSDoc em helpers privados, getters/setters triviais, barrels/index, ou comentários que repetem o nome da função.

### Política de débito técnico

- Todo débito técnico aberto deve ser registrado com checklist (`[ ]`) no `docs/changelog/CHANGELOG.md`
- Sempre que um débito for resolvido, ele deve ser atualizado para **resolvido** (`[x]`) com observação do que foi corrigido
- Débito resolvido não deve permanecer como pendente em sprint encerrada

---

## Ambiente de desenvolvimento

```bash
# Subir banco e Valkey
bun run infra:up

# Instalar dependências (na raiz do monorepo)
bun install

# Rodar migrations
bun run db:migrate

# Rodar API em modo dev
bun run dev --filter=api

# Rodar frontend em modo dev
bun run dev --filter=web

# Rodar todos os testes
bun run test

# Lint
bun run lint
```

---

## Variáveis de ambiente (`.env.example`)

```env
# App
NODE_ENV=development
API_HOST=0.0.0.0
API_PORT=3000
LOG_LEVEL=debug
MULTI_TENANT=true
DEFAULT_TENANT_ID=

# Banco
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spec_driven

# Valkey
REDIS_URL=redis://localhost:6379
POSTGRES_HOST_PORT=5432
VALKEY_HOST_PORT=6379

# Auth
AUTH_SECRET=

# Evolution API
EVOLUTION_API_URL=
EVOLUTION_API_KEY=

# IA (futuro)
OPENAI_API_KEY=
```

---

## Integrações externas

| Serviço | Uso | Env |
|---|---|---|
| Evolution API | Envio/recebimento de mensagens WhatsApp | `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` |
| OpenAI (futuro) | Embeddings e completions para RAG | `OPENAI_API_KEY` |

---

## Decisões arquiteturais registradas

> Consulte `docs/decisions/` para o raciocínio completo de cada decisão.

- [DEC-001 — Monorepo com Turborepo](../decisions/DEC-001-monorepo-turborepo.md)
- [DEC-002 — Bun + Elysia como runtime e framework HTTP](../decisions/DEC-002-bun-elysia.md)
- [DEC-003 — PostgreSQL + Drizzle ORM](../decisions/DEC-003-postgres-drizzle.md)
- [DEC-004 — BetterAuth para autenticação e RBAC](../decisions/DEC-004-betterauth.md)
- [DEC-005 — Evolution API para integração WhatsApp](../decisions/DEC-005-evolution-api.md)
- [DEC-006 — React Flow para editor visual de fluxos](../decisions/DEC-006-react-flow.md)

---

## O que a IA deve saber sobre este projeto

- **Nunca adicionar dependências sem aprovação explícita.** Liste a dependência e aguarde confirmação antes de instalar.
- **Nunca hardcodar valores de configuração.** Tudo via variáveis de ambiente.
- **Nunca acessar banco sem `tenant_id` filtrado** (exceto nas queries de autenticação e lookup de tenant).
- **O flow engine em `packages/flow` é puro** — sem dependências de banco ou HTTP. Toda persistência é responsabilidade da `infrastructure`.
- **Fluxo documental oficial (OpenSpec):** `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Guia: `docs/guides/openspec-workflow.md`.
- **Specs:** `openspec/specs/` (16 capabilities, 28 RNs migradas). Mapa: `docs/migration/rn-to-openspec-map.md`.
- **Legado:** `docs/business-rules/` e `docs/sprints/` (01–10) somente leitura; arquivos em `openspec/changes/archive/`.
- **Kanban:** OpenSpec UI via `openspec-ui.json` na raiz (porta 3333).
- **Prioridade:** `openspec/specs/` > legacy RN > padrão técnico > convenção.
