## ADDED Requirements

### Requirement: Login page professional first impression
The login page MUST use design-system components, centered card layout, clear branding, inline validation errors, and loading state on submit — aligned with B2B SaaS admin patterns.

#### Scenario: Invalid credentials
- **WHEN** login fails
- **THEN** user MUST see a readable error message without losing form input

#### Scenario: Successful login
- **WHEN** credentials are valid
- **THEN** user MUST be redirected to `/inbox` with loading feedback during the request

### Requirement: Consistent page scaffolding
Each main page (Inbox, Fluxos, Agendamentos, Configurações) MUST use `PageHeader` (breadcrumbs, title, description, actions) and `DataTableEmptyState` / `DataTableErrorState` / `DataTableSkeleton` patterns ported from backoffice-app `src/shared/components/`.

#### Scenario: Empty flows list
- **WHEN** tenant has no flows
- **THEN** page MUST show guided empty state with CTA to create first flow

#### Scenario: API error on list load
- **WHEN** list fetch fails
- **THEN** page MUST show retry affordance without blank screen

### Requirement: Inbox layout usability
Inbox MUST preserve Chatwoot embed as primary chat surface but wrap it in improved layout: conversation list panel, clear selection state, and responsive stacking on mobile per ui-ux-pro-max responsive breakpoints (375/768/1024/1440).

#### Scenario: Mobile inbox
- **WHEN** viewport is mobile
- **THEN** user MUST be able to switch between conversation list and chat panel without broken overflow

### Requirement: Schedules and settings forms
Schedules calendar and tenant settings MUST use accessible form controls from the design system (Select, Label, time inputs) with consistent spacing and Portuguese copy (acentuação correta: Configurações).

#### Scenario: Schedule overlap warning
- **WHEN** user creates overlapping schedule client-side
- **THEN** warning MUST be visible before submit using Alert component styling

### Requirement: Data fetching without waterfalls
Pages MUST parallelize independent fetches on mount where applicable (react-best-practices `async-parallel`) and lazy-load heavy route chunks (flow editor) via `React.lazy`.

#### Scenario: Flows page load
- **WHEN** flows page mounts
- **THEN** list fetch MUST NOT block unrelated shell rendering
