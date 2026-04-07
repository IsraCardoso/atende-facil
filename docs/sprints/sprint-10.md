# Sprint 10 — Agendamento e Automacoes por Horario

> **Periodo:** 07/04 ate 21/04 | **Status:** `Em andamento`

---

# GESTAO

## Objetivo da Sprint

> *O admin do tenant configura quais fluxos ficam ativos em quais horarios e dias da semana, e o sistema troca automaticamente. Ao receber uma mensagem, o FlowResolver determina qual fluxo usar com base no horario atual do tenant.*

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Schema `flow_schedules` com migration | Tabela criada no PostgreSQL com migration versionada |
| 2 | Timezone por tenant | Tenant tem timezone configuravel na tabela `tenants` |
| 3 | FlowResolverService | Ao receber mensagem, resolve qual flow usar por horario/dia |
| 4 | CRUD de schedules | Endpoints REST protegidos por RBAC (admin/manager) |
| 5 | Worker cron de avaliacao | Job BullMQ a cada 60s invalida cache de tenants com transicao |
| 6 | Endpoint admin de reavaliacao | `POST /admin/schedules/evaluate` forca reavaliacao manual |
| 7 | Tela de agendamentos | Calendario semanal visual com blocos coloridos por fluxo |
| 8 | Tela de configuracoes | Tenant timezone selecionavel |

---

## Regras de Negocio desta Sprint

- [RN-027 — Agendamento de fluxos por horario](../business-rules/RN-027-agendamento-fluxos-por-horario.md)
- [RN-028 — Timezone por tenant](../business-rules/RN-028-timezone-por-tenant.md)

---

## Fora do Escopo

- Agendamento por data especifica (feriados)
- Recorrencia mensal ou anual
- Multiplos timezones por tenant
- Notificacoes de transicao de schedule
- Historico de ativacao de schedules

---

## Metricas de Sucesso

- [ ] FlowResolver retorna flow correto em 100% dos cenarios testados
- [ ] Zero sobreposicao de schedules aceita no backend
- [ ] Worker invalida cache em menos de 60s apos transicao
- [ ] Testes passando com 100% cobertura no FlowResolver

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez. Apos cada set, apresente o checkpoint e aguarde instrucao do usuario.
> **Eficiencia de contexto:** Quando houver docs longas, logs ou multiplos arquivos grandes, usar `dont-be-greedy` para leitura incremental antes de expandir analise.

---

## Plano de Execucao

