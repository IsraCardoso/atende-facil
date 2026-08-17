# Sprint 01 — Monorepo + Infraestrutura Base

> **Período:** 05/04 até 06/04 | **Status:** `Concluída`

---

# 📋 GESTÃO

## Objetivo da Sprint

> *Entregar uma base técnica reproduzível e consistente para evoluir o produto com segurança nas próximas sprints.*

Configurar o monorepo com Turborepo + Bun, infraestrutura local com PostgreSQL e Valkey, app `api` com healthcheck e observabilidade mínima, package `db` com migration inicial, base de container DI tipado e cadeia de qualidade (TypeScript strict, Biome e Vitest) funcionando na raiz.

---

## Fluxo oficial de documentação (IA)

1. O usuário informa descrição e detalhes da próxima sprint.
2. A IA faz perguntas de clarificação (somente o necessário) e preenche esta doc de sprint.
3. O usuário revisa e aprova a sprint.
4. Somente após aprovação, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** não transferir nem detalhar RNs antes da aprovação explícita da sprint.

---

## Entregáveis


| #   | Entregável                            | Critério de conclusão                                                                 |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Monorepo base com apps e packages     | `bun install` funciona e estrutura de pastas segue `docs/context/project.md`          |
| 2   | API com Elysia + `/health`            | `bun run dev --filter=api` sobe e `GET /health` retorna 200                           |
| 3   | Infra local Docker                    | `docker compose up` sobe `postgres` e `valkey` sem erro                               |
| 4   | Banco com Drizzle + migration inicial | migration cria tabela `tenants` com sucesso                                           |
| 5   | Observabilidade mínima                | logger JSON com `correlationId` por request e sem `console.log` direto                |
| 6   | Tooling de qualidade                  | `bun run dev`, `bun run build`, `bun run test` e `bun run lint` funcionam na raiz     |
| 7   | Base de DI container                  | package `container` resolve dependências (singleton/transient) com lazy instantiation |


---

## Regras de Negócio desta Sprint

- [RN-001 — Fundação técnica e isolamento de camadas](../business-rules/RN-001-fundacao-tecnica-isolamento-camadas.md)
- [RN-002 — Configuração de ambientes e segredos](../business-rules/RN-002-configuracao-ambientes-segredos.md)
- [RN-003 — Observabilidade mínima com correlationId](../business-rules/RN-003-observabilidade-correlation-id.md)

> RNs criadas após aprovação explícita desta sprint em 2026-04-05.

---

## Fora do Escopo

- ❌ Implementar regras de negócio (domínio funcional do produto)
- ❌ Criar endpoints além de `/health`
- ❌ Implementar autenticação RBAC/BetterAuth nesta sprint
- ❌ Implementar filas/consumidores reais no `worker`
- ❌ Implementar design system completo no `ui`
- ❌ Integrações externas (Evolution API, OpenAI, webhooks)

---

## Métricas de Sucesso

- [x] 100% dos workspaces com TypeScript strict e sem `any`
- [x] `bun run dev` (raiz) inicia os serviços esperados sem erro
- [x] API responde 200 em `/health`
- [x] `bun run db:migrate` executa migration inicial sem falha
- [x] `bun run test` executa com pelo menos 1 teste por workspace
- [x] `bun run lint` sem erros e sem warnings bloqueantes
- [x] Ambiente reproduzível após derrubar e subir novamente o Docker

---

# ⚙️ ENGENHARIA

> **Instrução para a IA:** Leia o Plano de Execução antes de começar. Execute um set por vez. Após cada set, apresente o checkpoint e aguarde instrução do usuário.
> **Eficiência de contexto:** Quando houver docs longas, logs ou múltiplos arquivos grandes, usar `dont-be-greedy` para leitura incremental antes de expandir análise.

---

## Plano de Execução

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

## SET-A — Fundação do Monorepo e Tooling Base

> 🎯 **Escopo estimado:** ~450 linhas | **Complexidade:** Média
> **Racional:** estabelecer a fundação do repositório, padronização de TS strict e ferramentas globais antes das integrações.

---

