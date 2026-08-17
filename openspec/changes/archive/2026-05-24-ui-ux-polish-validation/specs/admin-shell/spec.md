## MODIFIED Requirements

### Requirement: Professional admin layout shell
Authenticated routes MUST render inside a unified admin shell ported from the local reference `C:\Users\israe\omni-git\backoffice-app` (`dashboard-shell.tsx`, `sidebar-nav.tsx`, `mobile-nav.tsx`): collapsible sidebar w-64/w-16 with localStorage, mobile header h-14, main area `overflow-y-auto px-6`. The global navigation sidebar MUST contain only app navigation (Inbox, Fluxos, Agendamentos, Configurações) and user chrome — MUST NOT embed page-specific panels such as conversation lists.

#### Scenario: Desktop navigation
- **WHEN** viewport is ≥1024px
- **THEN** sidebar MUST remain visible with labeled nav items for Inbox, Fluxos, Agendamentos, and Configurações

#### Scenario: Mobile navigation
- **WHEN** viewport is <1024px
- **THEN** shell MUST provide usable navigation via Sheet or equivalent without horizontal scroll of nav pills

#### Scenario: Inbox does not pollute global sidebar
- **WHEN** user is on `/inbox`
- **THEN** conversation filter/list MUST NOT render inside the global nav sidebar above route links
