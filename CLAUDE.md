@docs/ai/engineering.md

---

## Comandos disponíveis

Use `/project:<nome>` para invocar no Claude Code:

### OpenSpec (fluxo principal)

| Comando | Quando usar |
|---|---|
| `/project:opsx-propose` | Propor nova change — cria proposal, design e tasks |
| `/project:opsx-apply` | Implementar tasks da change ativa |
| `/project:opsx-archive` | Finalizar change e sincronizar specs |
| `/project:opsx-changelog` | Atualizar `docs/changelog/CHANGELOG.md` |
| `/project:opsx-explore` | Investigar o codebase sem criar change |
| `/project:opsx-sync` | Sincronizar delta specs manualmente |

### Qualidade

| Comando | Quando usar |
|---|---|
| `/project:code-review` | Code review estruturado por severidade |
| `/project:refactor-pass` | Refatoração no escopo da change ativa |
