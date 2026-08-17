## ADDED Requirements

### Requirement: Shared shadcn design system package
The monorepo MUST expose a real design system in `packages/ui` built on shadcn/ui v4 (style `new-york`, `baseColor: neutral`) with OKLCH CSS variables ported from `backoffice-app/src/app/globals.css`, consumable by `apps/web` via workspace dependency.

#### Scenario: Web imports primitives from ui package
- **WHEN** a page needs Button, Input, or Dialog
- **THEN** it MUST import from `packages/ui` and MUST NOT duplicate raw HTML/Tailwind primitives for the same purpose

#### Scenario: Theme tokens are centralized
- **WHEN** light or dark theme is active
- **THEN** colors, radius, and typography MUST resolve from shared CSS variables defined once in the design system

### Requirement: Accessible interactive components
All clickable components in the design system MUST meet WCAG AA contrast in light mode, MUST show visible focus rings, and MUST use Lucide SVG icons instead of emoji for UI chrome.

#### Scenario: Keyboard navigation on dialog
- **WHEN** user opens a modal Dialog
- **THEN** focus MUST be trapped inside the dialog and ESC MUST close it

#### Scenario: Icon-only control
- **WHEN** a button displays only an icon
- **THEN** it MUST include an accessible `aria-label`

### Requirement: Performance-safe component exports
The design system MUST avoid barrel-file re-exports that harm tree-shaking; consumers MUST import from explicit component entry paths per react-best-practices `bundle-barrel-imports`.

#### Scenario: Page imports single component
- **WHEN** web imports only `Button`
- **THEN** the production bundle MUST not pull unrelated heavy components from the same barrel
