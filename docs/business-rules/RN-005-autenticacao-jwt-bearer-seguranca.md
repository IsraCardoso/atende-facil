# RN-005 - Autenticacao JWT Bearer e seguranca de credenciais

> **Status:** `Ativa`
> **Domínio:** Autenticação e Segurança
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

A Sprint 02 introduz autenticação para acesso a endpoints protegidos e precisa estabelecer um padrão único e seguro para login e validação de sessão. Também é essencial eliminar repetição de tratamento de erro e evitar exposição de dados sensíveis em respostas. Esta RN padroniza JWT Bearer e contrato de erro.

---

## A Regra

**A autenticação da Sprint 02 deve usar JWT Bearer; toda falha de autenticação/autorização deve retornar payload de erro padronizado (`error`, `code`, `details` opcional) via handler centralizado; nunca retornar senha ou hash em qualquer resposta.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Login com credenciais válidas | Retorna token JWT Bearer com claims mínimas (`sub`, `tenantId`, `role`, `exp`, `iat`) |
| Token ausente/inválido/expirado | Retorna 401 com payload de erro padronizado |
| Erro de regra de auth/rbac | Retorna `code` semântico e status HTTP coerente, sem try/catch duplicado por endpoint |
| Resposta de endpoints de auth | Nunca inclui senha ou hash |

---

## Exemplos

**✅ Válido:**
> `POST /auth/login` retorna token Bearer e, em erro de credencial, responde `{ "error": "...", "code": "AUTH_INVALID_CREDENTIALS" }`.

**❌ Inválido:**
> Endpoint retorna mensagem de erro ad-hoc diferente em cada controller e inclui `passwordHash` no payload de usuário.

---

## Impactos Técnicos

- **Validação:** middleware/guard de auth, use cases de login e handler global de erro HTTP.
- **Mensagem de erro:** `"Falha de autenticação."` (com `code` específico por cenário)
- **Afeta:** `apps/api` (auth middleware, endpoints, use cases, contrato de erro).

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-004](./RN-004-identidade-isolamento-tenant-token.md), [RN-006](./RN-006-rbac-autorizacao-endpoints.md)
- **Sprints que implementaram:** [sprint-02](../sprints/sprint-02.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
