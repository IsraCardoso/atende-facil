# RN-012 — Webhook idempotência e lock de sessão

> **Status:** `Ativa`
> **Domínio:** Mensageria e Consistência de Estado
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

Provedores de WhatsApp podem reenviar o mesmo webhook em caso de falha de rede ou timeout. Além disso, o usuário pode enviar múltiplas mensagens em sequência antes que a primeira termine de processar. Sem proteção, duplicatas geram respostas repetidas e concorrência corrompe o estado da sessão.

---

## A Regra

**Todo webhook recebido deve passar por verificação de idempotência (por `provider + messageId`) antes de qualquer processamento. Toda sessão em processamento deve ser protegida por lock distribuído no Valkey com TTL de 10 segundos, garantindo serialização de mensagens concorrentes e auto-release em caso de falha.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Webhook já processado (mesma `provider + messageId`) | Retorna 200 sem processar novamente |
| Webhook novo | Marca como processado e prossegue |
| Lock de sessão já ativo | Segunda mensagem aguarda ou retorna 429 |
| Processo falha antes de release | Lock expira automaticamente após TTL (10s) |
| TTL de idempotência | 24 horas — suficiente para cobrir retries de todos os providers |

---

## Exemplos

**Válido:**
> Webhook da Evolution chega duas vezes com mesmo `messageId`. Segunda chamada retorna 200 sem efeito colateral.

**Inválido:**
> Use case processa webhook sem verificar idempotência, gerando resposta duplicada ao usuário.

---

## Impactos Técnicos

- **Validação:** testes de duplicata e concorrência no `ProcessIncomingMessageUseCase`.
- **Mensagem de erro:** `"Webhook já processado."` (log interno, não exposto ao provider).
- **Afeta:** `apps/api` (domain/ports, infrastructure/cache, application/use-cases).

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-011](./RN-011-whatsapp-provider-agnostico.md), [RN-013](./RN-013-integracao-chatwoot-handoff-humano.md)
- **Sprints que implementaram:** [sprint-04](../sprints/sprint-04.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
