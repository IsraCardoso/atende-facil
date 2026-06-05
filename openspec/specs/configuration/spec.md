## Purpose

Environment variables, secrets, and deployment configuration.

Migrated from legacy business rules: RN-002.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Configuração de ambientes e segredos (legacy: RN-002)
Toda configuração sensível ou variável de execução MUST ser fornecida por ambiente, com documentação obrigatória em `.env.example` e falha explícita de bootstrap quando variáveis obrigatórias estiverem ausentes; é proibido armazenar segredos no código-fonte.

#### Scenario: Ambiente `dev`, `staging` ou `production`
- **WHEN** Ambiente `dev`, `staging` ou `production`
- **THEN** Deve carregar configuração correspondente sem hardcode

#### Scenario: Variável obrigatória ausente
- **WHEN** Variável obrigatória ausente
- **THEN** Inicialização deve falhar com mensagem clara indicando o nome da variável

#### Scenario: Arquivo `.env.example`
- **WHEN** Arquivo `.env.example`
- **THEN** Deve listar todas as variáveis necessárias sem valores reais

#### Scenario: Segredo encontrado em código versionado
- **WHEN** Segredo encontrado em código versionado
- **THEN** Mudança deve ser bloqueada e corrigida antes de merge

#### Scenario: Variável opcional
- **WHEN** Variável opcional
- **THEN** Pode ter fallback seguro, desde que documentado

> **Legacy:** [`RN-002`](../../docs/business-rules/RN-002-configuracao-ambientes-segredos.md) | **Status:** Ativa | **Domain:** Configuração e Segurança Operacional
> **Implemented in:** `sprint-01`
> **Related:** RN-001, RN-003
