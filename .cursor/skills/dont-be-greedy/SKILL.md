---
name: dont-be-greedy
description: Controla consumo de contexto em arquivos grandes. Use quando houver logs, CSV/JSON grandes, markdowns extensos ou qualquer arquivo potencialmente custoso em tokens para evitar overflow, lentidão e alucinação.
---

<!-- GERADO AUTOMATICAMENTE — fonte canônica: docs/ai/ — edite lá e rode: bun run ai:sync -->

# Não Seja Guloso com Contexto

## Objetivo

Evitar estouro de janela de contexto e manter respostas precisas ao trabalhar com arquivos grandes.

## Quando aplicar

- Arquivos com muitas linhas (ex.: docs longas, logs, relatórios).
- Múltiplos arquivos grandes no mesmo pedido.
- Qualquer situação em que carregar tudo de uma vez não é necessário.

## Estratégia padrão

1. Descobrir o mínimo necessário:
   - usar busca semântica ou busca textual para localizar trechos relevantes;
   - evitar leitura integral sem filtro inicial.
2. Ler em fatias:
   - preferir leitura com `offset` e `limit`;
   - priorizar trechos próximos de símbolos, títulos ou erros citados.
3. Resumir antes de aprofundar:
   - produzir síntese curta do trecho lido;
   - só expandir leitura quando houver evidência de relevância.
4. Trabalhar incrementalmente:
   - explorar -> resumir -> decidir próximo bloco.

## Protocolo com gates (obrigatório em tarefas amplas)

Quando o escopo for difuso ou tocar múltiplos módulos, seguir:

1. **Mapear (gate)**:
   - identificar arquivos-alvo por busca;
   - evitar leitura ampla sem evidência.
2. **Decidir (gate)**:
   - declarar abordagem e escopo exato;
   - definir validação mínima antes de editar.
3. **Executar**:
   - implementar apenas no escopo decidido;
   - validar e reportar de forma curta.

## Contratos de saída curtos

- **Mapear** (máx 6 linhas): `arquivos-alvo`, `hipotese`, `risco` (opcional), `proximo-passo`
- **Decidir** (máx 6 linhas): `decisao`, `escopo`, `validacao` (até 3 checks), `proximo-passo`
- **Executar** (máx 8 linhas): `arquivos-alterados`, `resultado-validacao`, `pendencias`, `proximo-passo`

## Regras obrigatórias

- Não carregar arquivos grandes integralmente sem necessidade explícita.
- Não repetir leituras iguais sem ganho de informação.
- Não misturar contexto irrelevante no mesmo ciclo de raciocínio.
- Sempre citar caminhos de arquivo para rastreabilidade.

## Sinais de risco de overflow

- Você já leu muitos blocos longos e ainda não convergiu.
- A resposta começa a perder precisão sobre nomes/arquivos.
- O pedido exige comparar várias fontes extensas ao mesmo tempo.

Nesses casos: pare, resuma o que já foi validado e prossiga em blocos menores.

## Checklist rápido

- [ ] Fiz busca inicial antes de ler blocos longos
- [ ] Li apenas trechos necessários
- [ ] Resumi cada bloco antes de abrir o próximo
- [ ] Mantive rastreabilidade de arquivos e decisões
- [ ] Evitei carregar contexto irrelevante
- [ ] Segui gates de mapear -> decidir -> executar quando o escopo era amplo
- [ ] Entreguei contratos de saída curtos por etapa
