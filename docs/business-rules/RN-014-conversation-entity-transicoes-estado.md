# RN-014 — Conversation entity e transições de estado

> **Status:** `Ativa`
> **Domínio:** Atendimento / Sessão
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Contexto

O sistema precisa distinguir o estado do bot/flow (Session) do ciclo de atendimento humano (Conversation). A Conversation tracka status, atribuição de agente e vínculo com Chatwoot, enquanto a Session tracka posição no fluxo, dados coletados e fluxo ativo.

---

## A Regra

**Toda interação que envolve hand-off humano deve ser gerenciada por uma entidade Conversation separada da Session. As transições de status são atômicas, rastreáveis e validadas por máquina de estados.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Nova sessão criada | Conversation criada automaticamente com status `bot` |
| Flow engine retorna `transferred_to_human` | Conversation muda para `waiting_human`, evento emitido |
| Agente assume conversa (via Chatwoot) | Conversation muda para `human_active`, evento emitido |
| Agente encerra conversa (via Chatwoot) | Conversation volta para `bot`, sessão reinicia do zero, evento emitido |
| Transição inválida (ex: bot → human_active) | Erro retornado, nenhuma mudança persistida |
| Mensagem recebida com conversation.status !== 'bot' | Bot ignora, mensagem encaminhada ao Chatwoot |

---

## Máquina de estados

```
bot → waiting_human (via transfer do flow engine)
waiting_human → human_active (via assign do Chatwoot)
waiting_human → bot (via close — agente recusa)
human_active → bot (via close — agente encerra)
```

Transições não listadas acima são inválidas e devem retornar erro.

---

## Exemplos

**✅ Válido:**
> Conversation em `waiting_human` recebe evento de atribuição → status muda para `human_active`, evento `conversation.human_active` emitido após persistência.

**❌ Inválido:**
> Conversation em `bot` recebe tentativa de atribuição direta → transição `bot → human_active` é inválida, deve retornar erro.

---

## Impactos Técnicos

- **Validação:** Use case valida transição antes de persistir
- **Mensagem de erro:** `"Transição de estado inválida: {statusAtual} → {statusDesejado}"`
- **Afeta:** ProcessIncomingMessage, AssignConversation, CloseConversation, ConversationRepository

---

## Rastreabilidade

- **Solicitado por:** Requisito de produto (hand-off humano)
- **RNs relacionadas:** RN-015, RN-016, RN-012
- **Sprints que implementaram:** sprint-05
- **Changelog:** docs/changelog/CHANGELOG.md
