---
name: openspec-change-to-changelog
description: Atualiza docs/changelog/CHANGELOG.md ao concluir uma change OpenSpec. Use após /opsx:apply ou via /opsx-changelog, antes ou depois de /opsx-archive.
---

<!-- GERADO AUTOMATICAMENTE — fonte canônica: docs/ai/ — edite lá e rode: bun run ai:sync -->

# OpenSpec Change para Changelog

## Objetivo

Atualizar `docs/changelog/CHANGELOG.md` ao concluir uma **change OpenSpec** (fluxo atual). Equivalente OpenSpec do `sprint-to-changelog`.

---

## Quando executa

- Após `/opsx:apply` com todas as tasks `[x]`, **antes ou depois** de `/opsx:archive`
- Via comando `/opsx-changelog` no Cursor
- Manualmente: "use openspec-change-to-changelog"

---

## Workflow obrigatório

1. Identificar a change: argumento do usuário, ou `openspec list --json` (ativa), ou pasta em `openspec/changes/` (não archive)
2. Ler `proposal.md`, `design.md`, `tasks.md` e deltas em `specs/` se existirem
3. Consolidar o que foi **Adicionado / Alterado / Corrigido** a partir das tasks concluídas e do diff real
4. Atualizar `docs/changelog/CHANGELOG.md`:
   - Mover itens relevantes de `## [Não lançado]` para a nova seção (se aplicável)
   - Inserir nova seção **acima** de `## [Não lançado]`
5. Listar specs OpenSpec afetadas (`openspec/specs/<capability>/spec.md`) e legacy RN se houver
6. Registrar débitos novos `[ ]` e marcar débitos resolvidos `[x]` com nota de resolução
7. Se houver decisão arquitetural nova, criar `docs/decisions/DEC-XXX-*.md`
8. Apresentar resumo do que foi escrito no changelog

---

## Formato da entrada no changelog

```markdown
## [nome-da-change] — YYYY-MM-DD

> **Objetivo:** [do proposal.md — uma frase]

### Adicionado
- [concreto e verificável]

### Alterado
- [se houver]

### Corrigido
- [se houver]

### Decisões técnicas registradas
- [DEC-XXX — Nome](../decisions/DEC-XXX-nome.md) (se houver)

### Specs OpenSpec atualizadas
- [`capability`](../openspec/specs/capability/spec.md) — [requirement ou resumo]

### Débitos técnicos gerados
- [ ] [descrição] (se houver)

### Débitos técnicos resolvidos
- [x] [descrição] — [como foi resolvido] (se houver)
```

---

## Regras de qualidade

- Não inventar DEC, RN ou spec inexistente
- Ser específico — evitar "melhorias gerais"
- Nome da seção = id da change (kebab-case), não "sprint-XX"
- Se a change já foi arquivada, ler de `openspec/changes/archive/YYYY-MM-DD-<nome>/`
