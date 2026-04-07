# RN-016 — Chatwoot webhook reverso e sincronização

> **Status:** `Ativa`
> **Domínio:** Integração / Chatwoot
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Contexto

Mensagens de agentes humanos devem fluir exclusivamente pelo Chatwoot. O backend recebe webhooks do Chatwoot (mensagem do agente, atribuição, encerramento) e traduz para ações internas: enviar mensagem via provider WhatsApp correto, atualizar status da conversation, emitir eventos.

---

## A Regra

**Toda comunicação humana passa obrigatoriamente pelo Chatwoot. O backend não expõe endpoint direto de envio humano. Webhooks do Chatwoot são autenticados por token fixo e processados por use cases dedicados.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Agente envia mensagem no Chatwoot | Webhook `message_created` (outgoing) → backend envia ao WhatsApp via provider correto |
| Conversa atribuída no Chatwoot | Webhook `conversation_status_changed` (open) → conversation muda para `human_active` |
| Conversa resolvida no Chatwoot | Webhook `conversation_status_changed` (resolved) → conversation volta para `bot`, sessão reinicia |
| Webhook com token inválido/ausente | Resposta 401, nenhum processamento |
| Webhook com evento desconhecido | Resposta 200, log debug, nenhum processamento |
| Webhook com conversation não encontrada | Log warn, resposta 200 (não causar retry do Chatwoot) |
| Mensagem `incoming` no webhook (do cliente) | Ignorada — evita loop (o cliente já enviou via WhatsApp) |

---

## Fluxo de mensagem do agente

```
Agente responde no Chatwoot
  → Chatwoot envia webhook POST /webhook/chatwoot
  → Backend valida token
  → Backend busca conversation pelo chatwootConversationId
  → Backend resolve provider WhatsApp do tenant
  → Backend envia mensagem ao usuário via provider
```

---

## Exemplos

**✅ Válido:**
> Agente digita "Olá, posso ajudar?" no Chatwoot → webhook chega ao backend → backend envia "Olá, posso ajudar?" ao WhatsApp do usuário via Evolution API.

**❌ Inválido:**
> Agente envia mensagem diretamente pela Evolution API sem passar pelo backend → sem rastreabilidade, sem garantia de provider correto, sem registro na conversation.

---

## Impactos Técnicos

- **Validação:** Token `CHATWOOT_WEBHOOK_TOKEN` validado no controller antes de processar
- **Mensagem de erro:** 401 para token inválido (sem corpo detalhado para segurança)
- **Afeta:** chatwoot-webhook-routes, SyncChatwootMessage, SyncChatwootStatus, ConversationRepository

---

## Rastreabilidade

- **Solicitado por:** Requisito de produto (fluxo de atendimento humano)
- **RNs relacionadas:** RN-013, RN-014, RN-015
- **Sprints que implementaram:** sprint-05
- **Changelog:** docs/changelog/CHANGELOG.md
