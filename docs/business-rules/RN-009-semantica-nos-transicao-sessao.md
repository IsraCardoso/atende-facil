# RN-009 - Semantica de nos e transicao de sessao

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

Sem uma semantica explicita por tipo de no, fluxos conversacionais ficam ambiguos e dificeis de manter. A plataforma precisa garantir comportamento consistente para cada no, incluindo coleta de dados, navegacao de opcoes e handoff humano. Esta RN formaliza a semantica minima para `message`, `option`, `input`, `transfer` e `end`.

---

## A Regra

**Cada tipo de no possui semantica fixa e obrigatoria: `message` envia texto e avanca; `option` aceita resposta numerica ou alias textual e navega; `input` coleta dado em `Session.data`; `transfer` muda modo para `waiting_human`; `end` encerra fluxo.**

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| `option` recebe numero valido (`1..N`) | Seleciona alternativa correspondente |
| `option` recebe texto | Matching por label/aliases, case-insensitive |
| `option` recebe entrada invalida | Mantem no atual e retorna mensagem de erro configurada |
| `input` recebe valor vazio | Mantem no atual e retorna mensagem de orientacao |
| `transfer` processado | Sessao transita de `bot` para `waiting_human` |
| Sessao em `waiting_human` ou `human_active` | Engine nao processa regra de bot ate retomada |

---

## Exemplos

**✅ Valido:**
> Usuario responde `2` ou `financeiro` em no de opcao e a sessao navega para o mesmo destino configurado.

**❌ Invalido:**
> No `transfer` mantem sessao em `bot`, permitindo bot continuar respondendo apos handoff.

---

## Impactos Tecnicos

- **Validacao:** `packages/flow` (engine e testes por tipo de no).
- **Mensagem de erro:** `"Entrada invalida para este no de fluxo."`
- **Afeta:** `packages/flow` e fluxos de atendimento consumidos pela API/worker.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-008](./RN-008-flow-engine-puro-deterministico.md), [RN-010](./RN-010-validacao-fluxo-ativacao-segura.md)
- **Sprints que implementaram:** [sprint-03](../sprints/sprint-03.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
