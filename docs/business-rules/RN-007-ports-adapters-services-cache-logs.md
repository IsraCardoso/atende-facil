# RN-007 - Ports, Adapters e Services para cache e logs

> **Status:** `Ativa`
> **Domínio:** Arquitetura de Aplicação e Observabilidade
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

A Sprint 02 exige uso funcional de cache e logs sem acoplar casos de uso a detalhes de SDK/infra. Sem separação por contratos, a evolução para novos provedores e a testabilidade ficam caras. Esta RN define obrigatoriedade de Ports (fronteira), Adapters (infra) e Services (regra de aplicação).

---

## A Regra

**Funcionalidades de cache e logs devem ser acessadas por Ports (`CachePort`, `AppLoggerPort`) consumidos por use cases/services; implementações concretas devem existir como Adapters de infraestrutura, e regras de aplicação (TTL, chave, política) devem ficar em Services dedicados.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Caso de uso precisa cache | Usa `CachePort` via DI; não instancia cliente Redis/Valkey diretamente |
| Caso de uso precisa log | Usa `AppLoggerPort` com `correlationId` e `tenantId` |
| Regra de TTL/chave/invalidação | Deve estar em Service de aplicação, não no controller |
| Testes unitários | Podem usar adapter in-memory ou fake por contrato |

---

## Exemplos

**✅ Válido:**
> `GetCurrentUser` usa `IdentityCacheService` (que depende de `CachePort`) para cachear identidade por tenant+user.

**❌ Inválido:**
> Controller chama `createClient(redis)` diretamente e define TTL inline em múltiplos endpoints.

---

## Impactos Técnicos

- **Validação:** inspeção de DI/wiring e revisão de dependências de camada.
- **Mensagem de erro:** `"Violação arquitetural: acesso direto a infraestrutura fora de adapter/port."`
- **Afeta:** `apps/api` (application/infrastructure/interface), `packages/db` (adapter de cache), logs estruturados.

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-004](./RN-004-identidade-isolamento-tenant-token.md), [RN-005](./RN-005-autenticacao-jwt-bearer-seguranca.md), [RN-006](./RN-006-rbac-autorizacao-endpoints.md)
- **Sprints que implementaram:** [sprint-02](../sprints/sprint-02.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
