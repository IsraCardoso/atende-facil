# Sprint XX — [Nome da Sprint]

> **Período:** DD/MM até DD/MM | **Status:** `Planejamento` | `Em andamento` | `Concluída`

---

# 📋 GESTÃO

## Objetivo da Sprint

> *Uma frase: o que o usuário vai conseguir fazer ao final que não conseguia antes?*

[Descreva o valor entregue.]

---

## Fluxo oficial de documentação (IA)

1. O usuário informa descrição e detalhes da próxima sprint.
2. A IA faz perguntas de clarificação (somente o necessário) e preenche esta doc de sprint.
3. O usuário revisa e aprova a sprint.
4. Somente após aprovação, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** não transferir nem detalhar RNs antes da aprovação explícita da sprint.

---

## Entregáveis

| # | Entregável | Critério de conclusão |
|---|---|---|
| 1 | [Nome] | [Como saber que está pronto — perspectiva do usuário] |
| 2 | [Nome] | [Como saber que está pronto] |

---

## Regras de Negócio desta Sprint

- [RN-XXX — Nome](../business-rules/RN-XXX-nome.md)

---

## Fora do Escopo

- ❌ [Item explicitamente fora]
- ❌ [Item explicitamente fora]

---

## Métricas de Sucesso

- [ ] [Métrica mensurável 1]
- [ ] [Métrica mensurável 2]

---

# ⚙️ ENGENHARIA

> **Instrução para a IA:** Leia o Plano de Execução antes de começar. Execute um set por vez. Após cada set, apresente o checkpoint e aguarde instrução do usuário.
> **Eficiência de contexto:** Quando houver docs longas, logs ou múltiplos arquivos grandes, usar `dont-be-greedy` para leitura incremental antes de expandir análise.

---

## Plano de Execução

```
Rodada 1:  [SET-A: Nome]
Rodada 2:  [SET-B: Nome] ║ [SET-C: Nome]     (paralelos — sessões independentes)
Rodada 3:  [SET-D: Nome]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02 | — | — |
| SET-B | T03, T04 | SET-A | SET-C |
| SET-C | T05 | SET-A | SET-B |
| SET-D | T06, T07 | SET-B, SET-C | — |

> **Critério de paralelismo:** dois sets são paralelos quando não compartilham arquivos e não dependem um do outro. A IA nunca executa sets paralelos na mesma sessão.

---

## SET-A — [Nome do Set]

> 🎯 **Escopo estimado:** ~XXX linhas | **Complexidade:** Baixa / Média / Alta
> **Racional:** [Por que estas tasks foram agrupadas — o que elas têm em comum]

---

### T01 — [Nome da Task]

**Contexto:** [Por que existe e o que desbloqueia.]

**O que fazer:**
- [ ] [Ação atômica e específica]
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável por teste ou inspeção]
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Decisão de arquitetura, lib, padrão, armadilha. Perguntas em aberto se houver.]

---

### T02 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

## SET-B — [Nome do Set]

> 🎯 **Escopo estimado:** ~XXX linhas | **Complexidade:** Baixa / Média / Alta
> **Racional:** [Por que estas tasks foram agrupadas]

---

### T03 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

### T04 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

## SET-C — [Nome do Set] *(paralelo com SET-B)*

> 🎯 **Escopo estimado:** ~XXX linhas | **Complexidade:** Baixa / Média / Alta
> **Racional:** [Por que está separado de SET-B — sem dependência de arquivos]

---

### T05 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

## SET-D — [Nome do Set]

> 🎯 **Escopo estimado:** ~XXX linhas | **Complexidade:** Baixa / Média / Alta
> **Racional:** [Por que estas tasks foram agrupadas]

---

### T06 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

### T07 — [Nome da Task]

**Contexto:** [Por que existe.]

**O que fazer:**
- [ ] [Ação atômica]

**Critérios de Aceite:**
- [ ] [Comportamento verificável]

**Notas técnicas:**
> [Informações relevantes]

---

## Testes Manuais de Entrega (Passo a Passo Executável)

> **Obrigatório para considerar a sprint entregue.**
> Descreva passos reais e executáveis (sem frases vagas), com resultado esperado por passo.

### Cenário 1 — [Nome do cenário]

**Objetivo:** [O que este teste comprova]

**Pré-requisitos:**
- [ ] [Ex.: Docker em execução]
- [ ] [Ex.: variáveis de ambiente configuradas]

**Passo a passo executável:**
1. [Comando/ação exata]
   - **Resultado esperado:** [Saída, status ou comportamento esperado]
2. [Comando/ação exata]
   - **Resultado esperado:** [Saída, status ou comportamento esperado]
3. [Comando/ação exata]
   - **Resultado esperado:** [Saída, status ou comportamento esperado]

**Critério de aprovação do cenário:**
- [ ] [Condição objetiva para considerar este cenário aprovado]

---

### Cenário 2 — [Nome do cenário]

**Objetivo:** [O que este teste comprova]

**Pré-requisitos:**
- [ ] [Pré-requisito]

**Passo a passo executável:**
1. [Comando/ação exata]
   - **Resultado esperado:** [Saída, status ou comportamento esperado]
2. [Comando/ação exata]
   - **Resultado esperado:** [Saída, status ou comportamento esperado]

**Critério de aprovação do cenário:**
- [ ] [Condição objetiva para considerar este cenário aprovado]

---

## Checklist Final da Sprint

- [ ] Todos os sets concluídos e aprovados
- [ ] Todos os critérios de aceite validados
- [ ] Seção `Testes Manuais de Entrega (Passo a Passo Executável)` preenchida, executável e detalhada
- [ ] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [ ] Decisões técnicas novas registradas em `docs/decisions/`
- [ ] Sem débito técnico não documentado
- [ ] Débitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolução
- [ ] RNs respeitadas em toda implementação
