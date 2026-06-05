## ADDED Requirements

### Requirement: PageHeader vertical rhythm SHALL be consistent across admin pages

The shared `PageHeader` component MUST render title, description, and primary actions in a compact top row, with optional `toolbar` content (filters, secondary controls) directly below without excessive vertical gap caused by sibling layout wrappers.

#### Scenario: List page with actions and filters

- **WHEN** a page passes `title`, `description`, `actions`, and `toolbar` to `PageHeader` (e.g. `/flows`)
- **THEN** the filter toolbar MUST appear immediately below the title row without a large empty gap between description and filter
- **THEN** vertical spacing from viewport top (after shell padding) to table content MUST match `/schedules` within one spacing token (`space-y-6` equivalent)

#### Scenario: Settings page without toolbar

- **WHEN** a page uses `PageHeader` with only `title` and `description` (e.g. `/settings`)
- **THEN** spacing from shell padding to first card MUST match other standard admin pages

#### Scenario: Primary action alignment

- **WHEN** `actions` are provided on `sm` breakpoints and wider
- **THEN** actions MUST vertically center-align with the title row (`items-center`), not stretch header height with top alignment only

### Requirement: Admin list pages SHALL use standardized section spacing

Full-height list pages and scrollable admin pages MUST use `gap-6` / `space-y-6` between the header block (including toolbar) and primary content (table, cards, grid).

#### Scenario: Flows full-height table

- **WHEN** user views `/flows`
- **THEN** header+toolbar and table are separated by `gap-6` (24px)
- **THEN** only the table region scrolls inside the viewport

#### Scenario: Schedules scrollable page

- **WHEN** user views `/schedules`
- **THEN** `PageHeader` and weekly grid use `space-y-6` consistent with `/settings`
