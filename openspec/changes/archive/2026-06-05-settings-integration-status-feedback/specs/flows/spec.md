## ADDED Requirements

### Requirement: Visibilidade do fluxo ativo no contexto de integração
Quando a integração WhatsApp está conectada, o sistema MUST informar ao administrador qual fluxo conversacional está ativo no tenant ou que nenhum fluxo está ativo, respeitando RN-020 (máximo um fluxo ativo por tenant).

#### Scenario: Fluxo ativo identificado
- **WHEN** existe exatamente um fluxo com status `active` para o tenant
- **THEN** resumo operacional inclui `activeFlow.id` e `activeFlow.name`

#### Scenario: Nenhum fluxo ativo
- **WHEN** não há fluxo com status `active`
- **THEN** resumo operacional retorna `activeFlow: null` e UI orienta publicar/ativar um fluxo

#### Scenario: Consistência com regra de unicidade
- **WHEN** banco garante no máximo um fluxo ativo (partial unique index)
- **THEN** endpoint de resumo nunca retorna mais de um fluxo ativo
