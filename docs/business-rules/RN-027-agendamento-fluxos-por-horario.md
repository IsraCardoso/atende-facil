# RN-027 — Agendamento de fluxos por horario

> **Sprint:** 10 | **Status:** Em implementacao
> **Categoria:** Automacao — Agendamento

---

## Contexto

Tenants precisam configurar diferentes fluxos conversacionais para diferentes horarios e dias da semana (ex: fluxo comercial das 08:00-18:00 seg-sex, fluxo fora do expediente nos demais horarios). O sistema deve trocar automaticamente o fluxo ativo com base no horario local do tenant.

---

## Regra

### R1 — Tabela flow_schedules

Schedules DEVEM ser armazenados em tabela `flow_schedules`:
- `id` (uuid PK)
- `tenant_id` (FK para tenants)
- `flow_id` (FK para flows — apenas flows com status `published`)
- `days_of_week` (integer array, 0=Dom, 1=Seg ... 6=Sab)
- `start_time` (varchar 5, formato HH:MM)
- `end_time` (varchar 5, formato HH:MM)
- `active` (boolean, default true)
- `created_at`, `updated_at`

### R2 — Resolucao de flow por horario (FlowResolver)

Ao receber mensagem, o sistema DEVE resolver qual flow usar seguindo esta prioridade:
1. Buscar timezone do tenant
2. Converter horario atual para timezone do tenant
3. Buscar schedules ativos que cobrem dia + hora atual
4. Se schedule encontrado: usar flow do schedule
5. Se nenhum schedule bate: usar flow com `status = 'active'` (fallback)
6. Se nao ha schedule nem flow ativo: retornar null (mensagem nao processada)

### R3 — Proibicao de sobreposicao (overlap)

Dois schedules do mesmo tenant NAO PODEM ter sobreposicao de horario no mesmo dia:
- Overlap parcial: 08:00-12:00 vs 10:00-14:00 — PROIBIDO
- Overlap total: 08:00-17:00 vs 09:00-11:00 — PROIBIDO
- Dias diferentes: Seg 08:00-12:00 vs Ter 08:00-12:00 — PERMITIDO
- Update com self: schedule com ID X pode sobrepor a versao anterior de X — PERMITIDO

### R4 — RBAC

- `admin` e `manager`: criar, editar, deletar schedules
- `agent`: apenas visualizar schedules (read-only)

### R5 — Invalidacao de cache

Worker cron a cada 60s verifica tenants com schedules que transitaram (janela de horario mudou) e invalida cache de flow resolver para esses tenants.

### R6 — Constraint unico de flow ativo

O constraint unico `flows_one_active_per_tenant` no banco e REMOVIDO. A regra de 1 flow ativo por tenant continua enforced na camada de aplicacao via `ActivateFlowUseCase`.

---

## Excecoes

- Agendamento por data especifica (feriados) NAO esta no escopo
- Schedules que cruzam meia-noite (ex: 23:00-01:00) sao avaliados corretamente
- Em modo single-tenant, schedules funcionam normalmente
