## MODIFIED Requirements

### Requirement: Inbox layout usability
Inbox MUST use a dedicated split layout: conversation list panel beside the chat surface (or empty state), with the global admin shell navigation unchanged. Chatwoot embed remains the primary chat surface when a conversation is selected. Responsive behavior MUST allow switching list/chat on mobile without broken overflow.

#### Scenario: Desktop inbox split
- **WHEN** viewport is ≥1024px and user opens `/inbox`
- **THEN** conversation list MUST appear in a dedicated column within main content, not inside the global nav sidebar

#### Scenario: Mobile inbox
- **WHEN** viewport is mobile
- **THEN** user MUST be able to switch between conversation list and chat panel without broken overflow

#### Scenario: Empty inbox with Chatwoot portal
- **WHEN** no conversation is selected and Chatwoot is configured
- **THEN** empty state MUST offer a clear action to open the Chatwoot portal in a new tab

### Requirement: Consistent page scaffolding
Each main page (Inbox, Fluxos, Agendamentos, Configurações) MUST use `PageHeader` (breadcrumbs, title, description, actions) and `DataTableEmptyState` / `DataTableErrorState` / `DataTableSkeleton` patterns. Data tables MUST align cell content vertically (`align-middle`) and keep action buttons in a consistent column.

#### Scenario: Flows table alignment
- **WHEN** flows list renders multiple rows with multi-line names
- **THEN** status, version, date and action cells MUST remain vertically centered relative to the row

## ADDED Requirements

### Requirement: Schedule creation feedback
The schedules page MUST provide explicit feedback when the user triggers “Novo agendamento”, including when no published flows exist.

#### Scenario: No published flows
- **WHEN** user clicks “Novo agendamento” and tenant has zero published flows
- **THEN** a Dialog MUST open explaining that a flow must be published first, with navigation affordance to `/flows`

#### Scenario: Published flows available
- **WHEN** user clicks “Novo agendamento” and at least one published flow exists
- **THEN** Dialog MUST open with flow select populated and save enabled when form is valid
