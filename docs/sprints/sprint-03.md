# Sprint 03 - Flow Engine (Dominio Puro)

> **Periodo:** 06/04 ate 09/04 | **Status:** `Concluida`

---

# GESTAO

## Objetivo da Sprint

> *Permitir que o motor de fluxo conversacional processe mensagens, navegue entre nos, colete dados e realize handoff humano com regras deterministicas e sem acoplamento de infraestrutura.*

Entregar o core conversacional no `packages/flow` com modelagem de dominio, processamento puro de mensagens por tipo de no (`message`, `option`, `input`, `transfer`, `end`), validacao de fluxo antes de ativacao e contratos de integracao para as proximas sprints sem dependencias de banco, HTTP ou SDKs externos.

---

## Fluxo oficial de documentacao (IA)

1. O usuario informa descricao e detalhes da proxima sprint.
2. A IA faz perguntas de clarificacao (somente o necessario) e preenche esta doc de sprint.
3. O usuario revisa e aprova a sprint.
4. Somente apos aprovacao, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** nao transferir nem detalhar RNs antes da aprovacao explicita da sprint.

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Modelo de dominio do flow engine | `Flow`, `Node`, `Edge`, `Session` tipados e exportados, sem `any` e sem deps externas |
| 2 | Processador de mensagens puro | `processMessage(session, message, flow)` deterministico com suporte aos 5 tipos de no |
| 3 | Suporte a opcoes numericas + aliases textuais | No `option` aceita `1..N`, `label` e `aliases` de forma case-insensitive |
| 4 | Contratos de integracao e eventos de dominio | Contratos exportados para integracao futura (API/worker) sem acoplamento direto |
| 5 | Validacao de fluxo para ativacao | Regras estruturais e de navegacao implementadas com relatorio de inconsistencias |
| 6 | Controle de ciclos | Ciclos permitidos de forma controlada, bloqueando ciclos automaticos sem escape |
| 7 | Cobertura de testes do pacote | Testes unitarios cobrindo tipos de no, transicoes, erros e validacao de fluxo |
| 8 | Qualidade da sprint | `bun run build`, `bun run test` e `bun run lint` passando para o monorepo |

---

## Regras de Negocio desta Sprint

- [RN-008 - Engine de fluxo puro e deterministico](../business-rules/RN-008-flow-engine-puro-deterministico.md)
- [RN-009 - Semantica de nos e transicao de sessao](../business-rules/RN-009-semantica-nos-transicao-sessao.md)
- [RN-010 - Validacao de fluxo para ativacao segura](../business-rules/RN-010-validacao-fluxo-ativacao-segura.md)

---

## Fora do Escopo

- ❌ Persistencia de sessao em banco
- ❌ Endpoints HTTP do flow engine
- ❌ Integracao real com Evolution API
- ❌ Dashboard frontend de edicao/operacao de fluxo
- ❌ IA generativa para resposta automatica

---

## Metricas de Sucesso

- [x] `processMessage` cobre `message`, `option`, `input`, `transfer` e `end`
- [x] No `option`, entrada textual e numerica navegam corretamente
- [x] `Session.data` usa `Record<string, unknown>` com acesso seguro
- [x] Ciclos automaticos sem escape sao bloqueados por validacao
- [x] Ciclos controlados com no interativo e saida valida sao permitidos
- [x] Validacao acusa no inicial ausente, destinos invalidos e nos orfaos
- [x] `packages/flow` permanece sem dependencia de DB/HTTP
- [x] `bun run build`, `bun run test` e `bun run lint` passando no monorepo

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez. Apos cada set, apresente o checkpoint e aguarde instrucao do usuario.
> **Eficiência de contexto:** quando houver arquivos grandes, usar leitura incremental.

---

## Plano de Execucao

