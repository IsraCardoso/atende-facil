# Sprint 07 — CRUD API de Flows com Persistencia

> **Periodo:** 07/04 ate 14/04 | **Status:** `Em andamento`

---

# GESTAO

## Objetivo da Sprint

> *O admin do tenant consegue criar, editar, listar, validar, publicar e ativar fluxos via API REST, com persistencia real no PostgreSQL.*

Entregar toda a camada backend de gerenciamento de flows: tabela no banco, entidade de dominio com ciclo de vida (draft/published/active/archived), repositorio Drizzle, use cases CRUD e lifecycle, e endpoints HTTP autenticados com tenant isolation.

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Tabela `flows` com migration Drizzle | Migration roda sem erro, schema correto no banco |
| 2 | Entidade FlowEntity com ciclo de vida | Transicoes de status validadas, branded type FlowId |
| 3 | DrizzleFlowRepository + InMemoryFlowRepository | Persistencia real no PostgreSQL, in-memory para testes |
| 4 | CRUD completo (Create, Update, Get, List, Delete) | Endpoints respondem com tenant isolation |
| 5 | Lifecycle (Publish, Activate, Deactivate, Archive) | Validacao obrigatoria para publish, max 1 ativo por tenant |
| 6 | Testes unitarios dos use cases | 100% cobertura nos use cases |

---

## Regras de Negocio desta Sprint

- [RN-020 — CRUD e ciclo de vida de flows](../business-rules/RN-020-crud-ciclo-vida-flows.md)
- [RN-021 — Persistencia de flows com Drizzle](../business-rules/RN-021-persistencia-flows-drizzle.md)

---

## Fora do Escopo

- Editor visual de fluxos (Sprint 08)
- Simulacao de fluxos (Sprint 08)
- Versionamento de flows com historico
- DrizzleRepository para demais entidades (sessions, conversations, etc.)

---

## Metricas de Sucesso

- [ ] Todos os endpoints CRUD respondem corretamente
- [ ] Tenant isolation verificado em todos os endpoints
- [ ] Publish bloqueia flow invalido (validateFlowDefinition)
- [ ] Max 1 flow ativo por tenant (constraint no banco)
- [ ] `bun run build`, `bun run test` e `bun run lint` passando

---

## Decisoes da Sprint

| # | Decisao | Justificativa |
|---|---|---|
| D1 | Drizzle como primeiro repo real | Pattern de referencia para migrar demais repos no futuro |
| D2 | Unique partial index para 1 active | Constraint no banco garante max 1 flow ativo por tenant, eliminando race conditions |
| D3 | Flow definition como JSONB | Permite queries futuras e armazenamento flexivel |
| D4 | Status lifecycle draft/published/active/archived | Versionamento com historico de estados |

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez.

---

## Plano de Execucao

```
Rodada 1: [SET-A: Schema + Dominio + Ports]
Rodada 2: [SET-B: Repositories + CRUD Use Cases]
Rodada 3: [SET-C: Lifecycle Use Cases + Routes + DI]
Rodada 4: [SET-D: Testes + Integracao + Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06, T07 | SET-A | — |
| SET-C | T08, T09, T10, T11, T12 | SET-B | — |
| SET-D | T13, T14, T15 | SET-C | — |

---

## SET-A — Schema + Dominio + Ports

> Escopo estimado: ~300 linhas | Complexidade: Media
> Racional: Fundacao de dados e contratos — tudo que vem depois depende deste set.

---

### T01 — Migration tabela flows

**Contexto:** Nao existe tabela de flows no banco. O FlowRepositoryPort atual e um stub que retorna null.

**O que fazer:**
- [ ] Criar schema Drizzle em `packages/db/src/schema/flows.ts`
- [ ] Gerar migration com `drizzle-kit generate`
- [ ] Exportar em `packages/db/src/schema/index.ts` e `packages/db/src/index.ts`

**Criterios de Aceite:**
- [ ] Tabela flows existe com todas as colunas (id, tenant_id, name, description, definition, status, version, created_at, updated_at, deleted_at)
- [ ] Indice unico parcial garante max 1 active por tenant
- [ ] FK para tenants com cascade delete

**Notas tecnicas:**
> definition e JSONB com default `{}`. status e varchar com default `draft`. version e integer com default 1. deleted_at nullable para soft delete.

---

### T02 — Entidade de dominio FlowEntity

**Contexto:** Necessario representar flows com tipagem forte, branded types e validacao de transicoes de status.

**O que fazer:**
- [ ] Criar `apps/api/src/domain/flow-types.ts`
- [ ] Branded type FlowId
- [ ] Tipo FlowStatus (draft | published | active | archived)
- [ ] FlowEntity com todos os campos
- [ ] Funcao pura `isValidFlowTransition(from, to)` com mapa de transicoes permitidas
- [ ] Factory `createFlowId`

**Criterios de Aceite:**
- [ ] FlowId e branded type (nao se mistura com string pura)
- [ ] Transicoes invalidas retornam false
- [ ] Todas as transicoes validas do diagrama sao cobertas

---

### T03 — FlowRepositoryPort expandido

**Contexto:** O port atual so tem `findActiveByTenant`. Precisa de CRUD completo.

**O que fazer:**
- [ ] Criar `apps/api/src/domain/ports/flow-ports.ts` com interface expandida
- [ ] Atualizar `apps/api/src/domain/ports/index.ts` para exportar
- [ ] Manter compatibilidade com o FlowRepositoryPort existente em whatsapp-ports

**Criterios de Aceite:**
- [ ] Port tem findById, findActiveByTenant, findByTenantPaginated, save, updateStatus, softDelete
- [ ] Tipos de filtro e paginacao definidos

---

## SET-B — Repositories + CRUD Use Cases

> Escopo estimado: ~450 linhas | Complexidade: Media-Alta
> Racional: Implementacoes concretas de persistencia + use cases basicos CRUD.

---

### T04 — DrizzleFlowRepository

**Contexto:** Primeiro repositorio Drizzle do projeto. Implementa FlowRepositoryPort com PostgreSQL real.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/drizzle-flow-repository.ts`
- [ ] Implementar todos os metodos do FlowRepositoryPort
- [ ] Tenant isolation em todas as queries (WHERE tenant_id = ?)
- [ ] Filtro de soft delete (WHERE deleted_at IS NULL) por padrao

