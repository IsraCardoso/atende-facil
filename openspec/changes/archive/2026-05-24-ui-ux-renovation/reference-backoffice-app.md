# Referência local: OmniChat backoffice-app

> **Path:** `C:\Users\israe\omni-git\backoffice-app`  
> Usar como **fonte visual e estrutural** na implementação. Adaptar para Vite + React Router (não copiar Next.js verbatim).

## Stack de referência vs atende-facil

| Aspecto | backoffice-app | atende-facil (alvo) |
|---------|----------------|---------------------|
| Framework | Next.js 16 App Router | Vite + React Router 7 |
| React | 19.2 | 19.2.4 ✅ |
| Tailwind | v4 + `@import 'shadcn/tailwind.css'` | v4 ✅ — alinhar `globals.css` |
| shadcn | v4, style `new-york`, `baseColor: neutral` | `packages/ui` |
| Tema | OKLCH CSS vars + `next-themes` | equivalente com hook existente `use-theme` ou `next-themes` |
| Ícones | lucide-react | lucide-react |
| Toast | sonner | portar opcional na apply |

## Arquivos a espelhar (prioridade)

### Shell e navegação

| Referência | O que copiar/adaptar |
|------------|---------------------|
| `src/shared/components/dashboard-shell.tsx` | Layout `h-screen`, sidebar `w-64`/`w-16`, collapse + `localStorage`, mobile header + sheet |
| `src/shared/components/sidebar-nav.tsx` | NAV_ITEMS com Lucide, active `bg-accent`, tooltips quando collapsed |
| `src/shared/components/mobile-nav.tsx` | Sheet mobile para nav |

### Page patterns

| Referência | O que copiar/adaptar |
|------------|---------------------|
| `src/shared/components/page-header.tsx` | Breadcrumbs + title `text-2xl font-bold` + description + actions slot |
| `src/shared/components/data-table-empty-state.tsx` | Empty default/filtered |
| `src/shared/components/data-table-error-state.tsx` | Erro com retry |
| `src/shared/components/data-table-skeleton.tsx` | Loading |
| `src/shared/components/data-table-toolbar.tsx` | Search + actions (flows list) |

### Design tokens

| Referência | O que copiar/adaptar |
|------------|---------------------|
| `src/app/globals.css` | OKLCH vars, `--sidebar-*`, `--success`, `--warning`, `@theme inline` |
| `components.json` | `style: new-york`, `cssVariables: true`, `iconLibrary: lucide` |
| `src/shared/lib/utils.ts` | `cn()` com clsx + tailwind-merge |

### shadcn primitives (portar para `packages/ui`)

Copiar de `src/shared/components/ui/` conforme necessidade:

`button`, `input`, `label`, `card`, `dialog`, `sheet`, `alert`, `badge`, `breadcrumb`, `separator`, `skeleton`, `dropdown-menu`, `select`, `table`, `tabs`, `tooltip`, `form`

## Adaptações obrigatórias (não portar cegamente)

1. **`Link` / `usePathname`** → `react-router-dom` `Link` + `useLocation().pathname`
2. **`'use client'`** → remover (Vite SPA)
3. **`@/shared/*` aliases** → `@atende-facil/ui` / paths do monorepo
4. **Domínios** → manter `apps/web/src/pages` + `components`; não criar `src/domains` nesta change (escopo UI only)
5. **nuqs / TanStack Query** → fora do escopo inicial; manter hooks/fetch atuais do web

## Nav atende-facil (mapear para SidebarNav)

| Item | path | Ícone sugerido |
|------|------|----------------|
| Inbox | `/inbox` | `Inbox` |
| Fluxos | `/flows` | `Workflow` ou `GitBranch` |
| Agendamentos | `/schedules` | `Calendar` |
| Configurações | `/settings` | `Settings` |

## Auth layout de referência

`src/app/(auth)/layout.tsx` — card centralizado em gradiente sutil → adaptar para `login.tsx`.
