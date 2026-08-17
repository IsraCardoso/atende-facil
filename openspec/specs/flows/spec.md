## Purpose

Flow CRUD, lifecycle, and Drizzle persistence.

Migrated from legacy business rules: RN-020, RN-021.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: RN-020 (legacy: RN-020)
The system MUST enforce the following: Todo tenant pode ter multiplos flows. Cada flow possui um ciclo de vida com 4 estados (draft, published, active, archived). Apenas 1 flow pode estar ativo por tenant simultaneamente. A transicao para published exige validacao estrutural obrigatoria via `validateFlowDefinition`. O sistema MUST oferecer uma transição combinada de `draft` ou `published` diretamente para `active` num único passo (publicação + ativação), reusando a MESMA validação estrutural exigida para a transição normal a `published` — nenhuma regra de validação nova, nenhum código de erro novo. Chamar essa transição sobre um flow já `active` MUST ser idempotente (retorna sucesso, sem trocar o flow ativo).

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

### Requirement: RN-021 (legacy: RN-021)
The system MUST enforce the following: Flows sao persistidos na tabela `flows` do PostgreSQL via Drizzle ORM. Toda query obrigatoriamente filtra por `tenant_id`. Registros com `deleted_at` preenchido nao aparecem em queries padrao. Um unique partial index garante no maximo 1 flow ativo por tenant no nivel do banco.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

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

### Requirement: Galeria de templates de fluxo prontos
Ao criar um novo flow, o sistema MUST oferecer templates prontos e estruturalmente válidos como ponto de partida alternativo a começar em branco. Escolher um template MUST criar o flow em `draft` já com a definition do template, navegando o usuário direto para o editor visual para revisão e customização. Todo template MUST ser estruturalmente válido conforme `validateFlowDefinition` — verificado por teste automatizado, não apenas inspeção manual.

#### Scenario: Criar flow a partir de template
- **WHEN** o usuário escolhe um template ao criar um novo flow
- **THEN** o flow é criado em `draft` com a definition do template já preenchida, e o usuário é levado ao editor visual

#### Scenario: Criar flow em branco
- **WHEN** o usuário não escolhe nenhum template (opção "Em branco")
- **THEN** o flow é criado em `draft` com definition vazia, comportamento inalterado

### Requirement: Ativação de atendimento em um clique na UI
A listagem de flows MUST oferecer uma ação "Ativar atendimento" para flows `draft` ou `published`, que aciona a transição combinada (RN-020) num único clique. Falha por validação MUST exibir ao usuário a lista de issues retornada, sem apenas falhar silenciosamente.

#### Scenario: Um clique com sucesso
- **WHEN** o usuário aciona "Ativar atendimento" num flow com definition válida
- **THEN** o flow fica `active` e a listagem reflete o novo status

#### Scenario: Um clique com falha de validação
- **WHEN** o usuário aciona "Ativar atendimento" num flow com definition inválida
- **THEN** a UI exibe cada issue de validação retornada pela API, em português legível, sem fechar a tela silenciosamente