**Criterios de Aceite:**
- [ ] Todas as queries filtram por tenant_id
- [ ] Soft delete nao retorna registros deletados
- [ ] Paginacao funcional com total count

---

### T05 — InMemoryFlowRepository

**Contexto:** Necessario para testes unitarios sem banco real.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/repositories/in-memory-flow-repository.ts`
- [ ] Mesmo contrato que DrizzleFlowRepository
- [ ] Armazenamento em Map

**Criterios de Aceite:**
- [ ] Todos os metodos do port implementados
- [ ] Tenant isolation em todas as operacoes

---

### T06 — CreateFlowUseCase + UpdateFlowDefinitionUseCase

**Contexto:** Criar flow com name+desc (status=draft). Update salva definition JSON.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/flows/create-flow-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/flows/update-flow-definition-use-case.ts`
- [ ] Update incrementa version a cada save

**Criterios de Aceite:**
- [ ] Create retorna flow com status draft
- [ ] Update salva definition e incrementa version
- [ ] Tenant isolation (tenantId do token)

---

### T07 — GetFlowUseCase + ListFlowsUseCase + DeleteFlowUseCase

**Contexto:** Operacoes CRUD restantes.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/flows/get-flow-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/flows/list-flows-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/flows/delete-flow-use-case.ts` (soft delete = archived)

**Criterios de Aceite:**
- [ ] Get retorna 404 para flow nao encontrado
- [ ] List pagina e filtra por status
- [ ] Delete faz soft delete (status archived + deleted_at)

---

## SET-C — Lifecycle Use Cases + Routes + DI

> Escopo estimado: ~400 linhas | Complexidade: Alta
> Racional: Logica de negocio complexa (transicoes de estado, validacao) + exposicao HTTP.

---

### T08 — PublishFlowUseCase

**Contexto:** draft -> published. Executa validateFlowDefinition do packages/flow. Bloqueia se validacao falhar.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/flows/publish-flow-use-case.ts`
- [ ] Importar e executar validateFlowDefinition
- [ ] Converter definition (Record) para Flow tipado antes de validar

**Criterios de Aceite:**
- [ ] Bloqueia publish se flow invalido
- [ ] Retorna issues de validacao em caso de erro
- [ ] So aceita transicao draft -> published

---

### T09 — ActivateFlowUseCase + DeactivateFlowUseCase

