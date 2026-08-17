# Guia OpenSpec — Atende Fácil

Este projeto migrou o SDD customizado (RNs + sprints em `docs/`) para [OpenSpec](https://github.com/Fission-AI/OpenSpec). **Nada foi perdido** — tudo está rastreável.

---

## Estrutura

```
openspec/
├── config.yaml          # Contexto do projeto + regras para a IA
├── specs/               # O que JÁ ESTÁ especificado (fonte da verdade)
│   ├── flow-engine/spec.md
│   ├── chatwoot-integration/spec.md
│   └── ... (16 capabilities)
├── changes/             # O que DEVE mudar (propostas ativas)
│   └── archive/         # Sprints 01–10 arquivadas aqui
└── ideas/               # Capturas rápidas para o kanban
```

**Legado preservado:**

| Antes | Depois | Mapa |
|-------|--------|------|
| `docs/business-rules/RN-*.md` | `openspec/specs/<capability>/spec.md` | `docs/migration/rn-to-openspec-map.md` |
| `docs/sprints/sprint-*.md` | `openspec/changes/archive/YYYY-MM-DD-sprint-NN/` | mesma tabela no mapa |
| `docs/changelog/CHANGELOG.md` | Continua válido (histórico) | — |

Cada requirement em `openspec/specs/` inclui `(legacy: RN-XXX)` no título.

---

## Fluxo diário (Cursor)

### 1. Nova feature ou correção

No chat do Cursor:

```
/opsx:propose "descrição do que você quer construir"
```

Isso cria em `openspec/changes/<nome>/`:

- `proposal.md` — por quê e o quê
- `specs/` — deltas (ADDED/MODIFIED Requirements)
- `design.md` — como implementar
- `tasks.md` — checklist rastreável

### 2. Implementar

```
/opsx:apply
```

A IA lê `tasks.md`, implementa e marca `- [x]` conforme avança.

### 3. Finalizar

```
/opsx:archive
```

Move a change para `archive/`, sincroniza deltas com `openspec/specs/` e fecha o ciclo.

### Comandos auxiliares

| Comando `/` no Cursor | Skill executada | Uso |
|----------------------|-----------------|-----|
| `/opsx-propose` | `openspec-propose` | Nova change |
| `/opsx-apply` | `openspec-apply-change` | Implementar tasks |
| `/opsx-archive` | `openspec-archive-change` | Arquivar + sync specs |
| `/opsx-explore` | `openspec-explore` | Investigar sem change |
| `/opsx-sync` | `openspec-sync-specs` | Sync manual de deltas |
| `/opsx-changelog` | `openspec-change-to-changelog` | Preencher CHANGELOG.md |
| `/code-review` | `code-review` | Review por severidade |
| `/refactor-pass` | `refactor-pass` | Refatoração pré-fechamento |

> **Por que `/` não mostra minhas skills?** O menu `/` lista **comandos** (`.cursor/commands/*.md`), não skills (`.cursor/skills/*/SKILL.md`). Skills são carregadas pela IA quando você usa um comando que as referencia, ou quando você escreve no chat: *"use a skill code-review"*.

CLI: `npx @fission-ai/openspec list` · `spec list` · `validate --specs` · `view`

---

## Kanban visual (OpenSpec UI)

[OpenSpec UI](https://github.com/ToruAI/openspec-ui) lê a pasta `openspec/` e exibe:

**Ideas → Todo → In Progress → Done → Archived**

### Kanban + Cursor: quem faz o quê

O **OpenSpec UI** (kanban) é só visualização dos arquivos em `openspec/` — **não executa IA nem skills**. Você olha o quadro no browser e **age no chat do Cursor** com os comandos `/`:

| Coluna kanban | O que fazer no Cursor |
|---------------|----------------------|
| **Ideas** | `/opsx-explore` ou `/opsx-propose "..."` |
| **Todo** | `/opsx-propose` (gera proposal, design, tasks) |
| **In Progress** | `/opsx-apply` |
| **Done** | `/refactor-pass` → `/code-review` → `/opsx-changelog` → `/opsx-archive` |
| **Archived** | Só leitura — change já em `changes/archive/` |

**Cadeia de fechamento (coluna Done):**

```
/refactor-pass  →  /code-review  →  /opsx-changelog  →  /opsx-archive
```

### Instalação e uso (Windows)

Na raiz do monorepo:

```powershell
# Primeira vez (baixa o binário ~5MB)
bun run openspec:ui:setup

# Iniciar kanban
bun run openspec:ui
```

Abra `http://localhost:3333`. O arquivo `openspec-ui.json` na raiz já aponta para `openspec/` deste projeto.

Alternativa manual: [GitHub Releases](https://github.com/ToruAI/openspec-ui/releases) + `openspec-ui.exe --config openspec-ui.json`

### Capturar ideias

- Pelo UI: coluna **Ideas**
- Ou crie `openspec/ideas/minha-ideia.md` com uma frase

Depois use `/opsx:propose` para expandir em change completa.

---

## Scripts npm (raiz)

```bash
bun run openspec:list          # changes ativas
bun run openspec:specs         # listar capabilities
bun run openspec:validate      # validar specs
bun run openspec:view          # dashboard CLI
bun run openspec:migrate       # re-gerar specs do legado (cuidado: sobrescreve)
bun run openspec:reinstall     # atualiza skills/comandos Cursor + ai:sync
```

### Troubleshooting (Windows)

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `openspec: command not found` no terminal | CLI não está no PATH global | Use `bun run openspec -- ...` na raiz do repo |
| `/opsx-propose` não acha skills | IDE não recarregou após update | `bun run openspec:reinstall` → **Reload Window** no Cursor |
| Menu `/` não lista skills | Esperado | `/` lista **comandos** (`opsx-propose`, etc.); skills são carregadas pela IA |
| Changes/specs sumiram | Improvável se só reinstalou CLI | Contexto vive em `openspec/` — não rode `openspec:migrate` sem querer |

CLI instalado localmente: `@fission-ai/openspec@1.4.1` (pinado em `devDependencies`).

---

## Coexistência com documentação legada

- **`docs/business-rules/`** — somente leitura histórica; não criar RNs novas aqui
- **`docs/sprints/`** — sprints 01–10 concluídas; sprint 11+ via OpenSpec changes
- **`.cursor/rules/engineering.mdc`** — regras técnicas (camadas, testes, DI) continuam válidas
- **Skills legadas** (`sprint-set-execution`, etc.) — substituídas por `/opsx:*` para trabalho novo

### Prioridade

```
openspec/specs/  >  legacy RN  >  padrão técnico  >  convenção
```

Ao modificar comportamento já especificado, edite via **delta spec** na change (`## MODIFIED Requirements`) e arquive com `/opsx:archive`.

---

## Próxima entrega (exemplo sprint 11)

1. Capture ideia no kanban ou diga no Cursor:
   ```
   /opsx:propose "Wire completo Valkey no FlowResolver + invalidação de schedule"
   ```
2. Revise `proposal.md` e `tasks.md` gerados
3. `/opsx:apply`
4. Testes manuais conforme critérios no `design.md`
5. `/opsx-changelog`
6. `/opsx-archive`

---

## Re-migração do legado

Se precisar regenerar specs a partir das RNs (ex.: após editar RNs legadas):

```bash
bun run openspec:migrate
```

Isso executa `scripts/migrate-to-openspec.mjs` — **sobrescreve** `openspec/specs/` e `docs/migration/rn-to-openspec-map.md`. Não use se já tiver changes ativas com deltas não arquivados.
