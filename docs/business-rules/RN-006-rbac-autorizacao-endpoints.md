# RN-006 - RBAC por papel com autorizacao por endpoint

> **Status:** `Ativa`
> **Domínio:** Autorização e Controle de Acesso
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

Mesmo com usuário autenticado, o sistema precisa impedir ações fora do papel permitido em cada tenant. Sem regra explícita de autorização, funções sensíveis podem ser acessadas por perfis incorretos. Esta RN define RBAC mínimo da Sprint 02 com respostas 401/403 consistentes.

---

## A Regra

**Todo endpoint protegido deve aplicar autorização por papel (`admin`, `manager`, `agent`) com política centralizada; ausência de autenticação retorna 401 e autenticação válida sem permissão retorna 403.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Endpoint público de registro | Não requer token |
| Endpoint protegido sem token | 401 |
| Endpoint protegido com token válido e role permitida | acesso autorizado |
| Endpoint protegido com token válido e role não permitida | 403 |

---

## Exemplos

**✅ Válido:**
> `CreateUser` exige role `admin`; token de `manager` recebe 403.

**❌ Inválido:**
> Endpoint protegido valida apenas presença de token e ignora role do usuário.

---

## Impactos Técnicos

- **Validação:** middleware de auth + guard RBAC + testes E2E de autorização.
- **Mensagem de erro:** `"Acesso negado para o papel atual."`
- **Afeta:** endpoints de auth/protegidos na `apps/api`.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-004](./RN-004-identidade-isolamento-tenant-token.md), [RN-005](./RN-005-autenticacao-jwt-bearer-seguranca.md), [RN-007](./RN-007-ports-adapters-services-cache-logs.md)
- **Sprints que implementaram:** [sprint-02](../sprints/sprint-02.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
