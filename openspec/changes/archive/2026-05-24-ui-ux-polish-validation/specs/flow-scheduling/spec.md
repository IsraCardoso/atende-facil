## ADDED Requirements

### Requirement: Schedule modal always provides user feedback
Creating or editing a schedule via the web UI MUST always produce visible UI feedback. Silent failures (modal not opening, empty form with no explanation) are forbidden.

#### Scenario: Open create modal
- **WHEN** user clicks “Novo agendamento”
- **THEN** Dialog MUST become visible within 300ms regardless of published flow count

#### Scenario: Blocked by missing published flow
- **WHEN** modal opens and no published flows exist
- **THEN** submit MUST be disabled and user MUST see guidance to publish a flow first