```
Rodada 1: [SET-A: Schema + Domain Types]
Rodada 2: [SET-B: FlowResolver + Repository]
Rodada 3: [SET-C: API Routes + Worker Cron]
Rodada 4: [SET-D: Frontend Calendar + Settings]
Rodada 5: [SET-E: Tests + Closing]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03, T04 | — | — |
| SET-B | T05, T06, T07, T08 | SET-A | — |
| SET-C | T09, T10, T11, T12 | SET-B | — |
| SET-D | T13, T14, T15, T16, T17 | SET-C | — |
| SET-E | T18, T19, T20 | SET-D | — |

---

## SET-A — Schema + Domain Types

> **Escopo estimado:** ~200 linhas | **Complexidade:** Baixa
> **Racional:** Fundamentacao de schema e tipos que todo o resto depende.

---

### T01 — Migration: timezone no tenants

**Contexto:** O tenant precisa de timezone para resolver schedules no horario local.

**O que fazer:**
- [ ] Criar migration adicionando coluna `timezone` `varchar(50)` default `'America/Sao_Paulo'` na tabela `tenants`
- [ ] Atualizar `packages/db/src/schema/tenants.ts` com a nova coluna

**Criterios de Aceite:**
- [ ] Migration roda sem erro
- [ ] Coluna `timezone` existe na tabela `tenants` com default correto

**Notas tecnicas:**
> `varchar(50)` cobre todos os identificadores IANA.

---

### T02 — Migration: remover unique constraint flows

**Contexto:** Com schedules, multiplos flows `published` convivem. O constraint de 1 active por tenant continua valido na aplicacao, mas nao no banco.

**O que fazer:**
- [ ] Criar migration removendo o index `flows_one_active_per_tenant`
- [ ] Atualizar `packages/db/src/schema/flows.ts` removendo o `uniqueIndex` da definicao

**Criterios de Aceite:**
- [ ] Migration roda sem erro
- [ ] Index nao existe mais no banco

**Notas tecnicas:**
> A regra de negocio de 1 flow ativo por tenant continua, mas agora enforced no application layer, nao no DB.

---

### T03 — Migration: tabela flow_schedules

**Contexto:** Tabela que armazena as faixas de horario/dia por fluxo por tenant.

**O que fazer:**
- [ ] Criar `packages/db/src/schema/flow-schedules.ts` com schema Drizzle
- [ ] Criar migration com colunas: `id` (uuid PK), `tenant_id` (FK `tenants`), `flow_id` (FK `flows`), `days_of_week` (`integer[]` — 0=Dom…6=Sab), `start_time` (varchar 5 `HH:MM`), `end_time` (varchar 5 `HH:MM`), `active` (boolean default true), `created_at`, `updated_at`
- [ ] Indices: `tenant_id`, `(tenant_id, active)`
- [ ] Exportar em `packages/db/src/schema/index.ts` e `packages/db/src/index.ts`

**Criterios de Aceite:**
- [ ] Tabela criada com todas as colunas e indices
- [ ] Schema exportado do package `db`

---

### T04 — Domain types e ports

**Contexto:** Tipos de dominio e contrato de repositorio para schedules.

**O que fazer:**
- [ ] Criar `apps/api/src/domain/schedule-types.ts` com `FlowScheduleId` (branded), `DayOfWeek` (`0|1|2|3|4|5|6`), `FlowScheduleEntity`
- [ ] Criar `apps/api/src/domain/ports/schedule-ports.ts` com `FlowScheduleRepositoryPort`: `findActiveByTenant(tenantId)`, `findById(tenantId, scheduleId)`, `save(schedule)`, `delete(tenantId, scheduleId)`, `findOverlapping(tenantId, daysOfWeek, startTime, endTime, excludeId?)`
- [ ] Exportar em `apps/api/src/domain/ports/index.ts`

**Criterios de Aceite:**
- [ ] Tipos estritamente tipados com branded types
- [ ] Port com todos os metodos necessarios para CRUD + validacao de overlap

---

## SET-B — FlowResolver + Repository

> **Escopo estimado:** ~350 linhas | **Complexidade:** Alta
> **Racional:** Core da feature — logica de resolucao de flow por horario.

---

### T05 — DrizzleFlowScheduleRepository + InMemory

**Contexto:** Implementacoes concretas do port definido em T04.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-flow-schedule-repository.ts`
- [ ] Criar `apps/api/src/infrastructure/repositories/in-memory-flow-schedule-repository.ts`
- [ ] `findOverlapping`: query que detecta intersecao de dia+horario para um tenant, excluindo opcionalmente um schedule por ID (para update)
- [ ] Exportar em `index.ts`

**Criterios de Aceite:**
- [ ] Drizzle repo usa tenant isolation em todas as queries
- [ ] `findOverlapping` retorna schedules que conflitam
- [ ] InMemory implementa mesma interface para testes

---

### T06 — FlowResolverService

**Contexto:** Servico de dominio que resolve qual flow usar para um tenant no momento atual.

**O que fazer:**
- [ ] Criar `apps/api/src/application/services/flow-resolver-service.ts`
- [ ] Metodo `resolveFlow(tenantId, now?)`: (1) buscar timezone do tenant, (2) converter `now` para horario local do tenant, (3) buscar schedules ativos que cobrem dia+hora atual, (4) se encontrar: retornar flow do schedule via `flowRepository.findById`, (5) se nao encontrar: retornar `flowRepository.findActiveByTenant` (fallback)
- [ ] Aceitar deps via constructor: `FlowScheduleRepositoryPort`, `FlowRepositoryPort`, `TenantRepositoryPort`, `CachePort` (opcional)
- [ ] Cache: chave `flow-resolver:{tenantId}`, TTL curto (60s)

**Criterios de Aceite:**
- [ ] Resolve flow correto em horario comercial com schedule ativo
- [ ] Fallback para flow ativo quando nenhum schedule bate
- [ ] Retorna `null` quando nao ha flow ativo nem schedule
- [ ] Usa timezone do tenant, nao do servidor

---

### T07 — ScheduleOverlapValidator

