# RN-028 — Timezone por tenant

> **Sprint:** 10 | **Status:** Em implementacao
> **Categoria:** Multi-tenant — Configuracao

---

## Contexto

Cada tenant opera em um fuso horario especifico. Schedules de fluxo precisam ser avaliados no horario local do tenant, nao no horario do servidor.

---

## Regra

### R1 — Armazenamento

Timezone DEVE ser armazenado na tabela `tenants` como coluna `timezone`:
- Tipo: `varchar(50)`
- Default: `'America/Sao_Paulo'`
- Formato: identificador IANA (ex: `America/Fortaleza`, `America/Manaus`, `Europe/London`)

### R2 — Uso no FlowResolver

O `FlowResolverService` DEVE converter `Date.now()` para o horario local do tenant usando a timezone armazenada antes de avaliar schedules.

### R3 — Atualizacao via API

Endpoint `PATCH /tenants/me/timezone` permite admin/manager atualizar timezone do tenant:
- Input: `{ timezone: string }` — validar que e um identificador IANA valido
- Apenas roles `admin` e `manager` podem alterar

### R4 — Impacto no cache

Ao alterar timezone do tenant, o cache do FlowResolver DEVE ser invalidado para o tenant.

---

## Excecoes

- Multiplos timezones por tenant NAO sao suportados
- Timezone default e `America/Sao_Paulo` para todos os tenants existentes
