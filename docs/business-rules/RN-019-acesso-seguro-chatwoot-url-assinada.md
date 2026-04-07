# RN-019 — Acesso Seguro ao Chatwoot via URL Assinada

> **Versão:** 1.0 | **Status:** Ativa | **Sprint:** 06

---

## A Regra

**O acesso ao Chatwoot embutido é feito via URL assinada pelo backend com token HMAC de curta duração. O frontend nunca armazena ou gera tokens de acesso ao Chatwoot diretamente.**

---

## Motivação

Evitar exposição de credenciais do Chatwoot no frontend. O backend é o único ponto que conhece segredos de autenticação com o Chatwoot.

---

## Detalhamento

1. O frontend solicita URL de acesso via `GET /conversations/:id/access`.
2. O backend gera a URL de embed com token HMAC assinado usando `CHATWOOT_SSO_SECRET`.
3. O token tem expiração curta (recomendado: 5 minutos).
4. O deep-link é gerado sem token (acesso público ao Chatwoot, requer login separado).
5. `CHATWOOT_SSO_SECRET` e `CHATWOOT_APP_URL` são variáveis de ambiente — nunca hardcodadas.
6. Logs de geração de URL não incluem o token gerado — apenas metadata (tenantId, conversationId, expiresAt).

---

## Exceções

- Se `CHATWOOT_SSO_SECRET` não estiver configurado, o endpoint de access retorna apenas deep-link (sem embed URL).

---

## Impacto

| Área | Impacto |
|---|---|
| Backend | Serviço de geração de URL assinada |
| Frontend | Consome URL pronta, não manipula segredos |
| Segurança | Token curto, segredo isolado no backend |