**Contexto:** Validador que impede schedules sobrepostos para o mesmo tenant.

**O que fazer:**
- [ ] Criar `apps/api/src/application/services/schedule-overlap-validator.ts`
- [ ] Metodo `validate(existingSchedules, newSchedule)`: checa se algum dia de `newSchedule.daysOfWeek` coincide com existing e se os horarios se sobrepoem
- [ ] Retornar lista de conflitos com detalhes (`scheduleId`, dia, horario)

**Criterios de Aceite:**
- [ ] Detecta overlap parcial (ex: 08:00-12:00 vs 10:00-14:00)
- [ ] Detecta overlap total (ex: 08:00-17:00 vs 09:00-11:00)
- [ ] Nao marca como overlap se dias sao diferentes
- [ ] Ignora schedule com o mesmo ID (para update)

---

### T08 — Testes unitarios FlowResolver + OverlapValidator

**Contexto:** FlowResolver e critico — cobertura 100%.

**O que fazer:**
- [ ] Criar testes para `FlowResolverService`: horario comercial match, fora do horario fallback, sem schedule retorna active, sem active + sem schedule retorna null, timezone edge (UTC vs tenant), schedule midnight crossing (23:00-01:00)
- [ ] Criar testes para `ScheduleOverlapValidator`: overlap parcial, overlap total, dias diferentes, ignore self

**Criterios de Aceite:**
- [ ] 100% cobertura nos cenarios listados
- [ ] Testes passam com `bun run test`

---

## SET-C — API Routes + Worker Cron

> **Escopo estimado:** ~300 linhas | **Complexidade:** Media
> **Racional:** Endpoints CRUD, worker cron e integracao com ProcessIncomingMessage.

---

### T09 — Schedule CRUD use cases