### T01 — Estruturar monorepo e workspaces iniciais

**Contexto:** sem estrutura base consistente, qualquer implementação posterior fica frágil e difícil de manter.

**O que fazer:**

- Configurar Turborepo com Bun como package manager/runtime.
- Criar `apps/api`, `apps/web`, `apps/worker`.
- Criar `packages/types`, `packages/db`, `packages/flow`, `packages/auth`, `packages/ui`, `packages/container`.
- Garantir convenção de pastas alinhada com `docs/context/project.md`.

**Critérios de Aceite:**

- `bun install` resolve todos os workspaces sem erro.
- Estrutura de diretórios confere com o planejado.
- `packages/flow` nasce isolado (sem dependências de DB/HTTP/DI).

**Notas técnicas:**

> Manter `flow` como núcleo puro desde o início evita acoplamento acidental e retrabalho arquitetural nas próximas sprints.

---

### T02 — Padronizar TypeScript strict em todos os workspaces

**Contexto:** tipagem frouxa no início gera dívida técnica cara e difícil de remover depois.

**O que fazer:**

- Criar base compartilhada de `tsconfig` com `strict: true`.
- Aplicar em apps e packages.
- Proibir `any` e garantir build/typecheck coerente por workspace.

**Critérios de Aceite:**

- Todos os workspaces herdam a base strict.
- Não existe uso de `any` no código inicial.
- Typecheck global executa sem erro.

**Notas técnicas:**

> Preferir tipos explícitos em contratos de fronteira (env, logger, container e conexões externas).

---

### T03 — Configurar scripts globais, Biome e Vitest base

**Contexto:** qualidade contínua depende de comandos padronizados na raiz e feedback rápido.

**O que fazer:**

- Configurar scripts raiz: `dev`, `build`, `test`, `lint`.
- Configurar Biome (lint + format) no padrão Airbnb-like e sem erros permitidos.
- Configurar Vitest base para suportar testes unitários por workspace.

**Critérios de Aceite:**

- `bun run dev`, `bun run build`, `bun run test`, `bun run lint` existem e executam.
- Biome acusa erro para violações (incluindo `console.log`).
- Estrutura de testes pronta para cada workspace.

**Notas técnicas:**

> Sem pipeline de qualidade funcionando na raiz, falhas se espalham entre workspaces e o monorepo perde previsibilidade.

---

## SET-B — API, Observabilidade e Ambientes

> 🎯 **Escopo estimado:** ~420 linhas | **Complexidade:** Média
> **Racional:** consolidar borda HTTP, configuração de ambiente e logs estruturados sem depender do SET-C.

---

### T04 — Subir API Elysia com healthcheck

**Contexto:** endpoint de saúde é pré-requisito para validação operacional e integração com monitoramento futuro.

**O que fazer:**

- Configurar `apps/api` com Elysia.
- Implementar `GET /health` retornando status 200.
- Tratar porta em uso com mensagem de erro clara.

**Critérios de Aceite:**

- API sobe em desenvolvimento.
- `/health` responde 200 de forma determinística.
- Falha de bind de porta é explícita e legível.

**Notas técnicas:**

> Este set não deve introduzir casos de uso de negócio, apenas infraestrutura de entrada.

---

### T05 — Configurar variáveis de ambiente por ambiente

**Contexto:** ausência de validação de env é causa comum de falha silenciosa e comportamento inconsistente entre ambientes.

**O que fazer:**

- Definir estratégia para `dev`, `staging` e `production`.
- Criar `.env.example` completo e seguro (sem valores reais).
- Garantir erro explícito quando variável obrigatória estiver ausente.

**Critérios de Aceite:**

- Variáveis essenciais documentadas no `.env.example`.
- Inicialização falha cedo quando faltar env crítica.
- Configuração mantém separação entre ambientes.

**Notas técnicas:**

> Segredos nunca hardcoded; toda configuração sensível passa por variáveis de ambiente.

---

### T06 — Implementar logger JSON + correlationId e base de DI container

**Contexto:** observabilidade e composição de dependências são fundamentais para escalar sem acoplamento.

**O que fazer:**