**Contexto:** Activate: published -> active (desativa flow ativo anterior). Deactivate: active -> published.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/flows/activate-flow-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/flows/deactivate-flow-use-case.ts`
- [ ] Desativar flow ativo anterior ao ativar novo

**Criterios de Aceite:**
- [ ] Apenas published -> active permitido
- [ ] Flow ativo anterior muda para published
- [ ] Apenas active -> published permitido para deactivate

---

### T10 — ArchiveFlowUseCase + ValidateFlowUseCase

**Contexto:** Archive: qualquer -> archived. Validate: executa validacao sem mudar status.

**O que fazer:**
- [ ] Criar `apps/api/src/application/use-cases/flows/archive-flow-use-case.ts`
- [ ] Criar `apps/api/src/application/use-cases/flows/validate-flow-use-case.ts`

**Criterios de Aceite:**
- [ ] Archive aceita qualquer status de origem
- [ ] Validate retorna resultado sem mudar status

---

### T11 — Flow HTTP Routes

**Contexto:** Expor todos os use cases via REST.

**O que fazer:**
- [ ] Criar `apps/api/src/interface/http/flow-routes.ts`
- [ ] Todas as rotas autenticadas com tenant isolation
- [ ] Validacao de input na borda

**Criterios de Aceite:**
- [ ] 10 endpoints funcionais
- [ ] tenant_id extraido do token, nunca do body

---

### T12 — Flow Module (DI)

**Contexto:** Container dedicado com repositorio e use cases.

**O que fazer:**
- [ ] Criar `apps/api/src/infrastructure/flow/create-flow-module.ts`
- [ ] Registrar repositorio (Drizzle ou in-memory por env)
- [ ] Registrar todos os use cases como transient

**Criterios de Aceite:**
- [ ] Module exporta todos os use cases
- [ ] Repositorio resolve corretamente por ambiente

---

## SET-D — Testes + Integracao + Fechamento

> Escopo estimado: ~350 linhas | Complexidade: Media
> Racional: Garantia de qualidade e integracao final.

---

### T13 — Testes unitarios

**Contexto:** Cobertura obrigatoria de todos os use cases.

**O que fazer:**
- [ ] Testes de CreateFlowUseCase
- [ ] Testes de UpdateFlowDefinitionUseCase
- [ ] Testes de GetFlowUseCase
- [ ] Testes de ListFlowsUseCase
- [ ] Testes de DeleteFlowUseCase
- [ ] Testes de PublishFlowUseCase (sucesso + validacao falha)
- [ ] Testes de ActivateFlowUseCase (sucesso + desativa anterior)
- [ ] Testes de DeactivateFlowUseCase
- [ ] Testes de ArchiveFlowUseCase
- [ ] Testes de ValidateFlowUseCase

**Criterios de Aceite:**
- [ ] Todos os cenarios de sucesso e erro cobertos
- [ ] Tenant isolation verificado

---

### T14 — Integracao no bootstrap

**Contexto:** Conectar flow module ao bootstrap da API.

**O que fazer:**
- [ ] Atualizar `apps/api/src/index.ts` para inicializar flow module
- [ ] Atualizar `create-api-server.ts` para registrar flow routes
- [ ] Atualizar whatsapp module para usar flow repository real

**Criterios de Aceite:**
- [ ] Flow routes acessiveis na API
- [ ] processIncomingMessage usa flow repository real

---

### T15 — Build, lint, docs

**Contexto:** Fechar a sprint com qualidade.

**O que fazer:**
- [ ] Verificar `bun run build` em todos os workspaces
- [ ] Verificar `bun run test` em todos os workspaces
- [ ] Verificar `bun run lint` sem warnings
- [ ] Atualizar `.env.example` se necessario

**Criterios de Aceite:**
- [ ] Build, test e lint passando
- [ ] Nenhuma variavel nova sem entrada no .env.example

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 — CRUD de flow completo

**Objetivo:** Validar criacao, edicao, listagem e exclusao de flow via API.

**Pre-requisitos:**
- [ ] API rodando com flow module ativo
- [ ] Token de autenticacao valido

**Passo a passo:**
1. `POST /flows` com `{ "name": "Fluxo Teste", "description": "Teste" }`
   - **Resultado esperado:** 201 com flow criado, status `draft`
2. `PUT /flows/:id` com definition JSON valida
   - **Resultado esperado:** 200 com version incrementada
3. `GET /flows` com query `?status=draft`
   - **Resultado esperado:** Lista paginada com o flow criado
4. `GET /flows/:id`
   - **Resultado esperado:** Flow completo com definition
5. `DELETE /flows/:id`
   - **Resultado esperado:** 200, flow archivado

**Criterio de aprovacao:**
- [ ] Todos os 5 passos executados com resultados esperados

### Cenario 2 — Lifecycle de flow

**Objetivo:** Validar publish, activate, deactivate e archive.

**Pre-requisitos:**
- [ ] Flow criado com definition valida

**Passo a passo:**
1. `POST /flows/:id/validate`
   - **Resultado esperado:** Resultado de validacao com isValid e issues
2. `POST /flows/:id/publish`
   - **Resultado esperado:** Status muda para `published`
3. `POST /flows/:id/activate`
   - **Resultado esperado:** Status muda para `active`
4. `POST /flows/:id/deactivate`
   - **Resultado esperado:** Status volta para `published`
5. `POST /flows/:id/archive`
   - **Resultado esperado:** Status muda para `archived`

**Criterio de aprovacao:**
- [ ] Todas as transicoes de status executadas corretamente

### Cenario 3 — Tenant isolation

**Objetivo:** Validar que um tenant nao acessa flows de outro.

**Pre-requisitos:**
- [ ] Dois tenants com tokens distintos

**Passo a passo:**
1. Criar flow com tenant A
   - **Resultado esperado:** Flow criado com tenant_id de A
2. Buscar flow com token de tenant B
   - **Resultado esperado:** 404 (flow nao encontrado)

**Criterio de aprovacao:**
- [ ] Tenant B nao consegue acessar flow de tenant A

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao de testes manuais preenchida e executavel
- [ ] Changelog atualizado
- [ ] Sem debito tecnico nao documentado
- [ ] RNs respeitadas em toda implementacao
