## ADDED Requirements

### Requirement: Flow editor integrated admin chrome
The flow editor route MUST remain full-canvas for React Flow but MUST include admin chrome: breadcrumb/back to Fluxos, flow name, save status, and toolbar actions styled with the shared design system.

#### Scenario: Navigate back to flows list
- **WHEN** user clicks Voltar para Fluxos
- **THEN** user MUST return to `/flows` without losing unsaved-work warning when dirty

#### Scenario: Visual consistency
- **WHEN** user opens flow editor
- **THEN** buttons, panels, and simulation sidebar MUST use design-system components matching the rest of the app

### Requirement: Editor panels use composition
Node palette, property panel, and simulation panel MUST be structured as compound regions under a FlowEditorLayout provider rather than a single component with many boolean visibility flags.

#### Scenario: Toggle simulation panel
- **WHEN** user opens simulation
- **THEN** simulation panel MUST mount as sibling region sharing editor context, not via `showSimulation={true}` on root editor
