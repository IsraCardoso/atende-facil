# Changelog

> Histórico de mudanças do projeto. Atualizado ao final de cada sprint ou a cada conjunto de commits significativo.
> Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).
> Regra: sempre que um débito técnico registrado for resolvido, atualizar o item para `[x]` e descrever a resolução.

---

## [Não lançado]

> Mudanças em desenvolvimento que ainda não foram para produção.

### Adicionado
- 

### Alterado
- 

### Corrigido
- 

---

## [sprint-01] — 2026-04-06

> **Objetivo:** Configurar a fundação técnica do projeto com monorepo funcional, observabilidade mínima e infraestrutura local reproduzível.

### Adicionado
- Estrutura de monorepo com Turborepo + Bun, apps (`api`, `web`, `worker`) e packages (`types`, `db`, `flow`, `auth`, `ui`, `container`).
- API Elysia com endpoint `GET /health`, logger JSON estruturado e `correlationId` por requisição.
- Base de DI container tipado com suporte a singleton/transient e lazy instantiation.
- Infraestrutura local com `infra/docker-compose.yml` para PostgreSQL 16 e Valkey, incluindo healthchecks.
- Package `db` com Drizzle ORM, schema inicial `tenants`, migration versionada e scripts de `db:migrate`/`valkey:check`.
- Cobertura mínima de testes unitários em todos os workspaces.

### Alterado
- Scripts de raiz expandidos com `db:generate`, `db:migrate`, `valkey:check`, `infra:up`, `infra:down` e `infra:ps`.
- Estratégia de `test` dos workspaces ajustada para exigir arquivos de teste (remoção de `--passWithNoTests` onde já há cobertura).

### Corrigido
- Mensagens explícitas para edge cases de inicialização: variável de ambiente ausente, falha de conexão com DB/Valkey e porta HTTP em uso.
- Portas do Docker Compose parametrizadas (`POSTGRES_HOST_PORT` e `VALKEY_HOST_PORT`) para contornar conflito de porta já ocupada no host.

### Decisões técnicas registradas
- Nenhuma decisão nova em `docs/decisions/` nesta sprint.

### Regras de negócio implementadas
- [RN-001 — Fundação técnica e isolamento de camadas](../business-rules/RN-001-fundacao-tecnica-isolamento-camadas.md)
- [RN-002 — Configuração de ambientes e segredos](../business-rules/RN-002-configuracao-ambientes-segredos.md)
- [RN-003 — Observabilidade mínima com correlationId](../business-rules/RN-003-observabilidade-correlation-id.md)

### Débitos técnicos gerados
- [x] Substituído cast de contexto em `apps/api/src/interface/http/create-api-server.ts` por tipagem inferida nativa do Elysia. Também foi tipado `resolveCorrelationId(request: Request)` para manter consistência da borda HTTP. (resolvido em 2026-04-06)

---

<!--
## [sprint-XX] — YYYY-MM-DD
...
-->
