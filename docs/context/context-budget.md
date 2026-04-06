# Context Budget e Orquestracao de Subagentes

Guia operacional para evitar estouro de contexto durante analise, implementacao e revisao.

---

## Objetivo

Padronizar como a IA explora codigo, decide abordagem e executa mudancas com baixo consumo de tokens e alta rastreabilidade.

---

## Quando aplicar

- Escopo inicial nao claro
- Investigacao em multiplas pastas/modulos
- Arquivos longos (docs, logs, specs extensas)
- Tarefas com risco de "thrash" de leitura

---

## Fluxo com gate obrigatorio

```text
Mapear -> Decidir -> Executar
```

### 1) Mapear

- Buscar candidatos via busca textual/semantica antes de leitura ampla.
- Se o escopo for amplo, usar subagente de exploracao (`explore`) em modo `quick`.
- Nao abrir arquivo longo inteiro sem evidencias de relevancia.

**Saida obrigatoria (contrato curto, max 6 linhas):**

```text
arquivos-alvo: [ate 5 caminhos]
hipotese: [1 frase]
risco: [opcional, 1 frase]
proximo-passo: [1 frase]
```

### 2) Decidir

- Escolher uma abordagem principal.
- Declarar escopo exato de arquivos a editar.
- Definir validacoes minimas para concluir a tarefa.

**Saida obrigatoria (contrato curto, max 6 linhas):**

```text
decisao: [1 frase]
escopo: [arquivos que serao alterados]
validacao: [ate 3 checks]
proximo-passo: [1 frase]
```

### 3) Executar

- Implementar somente no escopo definido.
- Rodar verificacoes proporcionais ao impacto (lint/testes).
- Reportar resultado de forma curta, sem copiar blocos longos desnecessarios.

**Saida obrigatoria (contrato curto, max 8 linhas):**

```text
arquivos-alterados: [lista curta]
resultado-validacao: [lint/testes]
pendencias: [uma linha ou "nenhuma"]
proximo-passo: [1 frase]
```

---

## Regras de orcamento de contexto

- Nao ler arquivo inteiro com mais de 200 linhas sem justificativa.
- Ler em fatias de 120 a 180 linhas por vez.
- A cada 3 leituras, sintetizar antes de abrir novo bloco.
- Evitar releitura sem nova hipotese.
- Evitar misturar contexto irrelevante no mesmo ciclo.

---

## Regras de uso de subagentes

- Maximo de 2 subagentes por rodada.
- Cada subagente recebe um unico objetivo.
- Cada retorno deve respeitar o contrato curto da etapa.
- Nao usar subagente para tarefa "agulha no palheiro" simples (ex.: localizar um simbolo especifico).

---

## Prompt base (copiar e colar)

```text
Ative modo baixo contexto.

Siga o fluxo com gates obrigatorios:
1) Mapear
2) Decidir
3) Executar

Regras:
- nao ler arquivo >200 linhas integralmente sem justificativa;
- ler em fatias de 120-180 linhas;
- no maximo 2 subagentes por rodada;
- retornar contratos de saida curtos em cada etapa.
```

