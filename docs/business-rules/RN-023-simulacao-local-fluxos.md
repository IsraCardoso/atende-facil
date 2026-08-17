# RN-023 - Simulacao local de fluxos

> **Status:** `Ativa`
> **Dominio:** Interface / UX
> **Criada em:** 2026-04-07 | **Atualizada em:** 2026-04-07

---

## Contexto

O admin precisa testar o fluxo antes de ativa-lo sem depender de um contato real no WhatsApp. O packages/flow engine e puro (sem IO), portanto pode ser importado diretamente pelo browser.

---

## A Regra

**A simulacao executa o packages/flow engine diretamente no browser, sem chamadas de rede. O usuario interage via painel de chat simulado na sidebar. O no atual e destacado visualmente durante a simulacao. A simulacao pode ser resetada a qualquer momento.**

---

## Condicoes e Excecoes

| Situacao | Comportamento esperado |
|---|---|
| Iniciar simulacao | Engine processMessage com session inicial |
| Enviar texto | Engine retorna acao (send, collect, transfer, end) |
| No de opcao | Exibir opcoes, validar resposta |
| No terminal | Encerrar simulacao com mensagem |
| Erro no flow | Exibir erro (flow invalido nao simula) |
| Reset | Voltar ao estado inicial |

---

## Impactos Tecnicos

- **Validacao:** `apps/web/src/hooks/use-flow-simulation.ts`
- **Afeta:** Frontend web (apps/web), packages/flow (importado no browser)

---

## Rastreabilidade

- **Solicitado por:** Produto
- **RNs relacionadas:** [RN-008](./RN-008-flow-engine-puro-deterministico.md), [RN-022](./RN-022-editor-visual-fluxos.md)
- **Sprints que implementaram:** [sprint-08](../sprints/sprint-08.md)
