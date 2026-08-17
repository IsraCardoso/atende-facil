# RN-004 - Identidade e isolamento multi-tenant por token

> **Status:** `Ativa`
> **Domínio:** Identidade e Segurança Multi-tenant
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

Com a adoção de autenticação e RBAC na Sprint 02, qualquer falha na origem do contexto de tenant pode gerar vazamento de dados entre clientes. O sistema precisa garantir isolamento forte por tenant desde o primeiro endpoint protegido. Esta RN define que o tenant é sempre derivado de identidade autenticada e nunca de entrada não confiável.

---

## A Regra

**Em endpoints protegidos, o `tenant_id` de autorização e acesso a dados deve ser extraído exclusivamente do token autenticado (claims), sendo proibido confiar em `tenant_id` vindo do body da requisição.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Requisição autenticada válida | `tenant_id` efetivo vem do token |
| Body contém `tenant_id` diferente do token | Requisição deve ser rejeitada com erro de autorização |
| Modo single-tenant (`MULTI_TENANT=false`) | Contexto deve usar `DEFAULT_TENANT_ID` validado em bootstrap |
| Endpoint público (registro inicial) | Pode receber dados de tenant, sem acesso a dados protegidos |

---

## Exemplos

**✅ Válido:**
> Middleware de autenticação resolve claims do JWT e injeta `tenantId` no contexto para uso dos use cases.

**❌ Inválido:**
> Controller protegido usa `tenant_id` enviado no body para filtrar query em `users`/`memberships`.

---

## Impactos Técnicos

- **Validação:** middleware de auth, use cases protegidos e camada de repositório.
- **Mensagem de erro:** `"Tenant inválido para o token autenticado."`
- **Afeta:** `apps/api` (interface/application/infrastructure) e consultas multi-tenant no banco.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-005](./RN-005-autenticacao-jwt-bearer-seguranca.md), [RN-006](./RN-006-rbac-autorizacao-endpoints.md), [RN-007](./RN-007-ports-adapters-services-cache-logs.md)
- **Sprints que implementaram:** [sprint-02](../sprints/sprint-02.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
