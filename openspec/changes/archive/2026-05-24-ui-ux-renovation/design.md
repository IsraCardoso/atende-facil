## Context

**Estado atual:** `apps/web` usa Tailwind inline + HTML nativo. `packages/ui` só exporta `uiTokens`. Navegação duplicada mobile/desktop em `app-shell.tsx`. Flow editor é rota isolada sem shell.

**Referência local (obrigatória na apply):** `C:\Users\israe\omni-git\backoffice-app` — ver `reference-backoffice-app.md` nesta change.

| Padrão backoffice | Arquivo referência | Destino atende-facil |
|-------------------|-------------------|----------------------|
| Dashboard shell | `dashboard-shell.tsx` | `apps/web/src/components/admin-shell/` |
| Sidebar nav | `sidebar-nav.tsx` | `admin-shell/sidebar-nav.tsx` (React Router) |
| Page header | `page-header.tsx` | `packages/ui` ou `apps/web/src/components/page-header.tsx` |
| Empty/error/skeleton | `data-table-*.tsx` | `packages/ui` composables |
| Tokens CSS | `globals.css` | `packages/ui/src/styles/globals.css` + import no web |
| shadcn config | `components.json` | `packages/ui/components.json` |

**Skills aplicadas nesta change:**

| Skill | Aplicação |
|-------|-----------|
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Design system SaaS admin — contraste WCAG AA, Lucide icons, hover 150–300ms, breakpoints 375/768/1024/1440, sem emoji como ícone |
| react-best-practices | `bundle-barrel-imports`, `bundle-dynamic-imports` (flow editor lazy), `async-parallel` em pages, `rerender-memo` em listas |
| [react-composition-patterns](https://github.com/tech-leads-club/agent-skills) | `ShellProvider`, `FlowEditorLayout`, variantes explícitas em vez de booleans |

## Goals / Non-Goals

### Goals

- Design system shadcn funcional em `packages/ui`
- Shell admin unificado (referência backoffice-app)
- Todas as páginas autenticadas renovadas com estados vazio/loading/erro
- Flow editor com chrome consistente + lazy route
- Acessibilidade baseline (focus, aria, dialogs)
- PT-BR com acentuação correta na UI

### Non-Goals

- Redesign da lógica Chatwoot / APIs
- Next.js migration
- Novas features de negócio (só apresentação)
- Design tokens custom fora do ecossistema shadcn sem necessidade

## Decisions

### 1. shadcn no `packages/ui` (não só em apps/web)

**Escolha:** inicializar shadcn no package `ui` com `components.json` apontando exports para `apps/web` consumir via `@atende-facil/ui`.

**Alternativa descartada:** shadcn só em `apps/web` — duplicaria se worker/admin futuro precisar dos mesmos primitivos.

### 2. Sidebar pattern — port direto do backoffice

**Escolha:** portar `DashboardShell` + `SidebarNav` + `MobileNav` do backoffice com mínimas adaptações:

- Sidebar `w-64` expandida / `w-16` colapsada, persistência `localStorage` key `sidebar-collapsed`
- Active item: `pathname.startsWith(href)` + `bg-accent` (igual `sidebar-nav.tsx`)
- Mobile: `header` fixo `h-14` + Sheet (`mobile-nav.tsx`)
- Main: `flex-1 overflow-y-auto px-6 pb-6 pt-14 md:p-6`

**Nav items atende-facil:** Inbox, Fluxos, Agendamentos, Configurações (ver `reference-backoffice-app.md`).

### 3. Composition over boolean props

**Escolha:**

```
<AdminShell>
  <AdminShell.Sidebar />
  <AdminShell.Header />
  <AdminShell.Content>{children}</AdminShell.Content>
</AdminShell>
```

**Alternativa descartada:** `AppShell collapsed mobile showSidebar` — não escala (react-composition-patterns).

### 4. Flow editor lazy + chrome mínimo

**Escolha:** `React.lazy(() => import('./pages/flow-editor'))` em router; wrapper `FlowEditorLayout` com breadcrumb e toolbar fixa.

**RN-022/023 preservadas:** React Flow nodes e simulação local inalterados em comportamento.

### 5. Cores e tipografia — copiar OKLCH do backoffice

**Escolha:** portar variáveis de `backoffice-app/src/app/globals.css` (`:root` + `.dark`) incluindo `--sidebar-*`, `--success`, `--warning`, `--link`. shadcn `new-york` + `baseColor: neutral` de `components.json`.

**Tipografia:** Geist Sans/Mono se disponível; senão Inter como fallback. Headings: `text-2xl font-bold tracking-tight` (igual `PageHeader`).

### 6. Compatibilidade stack (já alinhada)

`apps/web` já usa **React 19.2.4** e **Tailwind v4** — mesmo major do backoffice. Não migrar para Next.js; apenas portar componentes e CSS.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Bundle size ao adicionar shadcn | imports diretos por componente; lazy flow editor |
| Regressão visual em telas complexas (inbox 3-pane) | renovar incrementalmente por página em tasks |
| Diff Next.js vs Vite ao portar | seguir `reference-backoffice-app.md` — trocar Link/pathname, remover RSC |
| React 19 vs 18 (composition skill menciona React 19) | manter APIs React 18 compatíveis; ignorar `react19-*` rules até upgrade |

## Migration Plan

1. SET-A: `packages/ui` shadcn + tailwind preset
2. SET-B: AdminShell + router layout
3. SET-C: Login + Fluxos + Settings
4. SET-D: Inbox + Schedules
5. SET-E: Flow editor chrome + lazy
6. SET-F: polish a11y, lint, smoke test manual

Rollback: feature branch; sem migration de dados.

## Testes Manuais de Entrega (Passo a Passo Executável)

**Pré-requisitos:** `bun install`, API rodando, usuário de teste válido.

1. Abrir `/login` — card centralizado, erro legível em credencial inválida, redirect para inbox em sucesso.
2. Verificar sidebar desktop com 4 itens; redimensionar para mobile — navegação usável sem overflow quebrado.
3. `/flows` — empty state com CTA; lista com loading skeleton; abrir editor — breadcrumb Voltar funciona.
4. `/schedules` — grid legível; modal de schedule com Alert em overlap.
5. `/settings` — timezone select acessível; label associado.
6. `/inbox` — lista + embed Chatwoot em desktop e mobile.
7. Toggle tema claro/escuro — contraste legível em ambos.
8. Tab pelo teclado em dialog (schedule) — focus trap OK.

**Critério de aprovação:** todas as rotas autenticadas usam componentes `ui`; nenhuma página crítica com HTML cru para botões/inputs; lint e build passam.

## Open Questions

- ~~Clone local backoffice~~ ✅ `C:\Users\israe\omni-git\backoffice-app`
- Aprovação explícita para dependências shadcn (radix-ui, lucide-react, cva, clsx, tailwind-merge, tw-animate-css, sonner opcional) — **requer confirmação antes do SET-A apply**
