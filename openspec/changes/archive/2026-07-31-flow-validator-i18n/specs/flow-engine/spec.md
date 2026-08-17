## MODIFIED Requirements

### Requirement: RN-010 (legacy: RN-010)
The system MUST enforce the following: Um fluxo so pode ser considerado apto para ativacao quando passar na validacao estrutural completa: no inicial existente, destinos validos, campos obrigatorios por tipo, ausencia de no orfao, e ausencia de ciclo automatico sem escape. Warnings estruturais tambem bloqueiam ativacao. As mensagens de cada issue de validação MUST ser em português correto e acentuado, descrevendo o problema na perspectiva de quem monta o fluxo no editor visual — sem citar nomes de campo/variável internos (`startNodeId`, `fieldKey`, `nextNodeId` etc.). `code` e `details` permanecem como contrato programático estável; `message` é apenas apresentação.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Issue de validação exibida ao usuário
- **WHEN** `validateFlowDefinition` retorna uma issue de qualquer `code`
- **THEN** o campo `message` é uma frase em português acentuado, sem jargão de nome de campo interno, compreensível por quem não é desenvolvedor
