## Why

Após a correção do `@source` Tailwind, regressões de UX persistem na listagem de fluxos (flicker e mudança de largura ao filtrar), no filtro da inbox (Select quebrado com ordem/scroll incorretos) e no menu de usuário (sem ícone Settings no padrão backoffice). O atendente espera paridade visual e comportamental com `devel-backoffice-app.omni.chat/billing`.

## What Changes

- **Fluxos**: layout `flex h-full flex-col` como billing; filtro por `Select` com ícone `ListFilter`; tabela com `min-w` fixo, header sticky e `isLoading`/`isFetching` sem desmontar estrutura; ações em `DropdownMenu` com ícones semânticos (`MoreVertical`).
- **Inbox**: substituir `Select` do filtro de status por `DropdownMenu` + `RadioGroup` (portal estável); loading sem limpar lista durante refetch.
- **Shell**: `UserMenu` com trigger `Settings` + dropdown (tema + logout), posicionado no footer da sidebar como backoffice.
- **Estabilidade de layout**: `scrollbar-gutter: stable` no `main`; remover `max-w-5xl` que comprime e recentra conteúdo ao mudar altura da tabela.

## Capabilities

### New Capabilities

- Nenhuma capability nova de domínio.

### Modified Capabilities

- `admin-shell`: UserMenu padrão backoffice (Settings no footer).
- `web-pages-ux`: Fluxos billing-like; inbox filter dropdown corrigido.

## Impact

- `apps/web/src/pages/flows.tsx`
- `apps/web/src/components/conversation-list.tsx`
- `apps/web/src/components/admin-shell/user-menu.tsx`
- `apps/web/src/components/admin-shell/dashboard-shell.tsx`
- `apps/web/src/hooks/use-theme.ts` (expor `setTheme`)
- Novo: `apps/web/src/components/flow-actions-menu.tsx`
