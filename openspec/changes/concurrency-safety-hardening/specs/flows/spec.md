## MODIFIED Requirements

### Requirement: RN-020 (legacy: RN-020)
The system MUST enforce the following: Todo tenant pode ter multiplos flows. Cada flow possui um ciclo de vida com 4 estados (draft, published, active, archived). Apenas 1 flow pode estar ativo por tenant simultaneamente, **inclusive sob concorrência: a troca de flow ativo (demote do anterior + activate do atual) MUST ser executada como uma única operação atômica — nunca duas escritas independentes — de forma que o tenant nunca observe 0 nem 2 flows `active` simultâneos, mesmo sob falha no meio da troca ou duas chamadas concorrentes de ativação.** A transicao para published exige validacao estrutural obrigatoria via `validateFlowDefinition`. O sistema MUST oferecer uma transição combinada de `draft` ou `published` diretamente para `active` num único passo (publicação + ativação), reusando a MESMA validação estrutural exigida para a transição normal a `published` — nenhuma regra de validação nova, nenhum código de erro novo. Chamar essa transição sobre um flow já `active` MUST ser idempotente (retorna sucesso, sem trocar o flow ativo).

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Ativação em um passo a partir de draft
- **WHEN** um flow `draft` com definition estruturalmente válida é submetido à transição combinada
- **THEN** o flow passa por `published` e chega em `active` numa única chamada, desativando o flow ativo anterior do tenant se houver

#### Scenario: Ativação em um passo a partir de published
- **WHEN** um flow `published` é submetido à transição combinada
- **THEN** o flow vai direto para `active`, sem repetir a validação de publicação como passo distinto do ponto de vista do chamador

#### Scenario: Definition inválida
- **WHEN** a definition do flow não passa em `validateFlowDefinition`
- **THEN** a transição combinada é rejeitada com o mesmo erro `FLOW_VALIDATION_FAILED` e lista de issues que a transição para `published` já retornava, sem mudar o status do flow

#### Scenario: Flow já ativo
- **WHEN** a transição combinada é chamada sobre um flow que já está `active`
- **THEN** a chamada retorna sucesso sem efeito colateral (idempotente)

#### Scenario: Ativação concorrente de dois flows distintos no mesmo tenant
- **WHEN** duas chamadas de ativação (para flows diferentes do mesmo tenant) chegam simultaneamente
- **THEN** as chamadas são serializadas — uma completa a troca inteira (demote + activate) antes da outra prosseguir — e o tenant termina com exatamente 1 flow `active`, nunca 0 nem 2

#### Scenario: Falha no meio da troca de flow ativo
- **WHEN** a operação atômica de troca falha após o demote do flow anterior mas antes de ativar o flow-alvo (ex.: erro de conexão)
- **THEN** a transação inteira é revertida — o flow anterior permanece `active`, nenhum estado intermediário (0 flows ativos) é observável por outra leitura
