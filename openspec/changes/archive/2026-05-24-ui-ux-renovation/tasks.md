## 0. Reference audit (backoffice-app)

- [x] 0.1 Ler `reference-backoffice-app.md` e validar paths em `C:\Users\israe\omni-git\backoffice-app`
- [x] 0.2 Capturar checklist visual: sidebar expandida/colapsada, PageHeader, empty state, login auth layout

## 1. Design system foundation (packages/ui)

- [x] 1.1 Obter aprovação do usuário para dependências shadcn/Radix/Lucide
- [x] 1.2 Portar `globals.css` tokens + `components.json` (new-york) do backoffice para `packages/ui`
- [x] 1.3 Implementar primitivos: Button, Input, Label, Card, Dialog, Sheet, Alert, Skeleton, Separator, DropdownMenu
- [x] 1.4 Exportar componentes sem barrel pesado; documentar imports em README do package
- [x] 1.5 Wire `apps/web` para consumir `@atende-facil/ui` e tema global

## 2. Admin shell (composition)

- [x] 2.1 Portar `dashboard-shell.tsx` → `AdminShell` (adaptar Next Link → React Router)
- [x] 2.2 Portar `sidebar-nav.tsx` + `mobile-nav.tsx` com NAV_ITEMS do atende-facil
- [x] 2.3 Substituir `app-shell.tsx` legado; labels PT-BR com acentuação correta
- [x] 2.4 Portar `page-header.tsx` e `data-table-{empty,error,skeleton}-state.tsx`
- [x] 2.5 Integrar theme toggle, tenant slug e logout (padrão UserMenu do backoffice simplificado)

## 3. Pages — login, flows, settings

- [x] 3.1 Renovar `login.tsx` (card, validação, loading, erro)
- [x] 3.2 Renovar `flows.tsx` (PageHeader, tabela/cards, empty/loading/error)
- [x] 3.3 Renovar `settings.tsx` (forms acessíveis, timezone)
- [x] 3.4 Parallel fetch onde aplicável; remover estilos Tailwind ad hoc de primitivos

## 4. Pages — inbox e schedules

- [x] 4.1 Renovar `inbox.tsx` layout responsivo (lista + Chatwoot embed)
- [x] 4.2 Renovar `conversation-list.tsx` com seleção visual clara
- [x] 4.3 Renovar `schedules.tsx` + `weekly-grid.tsx` + `schedule-modal.tsx` com Dialog/Alert shadcn

## 5. Flow editor chrome

- [x] 5.1 Lazy-load rota flow-editor no router
- [x] 5.2 Criar `FlowEditorLayout` compound (toolbar, canvas, palette, properties, simulation)
- [x] 5.3 Breadcrumb Voltar + dirty-state warning antes de sair
- [x] 5.4 Migrar botões/painéis do editor para design system (sem alterar lógica React Flow)

## 6. Quality, a11y e fechamento

- [ ] 6.1 Passar `bun run lint` e `bun run build --filter=web`
- [ ] 6.2 Verificar focus trap em dialogs e aria-labels em ícones
- [ ] 6.3 Executar Testes Manuais de Entrega do design.md
- [ ] 6.4 Atualizar CHANGELOG via `/opsx-changelog` após apply

> **Bloqueado:** regressões reportadas em validação manual (inbox layout, portal Chatwoot, modal agendamentos). Corrigir via change `ui-ux-polish-validation` antes de marcar 6.x.