- Implementar logger estruturado em JSON na API.
- Garantir `correlationId` por request e propagação mínima no fluxo.
- Criar `packages/container` com `register`/`resolve`, lifetimes singleton e transient, lazy instantiation.

**Critérios de Aceite:**

- Não há `console.log` direto no caminho principal.
- Logs incluem `timestamp`, `level`, `message` e `correlationId`.
- Container resolve dependências tipadas e possui teste mínimo validando funcionamento.

**Notas técnicas:**

> O container deve ser manual, explícito e sem libs externas, conforme regra arquitetural.

---

## SET-C — Dados, Cache e Infra Local *(paralelo com SET-B)*

> 🎯 **Escopo estimado:** ~430 linhas | **Complexidade:** Média
> **Racional:** isolar infraestrutura de persistência e cache em trilha paralela para acelerar entrega sem conflito de arquivos com SET-B.

---

### T07 — Configurar Docker Compose para PostgreSQL e Valkey

**Contexto:** reprodutibilidade local depende de serviços versionados e inicialização padronizada.

**O que fazer:**

- Criar `infra/docker-compose.yml` com `postgres:16` e `valkey`.
- Definir volumes e variáveis mínimas.
- Garantir subida/derrubada consistente sem intervenção manual extra.

**Critérios de Aceite:**

- `docker compose up` inicia ambos os serviços sem erro.
- Serviços ficam acessíveis nas portas esperadas.
- Re-subida após derrubar ambiente funciona sem inconsistência.

**Notas técnicas:**

> Manter compose simples nesta sprint; sem adicionar serviços fora do escopo.

---

### T08 — Configurar package `db` com Drizzle e migration inicial

**Contexto:** schema versionado desde a primeira sprint evita drift de banco e facilita evolução controlada.

**O que fazer:**

- Configurar cliente e arquivos de schema do Drizzle.
- Criar migration inicial com tabela `tenants` (sem dados).
- Garantir comando de migration executável pela raiz.

**Critérios de Aceite:**

- Conexão com banco funcional via `DATABASE_URL`.
- Migration cria tabela `tenants` com sucesso.
- Falha de conexão com DB gera erro tratável e explícito.

**Notas técnicas:**

> Mesmo sem regra de negócio, já manter convenções de naming e constraints mínimas.

---

### T09 — Validar conexão de Valkey (sem uso funcional)

**Contexto:** cache/fila será base de features futuras; conexão precisa estar pronta e verificável desde já.

**O que fazer:**

- Criar módulo de conexão ao Valkey.
- Validar conectividade no bootstrap (com tratamento de erro).
- Não implementar uso de fila/cache de negócio nesta sprint.

**Critérios de Aceite:**

- Conexão com Valkey é estabelecida em ambiente local.
- Erros de conexão são registrados de forma estruturada.
- Nenhuma lógica de negócio depende do Valkey neste estágio.

**Notas técnicas:**

> O objetivo é readiness técnico, não throughput nem processamento assíncrono real.

---

## SET-D — Integração Final e Validação de Qualidade

> 🎯 **Escopo estimado:** ~380 linhas | **Complexidade:** Média
> **Racional:** consolidar entregáveis dos sets anteriores, garantir critérios de aceite ponta a ponta e fechar sprint com baseline confiável.

---

### T10 — Consolidar scripts e integração entre workspaces

**Contexto:** comandos raiz devem orquestrar workspaces de forma previsível para dev e CI.

**O que fazer:**

- Integrar `apps/web` e `apps/worker` em scripts de monorepo.
- Garantir pipelines `dev/build/test/lint` estáveis no root.
- Ajustar dependências internas entre packages sem violar regras de camada.

**Critérios de Aceite:**

- Scripts globais executam sem quebra de resolução entre workspaces.
- Não há violação da dependency rule definida em `engineering.mdc`.
- Execução local reproduzível em máquina limpa.

**Notas técnicas:**

> Evitar acoplamento indevido entre apps e packages nesta consolidação.

---

### T11 — Cobrir workspaces com testes mínimos

