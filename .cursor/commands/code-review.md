---
name: /code-review
id: code-review
category: Workflow
description: Code review estruturado por severidade (SET ou PR)
---

Executa code review do projeto seguindo o padrão de severidade (🔴 CRÍTICO → 🔵 BAIXO).

**Input**: Opcional — `SET` (escopo da change/task atual) ou `PR` (sprint/change completa). Padrão: `SET`.

**Instrução**

1. Leia e execute **integralmente** a skill em `.cursor/skills/code-review/SKILL.md`
2. Modo informado pelo usuário ou infira do contexto (change OpenSpec ativa = modo SET)
3. Se houver 🔴 CRÍTICO, corrija antes de `/opsx-changelog` ou `/opsx-archive`
