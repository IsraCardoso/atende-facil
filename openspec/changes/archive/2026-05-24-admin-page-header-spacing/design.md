## Context

`DashboardShell` já aplica `p-6` no `main` (fix de `flows-page-layout-spacing`). O problema remanescente é **ritmo vertical interno**: em `/flows`, o botão "Novo fluxo" alinha ao topo (`items-start`) e o filtro fica em outro `div`, criando área vazia entre descrição e filtro. `/settings` e `/schedules` usam `space-y-6`, mas `PageHeader` ainda permite layouts heterogêneos.

Referência visual: backoffice billing — título + descrição + ações na mesma faixa; toolbar (filtros) colada abaixo com `mt-4` máximo; conteúdo principal com `space-y-6`.

## Goals / Non-Goals

**Goals:**

- Topo de `/flows`, `/settings` e `/schedules` visualmente alinhados (mesma distância título→conteúdo).
- Filtro de Fluxos integrado ao header, sem “buraco” entre subtítulo e select.
- `PageHeader` reutilizável com `toolbar` para futuras listagens.

**Non-Goals:**

- Alterar padding do `main` ou inbox split-view.
- `max-w-*` em fluxos (continua full-width).
- Novo design system / tokens.

## Decisions

### D1 — Slot `toolbar` no `PageHeader`

**Decisão:** adicionar prop `toolbar?: ReactNode` renderizada abaixo da linha título/ações com `mt-4 flex flex-wrap items-center gap-3`.

**Alternativa descartada:** `AdminPageLayout` separado — mais arquivos para pouco ganho nesta rodada.

### D2 — Alinhamento título + ações primárias

**Decisão:** `sm:items-center` na linha principal; `gap-3` em vez de `gap-4`.

**Rationale:** reduz altura da faixa do header quando há botão à direita.

### D3 — Espaçamento página → conteúdo

**Decisão:**

- Páginas scrolláveis (`settings`, `schedules`): wrapper `space-y-6`.
- Páginas `fullHeight` (`flows`): `flex flex-col gap-6` entre bloco header (inclui toolbar) e tabela scrollável.

### D4 — Fluxos: um único bloco `shrink-0` para header+toolbar

```tsx
<PageHeader
  title="Fluxos"
  description="..."
  actions={<Button>Novo fluxo</Button>}
  toolbar={<StatusFilter />}
/>
```

## Risks / Trade-offs

- **[Risk]** Toolbar muito alta em mobile → `flex-wrap` + `gap-3` mitiga.
- **[Trade-off]** Pages com filtros inline no header precisam migrar para `toolbar` manualmente.

## Migration Plan

1. Atualizar `PageHeader`.
2. Migrar `flows.tsx`.
3. Validar `settings` / `schedules` (ajuste mínimo se necessário).
4. Checklist visual light/dark.

## Testes Manuais de Entrega (Passo a Passo Executável)

**Pré-requisitos:** `bun run dev`, login demo.

1. **`/flows`** — distância título→filtro compacta (sem vão grande); distância filtro→tabela igual a Agendamentos header→grid.
2. **`/settings`** — topo alinhado com Agendamentos (mesmo respiro do `main` ao título).
3. **`/schedules`** — inalterado visualmente ou melhorado; sem regressão.
4. **Dark mode** — repetir 1–3.

**Critério:** três páginas com ritmo vertical equivalente no topo; Fluxos sem “buraco” entre descrição e filtro.
