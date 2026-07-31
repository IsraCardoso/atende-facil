# RN-019 — Acesso Seguro ao Chatwoot via SSO Federado

> **Versão:** 2.0 | **Status:** Ativa | **Sprint:** 06 (revisada na Sprint 11)

---

## A Regra

**O acesso ao Chatwoot é feito via URL de login único emitida pela Platform API do Chatwoot, a pedido do backend. O frontend nunca armazena, gera ou vê tokens de acesso ao Chatwoot. O atendente autentica UMA vez, no Atende Fácil.**

---

## Motivação

Evitar exposição de credenciais do Chatwoot no frontend **e eliminar o segundo login**: o atendente não é técnico e manter duas senhas (Atende Fácil + Chatwoot) é fricção e fonte de erro. O Atende Fácil é a fonte de verdade da identidade; o Chatwoot confia no token que o backend obtém em nome do usuário.

---

## Detalhamento

1. O frontend solicita a URL de acesso via `GET /conversations/:id/access` (ou `GET /integrations/chatwoot/portal` para o painel).
2. O backend resolve o espelho do usuário no Chatwoot:
   - Se `users.chatwoot_user_id` estiver vazio, provisiona o espelho sob demanda (`POST /platform/api/v1/users`) e persiste o vínculo **antes** de vinculá-lo à conta — uma falha no passo seguinte nunca deixa o usuário sem ID reconhecível.
   - Papel no Chatwoot: **sempre `agent`**, independente do papel no Atende Fácil. `POST /auth/register-tenant` é público e concede `admin` a qualquer autocadastro; mapear isso para `administrator` no Chatwoot seria escalação de privilégio. Promoção a `administrator` é ação manual do operador, fora deste fluxo.
3. O backend pede a URL de login único: `GET /platform/api/v1/users/{id}/login`, autenticando com `CHATWOOT_PLATFORM_TOKEN`.
4. O token embutido na URL é de **uso único** — uma nova URL é emitida a cada abertura, nunca cacheada.
5. O `redirect_url` leva o atendente direto à conversa (ou ao dashboard), evitando navegação manual.
6. A senha do espelho no Chatwoot é aleatória e descartada: o acesso se dá exclusivamente por SSO. A senha do Atende Fácil **nunca** é replicada.
7. `CHATWOOT_PLATFORM_TOKEN` e `CHATWOOT_APP_URL` são variáveis de ambiente — nunca hardcodadas, nunca enviadas ao frontend.
8. Logs de emissão não incluem a URL nem o token — apenas metadata (`correlationId`, `userId`).

---

## Exceções

- Se `CHATWOOT_PLATFORM_TOKEN` não estiver configurado, o SSO é desabilitado e o endpoint retorna o deep-link. O atendente alcança o Chatwoot, mas precisa logar lá manualmente.
- Se a emissão do SSO falhar (Chatwoot indisponível, token inválido), a resposta degrada para o deep-link com um `reason` — a falha **não** derruba o carregamento da conversa.

---

## Impacto

| Área | Impacto |
|---|---|
| Backend | Adapter da Platform API + provisionamento sob demanda do espelho |
| Banco | `users.chatwoot_user_id` guarda o vínculo entre as duas identidades |
| Frontend | Consome URL pronta; iframe abre já autenticado |
| Segurança | Token de uso único, segredo isolado no backend, senha nunca replicada |
| UX | **Um único login** para o atendente |

---

## Débito conhecido

- O `sso_auth_token` estabelece a sessão via cookie do Chatwoot. Em ambientes onde o painel e o Chatwoot estão em origens diferentes sem HTTPS (ex.: `localhost:5173` × `localhost:3001`), o navegador pode recusar o cookie de terceiro no iframe (`SameSite`). Nesse caso o botão "Abrir Chatwoot" (nova aba) funciona normalmente. Em produção, servir os dois sob o mesmo domínio-pai com HTTPS resolve.
- **[BLOQUEANTE para deploy multi-tenant]** O espelho é provisionado numa ÚNICA conta Chatwoot, definida por env global (`CHATWOOT_ACCOUNT_ID`). Com `MULTI_TENANT=true`, agentes de tenants diferentes federados por este fluxo caem na MESMA conta Chatwoot e veem conversas uns dos outros. RN-026 (config Chatwoot por tenant) resolve isso para o envio/recebimento de mensagens via `chatwoot-port-factory.ts`, mas o SSO ainda não usa essa resolução por tenant. Antes de habilitar `CHATWOOT_PLATFORM_TOKEN` em produção multi-tenant: (a) estender a resolução per-tenant ao SSO, ou (b) restringir esta feature a deployments single-tenant.
- Sem deprovisionamento: o papel no Chatwoot é definido só na primeira federação e nunca reconciliado. Um usuário desativado ou removido do tenant mantém o espelho e o acesso ao Chatwoot ativos — requer remoção manual pelo operador até que `ChatwootPlatformPort` ganhe um método de revogação.
