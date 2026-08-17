# RN-017 — Inbox Chatwoot Embutido com Fallback Obrigatório

> **Versão:** 1.0 | **Status:** Ativa | **Sprint:** 06

---

## A Regra

**O painel de atendimento (Inbox) utiliza o Chatwoot como UI primária de chat, embutido via iframe. Toda implementação de Inbox deve oferecer um mecanismo de fallback (deep-link direto para a conversa) caso o iframe não carregue.**

---

## Motivação

Não construir uma UI de chat do zero. Aproveitar o Chatwoot como ferramenta madura de atendimento humano, mantendo o sistema como orquestrador e roteador.

---

## Detalhamento

1. O iframe embute a tela de conversa do Chatwoot correspondente à conversa selecionada.
2. O carregamento do iframe é monitorado — em caso de erro ou timeout, o sistema exibe um botão/link direto para o Chatwoot (deep-link).
3. O deep-link aponta para a conversa específica, não para o inbox geral.
4. Nenhum endpoint de envio de mensagem humana é exposto diretamente pelo backend — toda comunicação humana passa pelo Chatwoot (RN-016).
5. A página de Inbox exibe uma lista paginada de conversas no painel lateral para navegação.

---

## Exceções

- Se o Chatwoot estiver offline, o sistema exibe mensagem informativa e o deep-link como última tentativa.

---

## Impacto

| Área | Impacto |
|---|---|
| Frontend | Componente de iframe com fallback |
| Backend | Endpoint de geração de URL de acesso |
| UX | Atendente sempre tem caminho para a conversa |
