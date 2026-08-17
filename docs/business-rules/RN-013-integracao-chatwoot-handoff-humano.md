# RN-013 — Integração Chatwoot e hand-off humano

> **Status:** `Ativa`
> **Domínio:** Atendimento Humano e Integração Externa
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

O sistema usa Chatwoot como camada de atendimento humano desacoplada, evitando construir um inbox próprio. Quando o flow engine retorna `TRANSFER`, a conversa deve ser criada/atualizada no Chatwoot com histórico de contexto. Mensagens em sessões não-bot devem ser roteadas exclusivamente para o Chatwoot.

---

## A Regra

**Quando o flow engine retorna `action.kind === 'transferred_to_human'`, o use case deve: (1) criar conversa no Chatwoot via adapter, (2) enviar histórico de contexto, (3) persistir `chatwootConversationId` na sessão, (4) mudar `mode` para `waiting_human`, (5) publicar evento de domínio `ConversationHandedOff`. Mensagens em sessões `waiting_human` ou `human_active` devem ser roteadas exclusivamente para o Chatwoot, sem processar o flow engine.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Nó `transfer` alcançado | Conversa criada no Chatwoot, sessão muda para `waiting_human` |
| Mensagem em sessão `waiting_human` | Encaminhada para Chatwoot, engine não processado |
| Mensagem em sessão `human_active` | Encaminhada para Chatwoot, engine não processado |
| Chatwoot indisponível no hand-off | Erro logado, sessão não muda de modo (fail-safe) |
| Evento de domínio | Publicado após persistência bem-sucedida, nunca antes |

---

## Exemplos

**Válido:**
> Usuário navega até nó `transfer`. Use case cria conversa no Chatwoot, envia últimas mensagens como contexto, persiste `chatwootConversationId` e publica `ConversationHandedOff`.

**Inválido:**
> Use case chama API do Chatwoot diretamente sem adapter, ou processa engine para mensagem em sessão `waiting_human`.

---

## Impactos Técnicos

- **Validação:** testes de hand-off ponta a ponta com adapter in-memory.
- **Mensagem de erro:** `"Falha ao criar conversa no Chatwoot."` (log interno).
- **Afeta:** `apps/api` (domain/ports, infrastructure/chatwoot, application/use-cases).

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-009](./RN-009-semantica-nos-transicao-sessao.md), [RN-011](./RN-011-whatsapp-provider-agnostico.md), [RN-012](./RN-012-webhook-idempotencia-lock-sessao.md)
- **Sprints que implementaram:** [sprint-04](../sprints/sprint-04.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
