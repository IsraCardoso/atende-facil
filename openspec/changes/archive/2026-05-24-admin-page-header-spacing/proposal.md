## Why

As páginas **Configurações** e **Fluxos** exibem espaçamento vertical inconsistente no topo: buracos grandes entre título, descrição, ações e toolbar, diferente de **Agendamentos** e do padrão backoffice. Isso ocorre porque `PageHeader` usa `gap-4` com `items-start` (altura da linha definida pelo botão de ação) e **Fluxos** separa filtro em bloco irmão com `gap-4`, amplificando o vazio visual. Complementa e fecha o escopo pendente de `flows-page-layout-spacing`.

## What Changes

- Padronizar ritmo vertical do topo das páginas admin: bloco de cabeçalho compacto + `space-y-6` até o conteúdo principal.
- Estender `PageHeader` com slot opcional `toolbar` (filtros/ações secundárias) renderizado logo abaixo do título, sem vão causado por botões primários à direita.
- Ajustar alinhamento do header: `items-center` na linha título+ações; espaçamento interno `gap-3` / `space-y-4` consistente.
- Refatorar `flows.tsx`: mover filtro de status para `PageHeader.toolbar`.
- Alinhar `settings.tsx` e `schedules.tsx` ao mesmo wrapper (`space-y-6`, sem wrappers redundantes).
- Documentar padrão em spec `admin-page-layout` (completa delta pendente de `flows-page-layout-spacing`).

## Capabilities

### New Capabilities

- _(nenhuma — requisitos entram em `admin-page-layout` já iniciado na change `flows-page-layout-spacing`)_

### Modified Capabilities

- `admin-page-layout`: requisitos de ritmo vertical do `PageHeader`, slot `toolbar` e espaçamento entre header e conteúdo.

## Impact

- `apps/web/src/components/page-header.tsx`
- `apps/web/src/pages/flows.tsx`, `settings.tsx`, `schedules.tsx`
- Sem mudanças de API ou backend.
- Relacionado: arquivar ou absorver tasks pendentes de `flows-page-layout-spacing` após esta entrega.
