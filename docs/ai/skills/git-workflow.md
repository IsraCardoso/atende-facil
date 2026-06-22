# Skill: Git Workflow

## Objetivo

Garantir consistencia no versionamento e qualidade dos commits e PRs.

## Regras

### Branching

- 1 sprint = 1 branch
- Nome padrao:
  - `feat/sprint-XX-nome`

### Commits

- Seguir convencao definida em `docs/git/commit-convention.md`
- Commits devem ser pequenos e semanticos
- Evitar commits genericos

### Antes de finalizar sprint

Executar:

- lint
- testes
- code review (skill obrigatoria)

### Pull Request

- Deve usar template padrao
- Deve incluir:
  - descricao clara
  - checklist preenchido
  - resultado do code review

### Proibicoes

- commit direto na `main`
- commit sem lint/test
- PR sem review

## Saida esperada

- historico limpo
- PR claro
- facil auditoria
