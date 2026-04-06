---
name: sprint-definition-rn-flow
description: Estrutura e preenche a documentação da próxima sprint a partir do briefing do usuário, faz perguntas de clarificação, aguarda aprovação explícita e só então cria/atualiza as regras de negócio. Use quando o usuário pedir para planejar sprint, montar sprint, definir escopo, ou organizar RNs da sprint.
---

# Definição de Sprint e Fluxo de RN

## Objetivo

Padronizar o fluxo de documentação da sprint com gate de aprovação antes de qualquer transferência de RN.

## Workflow obrigatório

1. Ler `docs/sprints/_template.md` e usar como base para a nova sprint.
2. Receber briefing inicial do usuário (descrição, objetivo, escopo, restrições).
3. Fazer de 4 a no máximo 16 perguntas de clarificação objetivas com breve explicação das opçoes e trade-offs,antes de preencher a sprint.
4. Preencher a doc da sprint com:
   - objetivo, entregáveis, fora do escopo, métricas;
   - plano de execução com sets, dependências e paralelismo;
   - tasks com contexto, "o que fazer", critérios de aceite e notas técnicas.
5. Solicitar aprovação explícita da sprint.
6. Somente após aprovação explícita:
   - mapear as RNs citadas na sprint;
   - criar/atualizar arquivos em `docs/business-rules/`;
   - garantir links de rastreabilidade entre sprint, RN e changelog.

## Eficiência de contexto (tokens)

- Se o briefing for extenso, usar `dont-be-greedy` para resumir e extrair apenas informações úteis antes de preencher a sprint.
- Evitar copiar blocos longos de texto bruto para dentro da doc da sprint.

## Gating de contexto (mapear -> decidir -> executar)

Quando o briefing vier amplo ou ambíguo, executar com gates:

1. **Mapear (gate)**: identificar tópicos obrigatórios, lacunas e riscos.
2. **Decidir (gate)**: fechar estrutura da sprint e plano de perguntas.
3. **Executar**: preencher a sprint com escopo controlado e rastreável.

### Contratos de saída curtos por etapa

- **Mapear** (máx 6 linhas): `arquivos-alvo`, `hipotese`, `risco` (opcional), `proximo-passo`
- **Decidir** (máx 6 linhas): `decisao`, `escopo`, `validacao` (até 3 checks), `proximo-passo`
- **Executar** (máx 8 linhas): `arquivos-alterados`, `resultado-validacao`, `pendencias`, `proximo-passo`

### Regras adicionais

- Não ler arquivo inteiro com mais de 200 linhas sem justificativa.
- Ler em blocos de 120 a 180 linhas quando necessário.
- Se usar subagentes para triagem, limitar a 2 por rodada com objetivo único.

## Gate de aprovação (obrigatório)

- Antes da aprovação explícita, é proibido criar ou alterar RNs.
- Se o usuário pedir RN antes da aprovação, confirmar que primeiro precisa aprovar a sprint.

## Regras de tamanho das RNs

- Cada RN deve ser curta e objetiva, preferencialmente cabendo em uma página.
- Se a RN ficar extensa, quebrar em RNs irmãs por cenário/domínio.
- Evitar múltiplas decisões independentes dentro da mesma RN.

## Checklist de qualidade

- [ ] Sprint segue `docs/sprints/_template.md`
- [ ] Há plano de execução por sets com dependências claras
- [ ] Perguntas de clarificação foram feitas antes da escrita final
- [ ] Aprovação explícita foi registrada antes de mexer em RN
- [ ] RNs estão curtas, sem escopo excessivo
- [ ] Links entre sprint, RN e changelog estão consistentes
- [ ] Gating de contexto aplicado quando necessário
- [ ] Contratos de saída curtos utilizados por etapa

## Prompt-base sugerido (uso do usuário)

```text
Use a skill sprint-definition-rn-flow.
Quero criar a sprint [NOME].
Descrição: [descrição]
Objetivo: [objetivo]
Restrições: [restrições]
Contexto adicional: [detalhes]
```