**Contexto:** Use cases para gerenciar schedules.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/schedules/create-schedule-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/schedules/list-schedules-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/schedules/update-schedule-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/schedules/delete-schedule-use-case.ts`
- [ ] Cada um valida RBAC (admin/manager), overlap validator em create/update
- [ ] Criar `index.ts` barrel export

**Criterios de Aceite:**
- [ ] Create valida overlap e rejeita com erro claro
- [ ] Update valida overlap excluindo self
- [ ] Delete soft ou hard (hard nesta sprint)
- [ ] List retorna schedules do tenant filtrados

---

### T10 — Schedule HTTP routes

**Contexto:** Endpoints REST para o frontend consumir.

**O que fazer:**
- [ ] Criar `apps/api/src/interface/http/schedule-routes.ts`
- [ ] `POST /flows/schedules` — criar schedule
- [ ] `GET /flows/schedules` — listar schedules do tenant
- [ ] `PUT /flows/schedules/:id` — atualizar schedule
- [ ] `DELETE /flows/schedules/:id` — deletar schedule
- [ ] TypeBox validation em todos os bodies
- [ ] RBAC: admin + manager para escrita, qualquer autenticado para leitura

**Criterios de Aceite:**
- [ ] Todos os endpoints protegidos por JWT
- [ ] Validacao de input com TypeBox
- [ ] Retorna 409 em overlap

---

### T11 — ScheduleEvaluatorConsumer + admin endpoint

**Contexto:** Worker cron que invalida cache quando schedules transitam.

**O que fazer:**
- [ ] Criar `apps/worker/src/consumers/schedule-evaluator-consumer.ts` implementando `BaseConsumer`
- [ ] Job BullMQ com repeat every `60000` ms
- [ ] Logica: carregar todos os tenants com schedules ativos, para cada tenant verificar se o schedule vigente mudou desde o ultimo check, invalidar cache `flow-resolver:{tenantId}` se mudou
- [ ] Registrar consumer no worker bootstrap (`apps/worker/src/index.ts`)
- [ ] Criar endpoint `POST /admin/schedules/evaluate` no API para forcar reavaliacao manual

**Criterios de Aceite:**
- [ ] Job roda a cada 60s
- [ ] Cache invalidado para tenants com transicao
- [ ] Endpoint admin funciona sem cron

---

### T12 — Wire FlowResolver no ProcessIncomingMessage

**Contexto:** Substituir `findActiveByTenant` pelo FlowResolver no use case principal.

**O que fazer:**
- [ ] Modificar `apps/api/src/application/use-cases/process-incoming-message-use-case.ts`: substituir `deps.flowRepository.findActiveByTenant(tenantId)` por `deps.flowResolver.resolveFlow(tenantId)`
- [ ] Atualizar tipo de dependencias do use case
- [ ] Modificar `create-whatsapp-module.ts` para injetar `FlowResolverService`
- [ ] Modificar `index.ts` bootstrap para criar e injetar FlowResolver

**Criterios de Aceite:**
- [ ] ProcessIncomingMessage usa FlowResolver
- [ ] Testes existentes continuam passando (FlowResolver com stub retorna mesmo comportamento anterior)

---

## SET-D — Frontend Calendar + Settings

> **Escopo estimado:** ~400 linhas | **Complexidade:** Media
> **Racional:** Interface visual para gerenciar agendamentos e timezone.

---

### T13 — Schedule API service

**Contexto:** Servico frontend para consumir endpoints de schedule.

**O que fazer:**
- [ ] Criar `apps/web/src/services/schedule-api.ts` seguindo padrao de `flow-api.ts`
- [ ] Metodos: `listSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule`
- [ ] Tipo `ScheduleDto` com campos do backend
- [ ] Metodo `updateTenantTimezone` (`PATCH /tenants/me/timezone`)

**Criterios de Aceite:**
- [ ] Tipagem completa com `Readonly`
- [ ] Segue padrao existente de `createApiClient`

---

### T14 — Weekly grid calendar component

**Contexto:** Componente visual de calendario semanal com blocos coloridos.

**O que fazer:**
- [ ] Criar `apps/web/src/components/schedule-calendar/weekly-grid.tsx`
- [ ] 7 colunas (Seg-Dom), linhas de hora (06:00-22:00 por padrao)
- [ ] Blocos coloridos representam schedules, com nome do flow
- [ ] Click em bloco abre modal de edicao
- [ ] Click em slot vazio abre modal de criacao com dia/hora pre-preenchidos

**Criterios de Aceite:**
- [ ] Grid renderiza schedules corretamente
- [ ] Blocos posicionados por `start_time`/`end_time`
- [ ] Responsivo em desktop

---

### T15 — Schedule form modal

**Contexto:** Modal para criar/editar um schedule.

**O que fazer:**
- [ ] Criar `apps/web/src/components/schedule-calendar/schedule-modal.tsx`
- [ ] Select de flow (lista flows `published` do tenant)
- [ ] Checkboxes de dias da semana
- [ ] Time pickers start/end
- [ ] Toggle ativo/inativo
- [ ] Validacao frontend de overlap com warning visual

**Criterios de Aceite:**
- [ ] Modal funciona para criar e editar
- [ ] Exibe warning se horario conflita com schedule existente
- [ ] Envia dados corretos para API

---

### T16 — Settings page (timezone)

**Contexto:** Pagina de configuracoes do tenant com timezone.

**O que fazer:**
- [ ] Criar `apps/web/src/pages/settings.tsx`
- [ ] Select com timezones IANA comuns (`America/Sao_Paulo`, `America/Fortaleza`, etc.)
- [ ] Salvar via API (novo endpoint `PATCH /tenants/me/timezone`)
- [ ] Criar endpoint `PATCH /tenants/me/timezone` no backend (ou reusar update tenant)
- [ ] Adicionar rota `/settings` no `main.tsx`
- [ ] Adicionar "Configuracoes" no `NAV_ITEMS` do AppShell

**Criterios de Aceite:**
- [ ] Timezone salva e persiste
- [ ] Select exibe timezone atual do tenant

---

### T17 — Schedules page wiring

**Contexto:** Pagina que integra calendario, modal e API.

**O que fazer:**
- [ ] Criar `apps/web/src/pages/schedules.tsx`
- [ ] Usa `WeeklyGrid` + `ScheduleModal` + `schedule-api`
- [ ] CRUD completo: criar, editar, deletar schedules
- [ ] Adicionar rota `/schedules` no `main.tsx`
- [ ] Adicionar "Agendamentos" no `NAV_ITEMS` do AppShell

**Criterios de Aceite:**
- [ ] CRUD funcional via UI
- [ ] Calendario atualiza apos criar/editar/deletar
- [ ] Overlap warning funciona

---

## SET-E — Tests + Closing

> **Escopo estimado:** ~150 linhas | **Complexidade:** Baixa
> **Racional:** Cobertura de use cases de schedule e fechamento da sprint.

---

### T18 — Testes unitarios dos use cases de schedule

**O que fazer:**
- [ ] Testes para `CreateScheduleUseCase`: cenarios create ok, overlap reject, RBAC block
- [ ] Testes para `UpdateScheduleUseCase`: update ok, overlap self ok, RBAC block
- [ ] Testes para `DeleteScheduleUseCase`: delete ok, not found

**Criterios de Aceite:**
- [ ] Cada use case tem pelo menos 3 cenarios testados

---

### T19 — Build + lint + test final

**O que fazer:**
- [ ] `bun run lint` — zero erros
- [ ] `bun run build` — compilacao bem-sucedida
- [ ] `bun run test` — todos passam

**Criterios de Aceite:**
- [ ] Lint: 0 erros
- [ ] Build: sucesso em todos workspaces
- [ ] Test: todos passam

---

### T20 — CHANGELOG + sprint doc status

**O que fazer:**
- [ ] Adicionar entrada Sprint 10 no `docs/changelog/CHANGELOG.md`
- [ ] Atualizar `sprint-10.md` status para `Concluida`

**Criterios de Aceite:**
- [ ] Changelog completo
- [ ] Sprint marcada como concluida

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 — FlowResolver sem schedules (fallback)

**Objetivo:** Validar que sem schedules, o flow ativo e usado.

**Pre-requisitos:**
- [ ] API rodando
- [ ] Tenant com 1 flow ativo

**Passo a passo executavel:**
1. Verificar que nao ha schedules: `GET /flows/schedules` retorna lista vazia
2. Enviar mensagem via webhook WhatsApp
   - **Resultado esperado:** Flow ativo e usado para processar a mensagem

**Criterio de aprovacao do cenario:**
- [ ] FlowResolver retorna o flow ativo como fallback

---

### Cenario 2 — FlowResolver com schedule ativo

**Objetivo:** Validar que no horario do schedule, o flow agendado e usado.

**Pre-requisitos:**
- [ ] Tenant com flow ativo (fallback) e 1 flow `published`
- [ ] Schedule criado: dias Mon-Fri, 08:00-18:00, flow `published`

**Passo a passo executavel:**
1. Configurar horario dentro do schedule (ex: Seg 10:00)
2. Enviar mensagem
   - **Resultado esperado:** Flow do schedule e usado
3. Configurar horario fora do schedule (ex: Seg 20:00)
4. Enviar mensagem
   - **Resultado esperado:** Flow ativo (fallback) e usado

**Criterio de aprovacao do cenario:**
- [ ] Flow correto em ambos cenarios

---

### Cenario 3 — CRUD de schedules

**Objetivo:** Validar endpoints de CRUD.

**Pre-requisitos:**
- [ ] API rodando
- [ ] Token JWT com papel adequado (admin/manager para escrita)

**Passo a passo executavel:**
1. `POST /flows/schedules` com body valido
   - **Resultado esperado:** 201 com schedule criado
2. `GET /flows/schedules`
   - **Resultado esperado:** Lista com 1 schedule
3. `PUT /flows/schedules/:id`
   - **Resultado esperado:** Schedule atualizado
4. `POST /flows/schedules` com overlap
   - **Resultado esperado:** 409 Conflict
5. `DELETE /flows/schedules/:id`
   - **Resultado esperado:** 200, schedule removido

**Criterio de aprovacao do cenario:**
- [ ] CRUD completo funcionando com validacao de overlap

---

### Cenario 4 — Worker cache invalidation

**Objetivo:** Validar que worker invalida cache quando schedule transita.

**Pre-requisitos:**
- [ ] Worker rodando
- [ ] Schedule configurado

**Passo a passo executavel:**
1. Criar schedule com horario proximo
2. Aguardar transicao de schedule
   - **Resultado esperado:** Worker invalida cache do tenant
3. Proxima mensagem usa flow correto

**Criterio de aprovacao do cenario:**
- [ ] Cache invalidado em menos de 60s

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao `Testes Manuais de Entrega (Passo a Passo Executavel)` preenchida
- [ ] Changelog atualizado
- [ ] Sem debito tecnico nao documentado
- [ ] RNs respeitadas em toda implementacao
