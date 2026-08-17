# RN-020 - CRUD e ciclo de vida de flows

> **Status:** `Ativa`
> **Dominio:** Gerenciamento de Fluxos
> **Criada em:** 2026-04-07 | **Atualizada em:** 2026-04-07

---

## Contexto

O sistema precisa que tenants possam criar, editar e gerenciar multiplos fluxos conversacionais com controle de ciclo de vida. Sem isso, a unica forma de configurar um fluxo e via JSON manual ou seed, sem interface de gerenciamento.

---

## A Regra

**Todo tenant pode ter multiplos flows. Cada flow possui um ciclo de vida com 4 estados (draft, published, active, archived). Apenas 1 flow pode estar ativo por tenant simultaneamente. A transicao para published exige validacao estrutural obrigatoria via `validateFlowDefinition`.**

---

## Transicoes de status permitidas

| De | Para | Condicao |
|---|---|---|
| draft | published | validateFlowDefinition passa sem erros |
| published | active | Desativa flow ativo anterior automaticamente |
| published | draft | Livre (unpublish para editar) |
| active | published | Livre (deactivate) |
| draft | archived | Livre |
| published | archived | Livre |
| active | archived | Livre |

Qualquer transicao nao listada e invalida e deve retornar erro 422.

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| Criar flow | Status inicial e `draft`, version 1 |
| Editar definition | Incrementa version, status permanece |
| Publicar flow invalido | Bloqueia e retorna issues de validacao |
| Ativar flow com outro ativo | Desativa o anterior automaticamente (published) |
| Deletar flow | Soft delete (archived + deleted_at) |
| Buscar flows | Nao retorna registros com deleted_at preenchido |

---

## Impactos Tecnicos

- **Validacao:** `apps/api/src/application/use-cases/flows/`
- **Afeta:** API REST, flow repository, whatsapp module (findActiveByTenant)

---

## Rastreabilidade

- **Solicitado por:** Produto
- **RNs relacionadas:** [RN-008](./RN-008-flow-engine-puro-deterministico.md), [RN-010](./RN-010-validacao-fluxo-ativacao-segura.md)
- **Sprints que implementaram:** [sprint-07](../sprints/sprint-07.md)
