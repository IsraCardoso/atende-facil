## ADDED Requirements

### Requirement: Professional admin layout shell
Authenticated routes MUST render inside a unified admin shell ported from the local reference `C:\Users\israe\omni-git\backoffice-app` (`dashboard-shell.tsx`, `sidebar-nav.tsx`, `mobile-nav.tsx`): collapsible sidebar w-64/w-16 with localStorage, mobile header h-14, main area `overflow-y-auto px-6`.

#### Scenario: Desktop navigation
- **WHEN** viewport is ≥1024px
- **THEN** sidebar MUST remain visible with labeled nav items for Inbox, Fluxos, Agendamentos, and Configurações

#### Scenario: Mobile navigation
- **WHEN** viewport is <1024px
- **THEN** shell MUST provide usable navigation via Sheet or equivalent without horizontal scroll of nav pills

### Requirement: Shell composition without boolean prop proliferation
Shell navigation and layout MUST use compound components and context providers per react-composition-patterns; boolean props like `isMobile`, `showSidebar`, `collapsed` MUST NOT multiply on a single monolithic component.

#### Scenario: Sidebar state
- **WHEN** user toggles sidebar collapse
- **THEN** state MUST live in a ShellProvider consumed by Sidebar and Main regions

### Requirement: Global chrome actions
The shell MUST expose theme toggle (light/dark), tenant slug display, and logout in predictable header/sidebar locations with consistent styling from the design system.

#### Scenario: User logs out
- **WHEN** user clicks Sair
- **THEN** session MUST clear and user MUST be redirected to `/login`