```
Rodada 1: [SET-A: Modelagem de Dominio e Contratos Base]
Rodada 2: [SET-B: Engine de Processamento e Telemetria]
Rodada 3: [SET-C: Validacao Estrutural e Regras de Ativacao]
Rodada 4: [SET-D: Integracao Final e Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | - | - |
| SET-B | T04, T05, T06 | SET-A | - |
| SET-C | T07, T08, T09 | SET-B | - |
| SET-D | T10, T11, T12 | SET-C | - |

---

## SET-A - Modelagem de Dominio e Contratos Base

> 🎯 **Escopo estimado:** ~420 linhas | **Complexidade:** Media
> **Racional:** Consolidar fundamentos de tipos e contratos para reduzir retrabalho nos sets seguintes.

---

### T01 - Definir entidades de dominio do flow engine

**Contexto:** Sem tipos semanticos fortes, o motor tende a crescer com acoplamento e validacoes dispersas.

**O que fazer:**
- [ ] Definir tipos `Flow`, `FlowNode`, `Edge` e `Session`.
- [ ] Incluir os modos de sessao (`bot`, `waiting_human`, `human_active`).
- [ ] Definir `Session.data` como `Readonly<Record<string, unknown>>`.

**Critérios de Aceite:**
- [ ] Tipos representam os cinco tipos de no da sprint.
- [ ] Nao existe `any` nos contratos.
- [ ] Tipos podem ser reutilizados por API/worker sem importar infraestrutura.

**Notas tecnicas:**
> Escolha arquitetural: manter contratos enxutos e semanticos com unions discriminadas para permitir switch exaustivo.

---

### T02 - Definir contratos de integracao futura (sem acoplamento)

**Contexto:** A sprint 04 vai plugar adapter de WhatsApp e repositorios; o pacote precisa expor contratos claros desde ja.

**O que fazer:**
- [ ] Definir contratos de evento de dominio emitido pelo engine.
- [ ] Definir tipos de retorno do processamento com telemetria/debug.
- [ ] Garantir que contratos nao dependam de DB, HTTP ou framework.

**Critérios de Aceite:**
- [ ] Contratos exportados via `index.ts`.
- [ ] Telemetria inclui rastreabilidade de navegacao por no.
- [ ] Package continua puro.

**Notas tecnicas:**
> O contrato de retorno deve permitir instrumentacao em API/worker sem alterar o core.

---

### T03 - Preparar base de testes para dominio puro

**Contexto:** Sem base de testes clara, o comportamento do motor fica fragil para evolucao.

**O que fazer:**
- [ ] Reestruturar testes iniciais para refletir os novos contratos.
- [ ] Criar fixtures tipadas para fluxo/sessao.
- [ ] Validar build e lint do package `flow`.

**Critérios de Aceite:**
- [ ] Testes rodam em isolamento no package.
- [ ] Nomes seguem padrao `should ... when ...`.
- [ ] Nao ha dependencia de estado global.

**Notas tecnicas:**
> Fixtures reutilizaveis evitam duplicacao e reduzem ruido de setup.

---

## SET-B - Engine de Processamento e Telemetria

> 🎯 **Escopo estimado:** ~520 linhas | **Complexidade:** Alta
> **Racional:** Implementar a regra central de negocio da sprint: processar mensagem e evoluir estado.

---

### T04 - Implementar processamento por tipo de no

**Contexto:** O motor precisa processar cada tipo de no com semantica previsivel.

**O que fazer:**
- [ ] Implementar `processMessage(session, message, flow)`.
- [ ] Implementar semantica para `message`, `option`, `input`, `transfer`, `end`.
- [ ] Garantir que `transfer` altere modo para `waiting_human`.

**Critérios de Aceite:**
- [ ] Fluxo avanca corretamente por tipo de no.
- [ ] `transfer` gera evento de handoff.
- [ ] `end` encerra fluxo de forma deterministica.

**Notas tecnicas:**
> `processMessage` deve ser side-effect free: apenas calcula estado de saida e acoes/eventos.

---

### T05 - Implementar parsing de opcoes numericas e aliases

**Contexto:** A UX exige que usuario possa responder com numero ou texto.

**O que fazer:**
- [ ] Implementar parsing numerico (`1..N`) no no `option`.
- [ ] Implementar matching textual por `label` e `aliases`.
- [ ] Tratar entradas invalidas com mensagem configuravel no no.

**Critérios de Aceite:**
- [ ] Entrada numerica valida escolhe alternativa correta.
- [ ] Alias textual case-insensitive funciona.
- [ ] Entrada invalida nao quebra estado do fluxo.

**Notas tecnicas:**
> Priorizar normalizacao de string simples e deterministica, sem heuristica "inteligente".

---

### T06 - Adicionar telemetria de processamento e guardas de execucao

**Contexto:** Para debug e observabilidade, o retorno precisa trazer trilha de execucao.

**O que fazer:**
- [ ] Incluir no retorno trilha de nos visitados e contagem de transicoes.
- [ ] Incluir metadados de opcao selecionada/campo coletado quando aplicavel.
- [ ] Implementar protecao contra loop automatico em runtime.

**Critérios de Aceite:**
- [ ] Debug de navegacao aparece no resultado.
- [ ] Loop automatico sem interacao e interrompido com erro sem travar execucao.
- [ ] Testes cobrem caminho feliz e edge cases.

**Notas tecnicas:**
> Guardas de runtime complementam validacao de ativacao e protegem contra fluxos invalidos em execucao.

---

## SET-C - Validacao Estrutural e Regras de Ativacao

> 🎯 **Escopo estimado:** ~500 linhas | **Complexidade:** Alta
> **Racional:** Garantir que apenas fluxos consistentes sejam ativados.

---

### T07 - Implementar validacao estrutural do fluxo

**Contexto:** Erros de modelagem devem ser detectados antes de ir para producao.

**O que fazer:**
- [ ] Validar existencia do no inicial.
- [ ] Validar referencias de destino em todos os tipos de no.
- [ ] Validar obrigatoriedade de campos por tipo de no.

**Critérios de Aceite:**
- [ ] Validacao acusa no inicial inexistente.
- [ ] Destinos ausentes/invalidos sao reportados com codigo semantico.
- [ ] Inputs sem destino sao bloqueados.

**Notas tecnicas:**
> Resultado de validacao deve ser consumivel por UI/API sem parse textual.

---

### T08 - Implementar analise de alcançabilidade e ciclos controlados

**Contexto:** O motor deve permitir ciclos com controle, mas bloquear estruturas que possam travar.

**O que fazer:**
- [ ] Detectar nos orfaos (nao alcancaveis a partir do start).
- [ ] Detectar ciclos automaticos sem no interativo.
- [ ] Permitir ciclos com no interativo e caminho de escape para terminal.

**Critérios de Aceite:**
- [ ] Ciclos automaticos sem escape sao invalidos.
- [ ] Ciclos controlados com opcao/input e saida terminal sao aceitos.
- [ ] Relatorio informa severidade e codigo de cada violacao.

**Notas tecnicas:**
> A regra da sprint bloqueia tambem warnings estruturais na ativacao.

---

### T09 - Consolidar contrato de validacao para ativacao

**Contexto:** O contrato de validacao precisa ser plugavel no future `ActivateFlow`.

**O que fazer:**
- [ ] Exportar `validateFlowDefinition` e tipos de issue/resultado.
- [ ] Garantir `isValid=false` quando houver qualquer issue (erro ou warning).
- [ ] Cobrir validacao com testes direcionados por regra.

**Critérios de Aceite:**
- [ ] Contrato pronto para uso em sprint de CRUD/ativacao.
- [ ] Sem dependencia de camada externa.
- [ ] Testes documentam comportamento esperado.

**Notas tecnicas:**
> `isValid` deve refletir gate de ativacao estrito definido nesta sprint.

---

## SET-D - Integracao Final e Qualidade

> 🎯 **Escopo estimado:** ~360 linhas | **Complexidade:** Media
> **Racional:** Fechar consistencia, cobertura e prontidao para integracoes futuras.

---

### T10 - Revisar exports publicos e contratos de integracao

**Contexto:** O package sera consumido por API/worker e precisa de surface estavel.

**O que fazer:**
- [ ] Revisar exports no `index.ts`.
- [ ] Garantir separacao clara entre dominio, engine e validacao.
- [ ] Atualizar README do package com uso e limites.

**Critérios de Aceite:**
- [ ] Surface publica consistente e sem vazamento interno.
- [ ] Contratos de integracao documentados.
- [ ] Build sem warnings.

**Notas tecnicas:**
> Evitar breaking changes desnecessarias na assinatura principal do engine.

---

### T11 - Fechar bateria de testes unitarios da sprint

**Contexto:** O pacote e core de negocio e precisa de confiabilidade alta.

**O que fazer:**
- [ ] Cobrir todos os tipos de no e transicoes de modo.
- [ ] Cobrir cenario de alias textual, entrada invalida e ciclo automatico.
- [ ] Cobrir regras de validacao estrutural e de ciclo.

**Critérios de Aceite:**
- [ ] Testes de unidade do pacote passando.
- [ ] Cada teste com um motivo unico para falha.
- [ ] Sem mocks acoplados a implementacao externa.

**Notas tecnicas:**
> Priorizar cenarios deterministas com fixtures pequenas.

---

### T12 - Validacao de qualidade da sprint no monorepo

**Contexto:** A sprint deve encerrar pronta para PR sem regressao em outros packages.

**O que fazer:**
- [ ] Executar `bun run build` na raiz.
- [ ] Executar `bun run test` na raiz.
- [ ] Executar `bun run lint` na raiz.

**Critérios de Aceite:**
- [ ] Qualidade global aprovada.
- [ ] Nao ha alteracao fora do escopo sem justificativa.
- [ ] Sprint pronta para fechamento e changelog.

**Notas tecnicas:**
> Se houver falha fora do escopo causada pela sprint, corrigir antes do fechamento.

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 - Navegacao por `message` -> `option` -> `end`

**Objetivo:** Garantir que o motor envia mensagem, interpreta opcao por numero/alias e encerra fluxo.

**Pre-requisitos:**
- [ ] Dependencias instaladas
- [ ] Branch da sprint atualizada localmente

**Passo a passo executavel:**
1. Executar `bun run test --filter=flow`.
   - **Resultado esperado:** testes do package `flow` passam.
2. Verificar caso de teste com selecao numerica e textual no no `option`.
   - **Resultado esperado:** selecao valida leva ao no esperado e gera transicao correta.
3. Verificar caso de teste de entrada invalida no `option`.
   - **Resultado esperado:** estado permanece no no de opcao e retorna mensagem de erro configurada.

**Criterio de aprovacao do cenario:**
- [ ] Navegacao por numero e alias funciona sem regressao.

---

### Cenario 2 - Coleta de dado em `input` e handoff em `transfer`

**Objetivo:** Garantir coleta de dado em `Session.data` e mudanca de modo para atendimento humano.

**Pre-requisitos:**
- [ ] Testes do package `flow` acessiveis localmente

**Passo a passo executavel:**
1. Executar `bun run test --filter=flow` e validar casos de `input`.
   - **Resultado esperado:** valor coletado salvo em `Session.data` com tipo `unknown`.
2. Validar caso de `transfer`.
   - **Resultado esperado:** `mode` muda para `waiting_human` e evento de handoff e emitido no resultado.

**Criterio de aprovacao do cenario:**
- [ ] Sessao transita corretamente de `bot` para `waiting_human`.

---

### Cenario 3 - Gate de ativacao por validacao estrutural

**Objetivo:** Garantir bloqueio de fluxos invalidos e aceite de ciclos controlados.

**Pre-requisitos:**
- [ ] Suite de testes do package `flow`

**Passo a passo executavel:**
1. Executar testes de validacao (`bun run test --filter=flow`).
   - **Resultado esperado:** fluxos com no inicial ausente ou destino invalido falham.
2. Verificar teste de ciclo automatico sem no interativo.
   - **Resultado esperado:** validacao marca fluxo como invalido.
3. Verificar teste de ciclo controlado com no interativo + escape para terminal.
   - **Resultado esperado:** validacao aceita fluxo.

**Criterio de aprovacao do cenario:**
- [ ] Somente fluxos consistentes passam no gate de validacao.

---

## Checklist Final da Sprint

- [x] Todos os sets concluidos e aprovados
- [x] Todos os criterios de aceite validados
- [x] Secao `Testes Manuais de Entrega (Passo a Passo Executavel)` preenchida, executavel e detalhada
- [x] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [x] Decisoes tecnicas novas registradas em `docs/decisions/` (nenhuma nesta sprint)
- [x] Sem debito tecnico nao documentado
- [x] Debitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolucao
- [x] RNs respeitadas em toda implementacao
