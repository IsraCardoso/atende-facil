## Why

O painel web (`apps/web`) usa Tailwind cru, sem design system compartilhado (`packages/ui` é stub), navegação inconsistente e UX fragmentada entre páginas e o editor de fluxos. Isso prejudica percepção de produto profissional e manutenção. A renovação alinha a interface ao padrão OmniChat backoffice-app: clean, moderna, shadcn, intuitiva — preparando o produto para clientes reais.

## What Changes

- Instalar e centralizar **shadcn/ui** no package `packages/ui` com tokens, tema claro/escuro e componentes base (Button, Input, Dialog, Sheet, Sidebar, etc.)
- Refatorar **AppShell** para layout admin profissional (sidebar persistente, header com tenant/usuário, breadcrumbs, estados vazio/loading/erro padronizados)
- Renovar páginas: **Login**, **Inbox**, **Fluxos**, **Agendamentos**, **Configurações** com composição React (compound components, sem boolean props)
- Integrar **Flow Editor** ao shell (navegação de volta, toolbar consistente) sem quebrar React Flow
- Aplicar guidelines: **ui-ux-pro-max** (contraste WCAG, ícones SVG, hover/focus, responsivo), **react-best-practices** (bundle, re-renders, lazy load), **react-composition-patterns** (variantes explícitas, providers)
- Referência visual/estrutural: **clone local** `C:\Users\israe\omni-git\backoffice-app` (mapeamento em `reference-backoffice-app.md`) — DashboardShell, PageHeader, DataTable states, tokens OKLCH shadcn v4 new-york
- **Non-goals:** alterar contratos da API; reescrever lógica de domínio; substituir Chatwoot embed no inbox; migrar para Next.js
- **BREAKING (dev):** imports de componentes visuais passam a vir de `@atende-facil/ui` (ou alias `ui`) — páginas não usam mais HTML/Tailwind ad hoc para primitivos

## Capabilities

### New Capabilities

- `design-system`: Fundação shadcn no monorepo — tokens, tema, primitivos e regras de uso
- `admin-shell`: Layout autenticado — sidebar, header, navegação, logout, tema, responsividade
- `web-pages-ux`: Experiência das páginas principais (login, inbox, flows, schedules, settings)

### Modified Capabilities

- `flow-editor`: Chrome do editor alinhado ao admin shell; navegação e estados visuais consistentes

## Impact

- **packages/ui** — implementação real do design system (hoje stub)
- **apps/web** — todas as pages e components visuais; `app-shell.tsx`; possíveis novos layout components
- **apps/web/package.json** — dependência do package `ui`; lazy routes onde aplicável
- **tailwind.config** — presets alinhados ao shadcn
- **Sem impacto** em `apps/api`, `packages/flow`, webhooks ou RNs de negócio (apenas apresentação)
