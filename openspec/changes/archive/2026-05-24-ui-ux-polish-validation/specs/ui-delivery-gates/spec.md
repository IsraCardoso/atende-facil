## ADDED Requirements

### Requirement: Manual UI validation gate
UI-facing OpenSpec changes MUST NOT mark quality/closure tasks complete until the manual delivery checklist in `design.md` is executed and all steps pass.

#### Scenario: Premature closure blocked
- **WHEN** implementer finishes code changes for a UI change
- **THEN** tasks for lint/build/manual tests MUST remain unchecked until checklist steps are verified

#### Scenario: User-reported regression
- **WHEN** user reports broken flow after tasks were marked complete
- **THEN** related closure tasks MUST be reverted to unchecked and tracked in a follow-up change
