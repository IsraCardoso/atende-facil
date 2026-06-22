---
name: /opsx-changelog
id: opsx-changelog
category: Workflow
description: Atualizar CHANGELOG.md a partir da change OpenSpec ativa ou arquivada
---

Atualiza `docs/changelog/CHANGELOG.md` para a change OpenSpec concluída.

**Input**: Opcional — nome da change (kebab-case). Se omitido, usar change ativa (`openspec list --json`) ou pedir seleção.

**Instrução**

1. Leia e execute **integralmente** a skill em `.cursor/skills/openspec-change-to-changelog/SKILL.md`
2. Siga o workflow obrigatório da skill sem pular passos
3. Não arquive a change — isso é `/opsx-archive`. Este comando só documenta no changelog

**Ordem recomendada no kanban (coluna Done):**

```
/code-review  →  /opsx-changelog  →  /opsx-archive
```
