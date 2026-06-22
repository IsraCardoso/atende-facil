# Execução de Sprint por Sets

## Objetivo

Executar a sprint com previsibilidade, rastreabilidade e controle por checkpoint. O fluxo é **maximamente automático**: após cada set, o code review é executado sem precisar ser solicitado. Ao final do último set, a cadeia de fechamento completa é disparada automaticamente.

---

## Workflow obrigatório

1. Ler a sprint ativa em `docs/sprints/`.
2. Ler o Plano de Execução e identificar o próximo set elegível.
3. Ler as RNs referenciadas na sprint em `docs/business-rules/`.
4. Implementar todas as tasks do set em sequência. É importante também já adicionar testes unitários a cada set para garantir que esse set fique defendido das alterações no próximo set, ajudando a gente a avaliar se faz sentido quando um teste quebra ou se não faz sentido e há algum erro de código.
5. Realizar auto-revisão interna do set inteiro:
   - cobertura dos itens "O que fazer";
   - critérios de aceite;
   - conformidade com RNs;
   - ausência de efeitos colaterais fora do escopo.
6. Executar verificação de erros de compilação.
7. **Executar automaticamente a skill `code-review` com escopo do set atual** — sem aguardar pedido do usuário.
8. Publicar checkpoint completo (implementação + code review) no formato padrão definido em `docs/ai/engineering.md`.
9. **Verificar se é o último set da sprint:**
   - **Não é o último:** aguardar instrução `[A]`, `[C]` ou `[K]` e continuar normalmente.
   - **É o último:** executar automaticamente a **Cadeia de Fechamento** (ver abaixo) antes de apresentar as opções finais.

---

## Cadeia de Fechamento de Sprint (automática após o último set)

Ao identificar que o set concluído é o **último do Plano de Execução**, executar em sequência — sem aguardar instrução do usuário entre os passos:

```
Passo 1 → skill refactor-pass        (escopo: sprint completa)
Passo 2 → skill code-review          (escopo: sprint completa / nível PR)
Passo 3 → skill sprint-to-changelog
```

**Regra de avanço entre passos:** cada passo só avança se o anterior não tiver itens 🔴 CRÍTICO pendentes.
Se houver críticos: corrigir → repetir o passo → só então avançar.

Apresentar o resultado consolidado da cadeia inteira **antes** de exibir as opções finais ao usuário.

---

## Regras de paralelismo

- Se o plano indicar sets paralelos, não misturar ambos na mesma sessão.
- Encerrar o set atual e informar explicitamente que o set paralelo deve ser feito em outra sessão.

---

## Regras de segurança e escopo

- Nunca quebrar RN para simplificar implementação.
- Nunca avançar de set para set sem instrução `[C]` ou `[K]` — exceto na Cadeia de Fechamento.
- Nunca fazer commit sem pedido explícito (`[K]`).

---

## Eficiência de contexto (tokens)

- Aplicar `dont-be-greedy` em análise de arquivos longos antes de leitura ampla.
- Ler apenas trechos necessários e expandir por evidência.

## Gating de contexto (mapear -> decidir -> executar)

Em tasks com escopo incerto ou impacto em múltiplos arquivos, aplicar gates explícitos:

1. **Mapear (gate)**: localizar arquivos-alvo e hipótese técnica inicial.
2. **Decidir (gate)**: fechar abordagem e escopo de edição antes de codar.
3. **Executar**: implementar, validar e reportar resultado.

### Contratos de saída curtos por etapa

- **Mapear** (máx 6 linhas): `arquivos-alvo`, `hipotese`, `risco` (opcional), `proximo-passo`
- **Decidir** (máx 6 linhas): `decisao`, `escopo`, `validacao` (até 3 checks), `proximo-passo`
- **Executar** (máx 8 linhas): `arquivos-alterados`, `resultado-validacao`, `pendencias`, `proximo-passo`

### Regras adicionais

- Não ler arquivo inteiro com mais de 200 linhas sem justificativa.
- Ler arquivos longos em fatias de 120 a 180 linhas.
- Se usar subagentes, limitar a 2 por rodada, cada um com objetivo único.

---

## Checklist de qualidade por set

- [ ] Set anunciado com tasks corretas
- [ ] Todas as tasks implementadas
- [ ] Critérios de aceite revisados e reportados
- [ ] Verificação de erros de compilação executada
- [ ] `code-review` executado automaticamente (escopo: set)
- [ ] Checkpoint apresentado com resultado do review incluso
- [ ] Se último set: Cadeia de Fechamento executada automaticamente
- [ ] Gating de contexto aplicado quando necessário
- [ ] Contratos de saída curtos reportados por etapa

---

## Prompt-base sugerido

```text
Use a skill sprint-set-execution.
Sprint alvo: [arquivo da sprint]
Comece no [SET-X] e siga até checkpoint.
```
