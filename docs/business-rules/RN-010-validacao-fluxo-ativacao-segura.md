# RN-010 - Validacao de fluxo para ativacao segura

> **Status:** `Ativa`
> **Dominio:** Motor Conversacional
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma unica pagina.
- Se a regra ficar extensa, quebrar em RNs irmas por cenario/dominio para preservar clareza.
- Evitar reunir multiplas decisoes independentes na mesma RN.

---

## Contexto

Ativar fluxo inconsistente causa erros em producao e pode interromper atendimento em escala. O sistema precisa de gate de qualidade para bloquear modelagens quebradas antes da ativacao. Esta RN define as verificacoes obrigatorias e como tratar ciclos em modo controlado.

---

## A Regra

**Um fluxo so pode ser considerado apto para ativacao quando passar na validacao estrutural completa: no inicial existente, destinos validos, campos obrigatorios por tipo, ausencia de no orfao, e ausencia de ciclo automatico sem escape. Warnings estruturais tambem bloqueiam ativacao.**

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| `startNodeId` inexistente | Fluxo invalido |
| No referencia destino inexistente | Fluxo invalido |
| `input` sem destino | Fluxo invalido |
| No nao alcancavel a partir do start | Fluxo invalido (warning bloqueante) |
| Ciclo so com nos automaticos (`message`) | Fluxo invalido |
| Ciclo com no interativo (`option`/`input`) e saida para terminal | Fluxo valido |
| Ciclo interativo sem caminho de escape para terminal | Fluxo invalido |

---

## Exemplos

**✅ Valido:**
> Fluxo com menu (`option`) que permite "voltar" para o menu, mas tambem possui caminho para `end` ou `transfer`.

**❌ Invalido:**
> Dois nos `message` apontando um para o outro sem no interativo ou terminal.

---

## Impactos Tecnicos

- **Validacao:** `packages/flow` (modulo de validacao de ativacao e testes).
- **Mensagem de erro:** `"Fluxo invalido para ativacao. Corrija as inconsistencias reportadas."`
- **Afeta:** `packages/flow` e futuras features de ativacao em `apps/api`.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-008](./RN-008-flow-engine-puro-deterministico.md), [RN-009](./RN-009-semantica-nos-transicao-sessao.md)
- **Sprints que implementaram:** [sprint-03](../sprints/sprint-03.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
