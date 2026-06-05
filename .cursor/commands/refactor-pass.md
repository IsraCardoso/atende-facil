---
name: /refactor-pass
id: refactor-pass
category: Workflow
description: Passagem de refatoração antes do fechamento da change
---

Executa refactor-pass no escopo da change OpenSpec ativa.

**Input**: Opcional — nome da change. Se omitido, inferir de `openspec list --json`.

**Instrução**

1. Leia e execute **integralmente** a skill em `.cursor/skills/refactor-pass/SKILL.md`
2. Escopo: arquivos alterados pela change atual
3. Se gerar 🔴 CRÍTICO, corrija antes de seguir para `/code-review`
