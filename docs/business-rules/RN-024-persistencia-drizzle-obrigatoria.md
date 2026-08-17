# RN-024 — Persistencia Drizzle obrigatoria para repositorios

> **Sprint:** 09 | **Status:** Ativa
> **Categoria:** Infraestrutura — Persistencia

---

## Contexto

Desde a Sprint 01, repositorios foram implementados primeiro como in-memory para agilizar desenvolvimento. Na Sprint 07, o `DrizzleFlowRepository` foi criado como referencia, mas os demais repositorios continuam in-memory no bootstrap de producao. Dados se perdem a cada restart, impossibilitando deploy real.

---

## Regra

### R1 — Implementacao Drizzle obrigatoria

Todo repositorio cujo port esteja definido em `apps/api/src/domain/ports/` DEVE ter uma implementacao Drizzle correspondente em `apps/api/src/infrastructure/repositories/`.

### R2 — Selecao por ambiente

O DI module de cada dominio (auth, whatsapp, conversation, flow) deve:
- Registrar o repositorio **Drizzle** quando o parametro `db` estiver presente.
- Registrar o repositorio **in-memory** quando `db` estiver ausente (testes, dev sem DB).

### R3 — Contrato identico

Implementacoes Drizzle e in-memory devem satisfazer exatamente a mesma interface de port. Nenhum metodo extra deve vazar para fora do repositorio concreto (exceto helpers de teste como `seedInstance`).

### R4 — Mapeamento explicito

Cada repositorio Drizzle deve usar funcoes mapper puras para converter entre o schema do banco (`packages/db`) e a entidade de dominio. Nunca retornar o row do Drizzle diretamente.

### R5 — Repositorios afetados

| Port | Implementacao Drizzle | Status anterior |
|---|---|---|
| `TenantRepositoryPort` | `DrizzleTenantRepository` | in-memory |
| `UserRepositoryPort` | `DrizzleUserRepository` | in-memory |
| `MembershipRepositoryPort` | `DrizzleMembershipRepository` | in-memory |
| `SessionRepositoryPort` | `DrizzleSessionRepository` | in-memory |
| `WhatsAppInstanceRepositoryPort` | `DrizzleWhatsAppInstanceRepository` | in-memory |
| `ConversationRepositoryPort` | `DrizzleConversationRepository` | in-memory |
| `FlowRepositoryPort` (flow-ports) | `DrizzleFlowRepository` | Drizzle existe, mas nao era injetado |

### R6 — FlowRepositoryPort unificado

O `FlowRepositoryPort` simplificado em `whatsapp-ports.ts` (apenas `findActiveByTenant`) deve ser removido ou substituido por referencia ao port completo em `flow-ports.ts`. O `processIncomingMessage` deve usar o repo real, nao um stub.

---

## Excecoes

- Repositorios de teste/dev podem usar in-memory sem restricao.
- Ports de infraestrutura que nao persistem dados (ex: `SessionLockPort`, `WebhookIdempotencyPort`) nao sao afetados por esta regra.
