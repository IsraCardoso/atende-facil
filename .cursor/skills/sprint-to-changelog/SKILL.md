---
name: sprint-to-changelog
description: Gera a entrada de changelog ao final da sprint e registra decisões técnicas quando necessário. Normalmente chamada automaticamente como Passo 3 da Cadeia de Fechamento, após code-review sem críticos — não precisa ser invocada manualmente.
---

<!-- GERADO AUTOMATICAMENTE — fonte canônica: docs/ai/ — edite lá e rode: bun run ai:sync -->

# Sprint para Changelog

## Objetivo

Transformar os resultados da sprint em documentação de fechamento rastreável. Executa como **Passo 3 e último da Cadeia de Fechamento**.

---

## Quando executa

- **Automaticamente** como Passo 3 da Cadeia de Fechamento, após `code-review` (Modo PR) sem itens 🔴 CRÍTICO
- Manualmente, quando o usuário pedir explicitamente

---

## Workflow obrigatório

1. Ler `docs/sprints/sprint-XX.md` concluída
2. Identificar tasks concluídas, ajustadas e adiadas
3. Listar decisões técnicas novas (se existirem)
4. Listar débitos técnicos gerados (se existirem)
5. Atualizar o status da sprint para `Concluída` no arquivo da sprint
6. Gerar entrada de changelog em `docs/changelog/CHANGELOG.md`
7. Se houver decisão nova, gerar arquivo `DEC-XXX` com base em `docs/decisions/_template.md`
8. **Apresentar resumo final da sprint** com opções ao usuário

---

## Formato da entrada no changelog

```markdown
## [sprint-XX] — YYYY-MM-DD

> **Objetivo:** [objetivo da sprint em uma frase]

### Adicionado
- [funcionalidade ou módulo novo — concreto e verificável]

### Alterado
- [o que mudou em algo existente] (se houver)

### Corrigido
- [bug corrigido] (se houver)

### Decisões técnicas registradas
- [DEC-XXX — Nome](../decisions/DEC-XXX-nome.md) (se houver)

### Regras de negócio implementadas
- [RN-XXX — Nome](../business-rules/RN-XXX-nome.md)

### Débitos técnicos gerados
- [ ] [descrição acionável] (se houver)
```

---

## Regras de qualidade

- Evitar textos genéricos como "melhorias gerais" — ser específico e verificável
- Não inventar DEC ou RN inexistente
- Manter links relativos corretos para `docs/decisions/` e `docs/business-rules/`

---

## Formato de saída final (encerra a Cadeia de Fechamento)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 Sprint XX encerrada com sucesso
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sets:   X/X concluídos
Tasks:  X/X aprovadas
Débitos técnicos: X (registrados no changelog)
DECs novas: X (arquivos criados)

📋 Cadeia de Fechamento executada:
  ✅ Passo 1 — refactor-pass
  ✅ Passo 2 — code-review (Modo PR) — sem críticos
  ✅ Passo 3 — sprint-to-changelog

📄 Arquivos atualizados:
  - docs/sprints/sprint-XX.md → status: Concluída
  - docs/changelog/CHANGELOG.md → entrada adicionada
  - docs/decisions/DEC-XXX.md → criado (se houver)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Próximos passos sugeridos:
  [P] Abrir PR para esta sprint
  [N] Iniciar planejamento da próxima sprint
      (use: sprint-definition-rn-flow)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Prompt-base sugerido (uso manual)

```text
Use a skill sprint-to-changelog.
Sprint alvo: [docs/sprints/sprint-XX.md]
Tasks concluídas/ajustadas/adiadas: [lista]
Decisões técnicas novas: [lista ou nenhuma]
Débitos técnicos: [lista ou nenhum]
```
