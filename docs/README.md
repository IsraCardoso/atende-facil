# Spec Driven Development — Fluxo com Skills

Sistema de documentação e execução de sprint orientado a IA, com rastreabilidade e checkpoints.

---

## Objetivo

Permitir que você atue como guia de produto/negócio enquanto a IA faz toda a execução técnica, com controle de escopo por sprint, set e task.

---

## Fluxo oficial (skills-first)

### Fase 1 — Planejamento (manual)
```
Você instrui → sprint-definition-rn-flow faz perguntas de clarificação
             → preenche a doc da sprint
             → aguarda sua aprovação explícita
             → cria RNs em docs/business-rules/
```

### Fase 2 — Execução (automática por set)
```
Você instrui → sprint-set-execution executa SET-A
             → code-review (Modo SET) ← automático
             → checkpoint apresentado
             → você decide: [A] ajustar / [C] continuar / [K] commit

             → sprint-set-execution executa SET-B
             → code-review (Modo SET) ← automático
             → checkpoint apresentado
             → você decide: [A] / [C] / [K]

             → ... (repete por set)
```

### Fase 3 — Fechamento (totalmente automático após o último set)
```
Último set concluído
  → Passo 1: refactor-pass          ← automático
  → Passo 2: code-review (Modo PR)  ← automático
      ↳ se 🔴 CRÍTICO: corrige e repete ← automático
  → Passo 3: sprint-to-changelog    ← automático
  → Resumo final apresentado

Você decide: [P] abrir PR / [N] planejar próxima sprint
```

> **Você só intervém em:** aprovação da sprint, decisões de ajuste nos checkpoints de set (`[A]`/`[C]`/`[K]`) e a ação final após o fechamento. Todo o resto é automático.

---

## Estrutura principal

```
.
├── .cursor/
│   ├── rules/engineering.mdc              ← lida pela IA em toda execução
│   └── skills/
│       ├── sprint-definition-rn-flow/     ← planejar sprint (Fase 1)
│       ├── sprint-set-execution/          ← executar sets + disparar cadeia (Fase 2 e 3)
│       ├── code-review/                   ← review por set e por PR (automático)
│       ├── refactor-pass/                 ← cleanup pós-sprint (automático)
│       ├── sprint-to-changelog/           ← fechar sprint (automático)
│       ├── text-to-business-rule/         ← criar RNs (Fase 1)
│       └── dont-be-greedy/               ← controle de contexto/tokens (sempre)
│
└── docs/
    ├── context/project.md                 ← fonte de verdade do projeto
    ├── business-rules/                    ← RNs aprovadas e ativas
    ├── sprints/                           ← specs de cada sprint
    ├── guides/                            ← dev local e deploy produção
    ├── decisions/                         ← ADRs (Architecture Decision Records)
    └── changelog/CHANGELOG.md
```

---

## Skills oficiais

| Skill | Quando executa | Quem dispara |
|---|---|---|
| `sprint-definition-rn-flow` | Planejamento da sprint | Você |
| `sprint-set-execution` | Execução set a set | Você (uma vez por sprint) |
| `code-review` | Após cada set e após refactor-pass | **Automático** |
| `refactor-pass` | Após o último set | **Automático** |
| `sprint-to-changelog` | Após code-review PR sem críticos | **Automático** |
| `text-to-business-rule` | Criar/refinar RNs após aprovação da sprint | Você ou automático na Fase 1 |
| `dont-be-greedy` | Ao trabalhar com arquivos grandes | Automático (regra interna) |

---

## Regras operacionais essenciais

- Não criar/alterar RN antes de aprovação explícita da sprint
- Não executar sets fora da ordem do plano
- Não misturar sets paralelos na mesma sessão do Cursor
- Não commitar sem solicitação explícita (`[K]`)
- `code-review` e `refactor-pass` são automáticos — nunca pular
- Prioridade absoluta: RN > padrão técnico > convenção de código
- Tipagem forte e específica é obrigatória em todo código novo (evitar `string` genérica para conceitos semânticos)
- Sempre que um débito técnico for resolvido, atualizar a documentação e marcar como resolvido (`[x]`) no changelog/sprint
- Documento de entrega da sprint deve conter seção `Testes Manuais de Entrega (Passo a Passo Executável)` com pré-requisitos, passos e resultados esperados

Referência completa: `.cursor/rules/engineering.mdc`

---

## Protocolo de contexto e subagentes (baixo consumo)

Use este protocolo quando houver risco de estouro de contexto, escopo desconhecido ou investigação em múltiplos módulos.

### Etapas com gate
```text
Mapear  ->  Decidir  ->  Executar
```

- **Mapear:** localizar arquivos/símbolos candidatos e formular hipótese inicial
- **Decidir:** fechar abordagem e escopo de edição antes de codar
- **Executar:** implementar e validar sem expandir escopo sem novo gate

### Contratos de saída curtos (obrigatórios)

- **Mapear (máx 6 linhas):**
  - `arquivos-alvo` (até 5 caminhos)
  - `hipotese` (1 frase)
  - `risco` (opcional)
  - `proximo-passo` (1 frase)
- **Decidir (máx 6 linhas):**
  - `decisao` (1 frase)
  - `escopo` (arquivos que serão alterados)
  - `validacao` (até 3 checks)
  - `proximo-passo` (1 frase)
- **Executar (máx 8 linhas):**
  - `arquivos-alterados`
  - `resultado-validacao`
  - `pendencias`
  - `proximo-passo`

### Regras práticas

- Arquivo grande: ler em fatias (120 a 180 linhas), não inteiro por padrão
- A cada 3 leituras, resumir antes de continuar
- Subagentes: no máximo 2 por rodada, cada um com objetivo único
- Saída de subagente deve ser curta e no formato do contrato da etapa

Referência detalhada: `docs/context/context-budget.md`

---

## Onboarding rápido (primeiro uso)

1. Preencha `docs/context/project.md` com a stack e estrutura real do projeto
2. Use `sprint-definition-rn-flow` para criar a primeira sprint
3. Revise e aprove a sprint explicitamente
4. Instrua: `"Use a skill sprint-set-execution. Sprint alvo: docs/sprints/sprint-01.md"`
5. A IA executa set a set, com review automático após cada um
6. Ao finalizar o último set, a Cadeia de Fechamento roda automaticamente
7. Você decide: `[P]` abrir PR ou `[N]` planejar próxima sprint
