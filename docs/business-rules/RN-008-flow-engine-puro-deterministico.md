# RN-008 - Engine de fluxo puro e deterministico

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

O flow engine e o nucleo do produto e precisa ser previsivel para permitir evolucao segura nas sprints seguintes. Se o motor depender de banco, HTTP ou framework, a testabilidade cai e os efeitos colaterais se espalham para toda a arquitetura. Esta RN define que o processamento de mensagem deve ser puramente funcional e deterministico.

---

## A Regra

**O processamento de mensagem do flow engine deve ser puro: recebe `session`, `message` e `flow`, e retorna apenas o novo estado e as acoes/eventos calculados, sem acoplamento com DB, HTTP, DI container ou I/O externo.**

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| Execucao normal do engine | Sem efeitos colaterais externos |
| Necessidade de integracao futura (API/worker) | Expor contratos/ports de dominio, sem implementar adapters no package `flow` |
| Falha de consistencia de fluxo em runtime | Retorno deterministico de erro de dominio no resultado, sem throw inesperado |
| Sessao fora de modo `bot` | Motor nao processa regra de bot; retorna acao de ignorar |

---

## Exemplos

**✅ Valido:**
> `processMessage` retorna novo `Session` e lista de mensagens/eventos sem chamar rede ou banco.

**❌ Invalido:**
> `processMessage` instancia cliente HTTP/DB para buscar fluxo ou persistir estado.

---

## Impactos Tecnicos

- **Validacao:** `packages/flow` (tipos, engine, testes unitarios).
- **Mensagem de erro:** `"Flow engine deve permanecer puro e sem dependencias externas."`
- **Afeta:** `packages/flow` e contratos consumidos por `apps/api` e `apps/worker`.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-001](./RN-001-fundacao-tecnica-isolamento-camadas.md), [RN-009](./RN-009-semantica-nos-transicao-sessao.md), [RN-010](./RN-010-validacao-fluxo-ativacao-segura.md)
- **Sprints que implementaram:** [sprint-03](../sprints/sprint-03.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