**Contexto:** baseline de testes em todos os workspaces garante segurança para crescimento incremental nas próximas sprints.

**O que fazer:**

- Criar ao menos 1 teste por workspace (apps e packages).
- Garantir nomenclatura e estrutura de testes consistentes.
- Cobrir cenários críticos de bootstrap (health, container, env, conexões).

**Critérios de Aceite:**

- `bun run test` passa integralmente.
- Cada workspace possui ao menos um teste executável.
- Testes não usam `any` e respeitam strict mode.

**Notas técnicas:**

> Priorizar testes pequenos e determinísticos para evitar fragilidade na fundação.

---

### T12 — Validar edge cases e checklist manual de reprodutibilidade

**Contexto:** fechamento de sprint exige evidência prática de resiliência mínima em cenários de falha esperados.

**O que fazer:**

- Executar checklist manual: compose up, install, dev, healthcheck, migration, test, lint, restart ambiente.
- Validar mensagens de erro para env ausente, DB indisponível e porta em uso.
- Documentar observações e ajustes finais necessários.

**Critérios de Aceite:**

- Todos os passos manuais completam sem erro bloqueante.
- Edge cases definidos estão tratados com mensagens claras.
- Sprint encerra sem débito técnico crítico aberto.

**Notas técnicas:**

> Este set consolida robustez operacional inicial antes de avançar para regras de negócio.

---

## Testes Manuais de Entrega (Passo a Passo Executável)

> Esta seção consolida o roteiro executável de validação final da Sprint 01.

### Cenário 1 — Subir infraestrutura local e validar serviços base

**Objetivo:** garantir que PostgreSQL e Valkey sobem de forma reproduzível no ambiente local.

**Pré-requisitos:**
- [x] Docker Desktop em execução
- [x] Variáveis de ambiente de porta disponíveis (`POSTGRES_HOST_PORT` e `VALKEY_HOST_PORT`, quando necessário)

**Passo a passo executável:**
1. Executar `bun run infra:up` na raiz do monorepo.
   - **Resultado esperado:** containers `postgres` e `valkey` em estado `running`/`healthy`.
2. Executar `bun run infra:ps`.
   - **Resultado esperado:** ambos os serviços listados sem status de erro.

**Critério de aprovação do cenário:**
- [x] Infraestrutura local sobe sem erro bloqueante e com healthcheck válido.

---

### Cenário 2 — Validar setup, migrations, API e qualidade

**Objetivo:** comprovar que o monorepo está funcional ponta a ponta com build, testes, lint e healthcheck.

**Pré-requisitos:**
- [x] Infraestrutura local ativa (cenário 1 aprovado)

**Passo a passo executável:**
1. Executar `bun install` na raiz.
   - **Resultado esperado:** instalação concluída sem falhas de workspace.
2. Executar `bun run db:migrate`.
   - **Resultado esperado:** migration aplicada com sucesso (incluindo criação de `tenants`).
3. Executar `bun run dev`.
   - **Resultado esperado:** API sobe e fica disponível para requisições.
4. Acessar `http://localhost:3000/health`.
   - **Resultado esperado:** resposta HTTP `200` com payload de saúde.
5. Em outro terminal, executar `bun run test`.
   - **Resultado esperado:** suíte de testes passando em todos os workspaces.
6. Executar `bun run lint`.
   - **Resultado esperado:** lint/format check sem erros.
7. Executar `bun run infra:down` e depois `bun run infra:up`.
   - **Resultado esperado:** ambiente reinicia sem inconsistências e mantém reprodutibilidade.

**Critério de aprovação do cenário:**
- [x] Todos os comandos executam com sucesso e o endpoint `/health` responde `200`.

---

## Checklist Final da Sprint

- [x] Todos os sets concluídos e aprovados
- [x] Todos os critérios de aceite validados
- [x] Seção `Testes Manuais de Entrega (Passo a Passo Executável)` preenchida, executável e detalhada
- [x] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [x] Decisões técnicas novas registradas em `docs/decisions/`
- [x] Sem débito técnico não documentado
- [x] Débitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolução
- [x] RNs respeitadas em toda implementação

