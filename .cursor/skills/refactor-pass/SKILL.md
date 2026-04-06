---
name: refactor-pass
description: Executa uma passagem de refatoração ao final da sprint para reduzir débito técnico, remover duplicação e garantir consistência. Normalmente chamada automaticamente pela Cadeia de Fechamento da sprint-set-execution — não precisa ser invocada manualmente.
---

# Refactor Pass

## Objetivo

Melhorar a qualidade do código após a implementação da sprint, sem alterar comportamento externo. Executa como **Passo 1 da Cadeia de Fechamento**, sempre antes do code review de PR.

---

## Quando executa

- **Automaticamente** como Passo 1 da Cadeia de Fechamento, disparada pela `sprint-set-execution` ao concluir o último set
- Manualmente, quando o usuário pedir explicitamente

---

## Workflow obrigatório

1. Ler o checklist final da sprint e itens marcados como débito técnico
2. Ler o resultado do `code-review` de todos os sets concluídos
3. Executar as ações de refatoração por prioridade (🔴 → 🟠 → 🟡 → 🔵)
4. Rodar `check-compiler-errors` após cada conjunto de mudanças
5. Confirmar que todos os testes continuam passando
6. Confirmar que o lint passa sem warnings
7. Apresentar relatório de mudanças
8. **Chamar automaticamente `code-review` em Modo PR** — sem aguardar instrução

---

## Ações de refatoração (por categoria)

### Duplicação
- Extrair lógica duplicada para função ou módulo compartilhado em `packages/`
- Consolidar types/interfaces similares em `packages/types`
- Unificar padrões de tratamento de erro inconsistentes

### Nomenclatura
- Renomear variáveis, funções e arquivos para refletir intenção clara
- Padronizar sufixos: `*Repository`, `*UseCase`, `*Dto`, `*Adapter`
- Remover abreviações desnecessárias

### Estrutura
- Quebrar funções longas em funções menores com responsabilidade única
- Mover lógica de negócio que vazou para camada errada
- Organizar imports: externos → packages internos → locais → tipos

### Tipos
- Substituir `string` por branded types onde for ID de domínio
- Adicionar `Readonly<>` onde dados não devem ser mutados
- Substituir `any` por `unknown` + type guard ou tipo específico

### Testes
- Extrair dados repetidos para factories
- Renomear testes para o padrão `should [resultado] when [condição]`
- Remover testes redundantes que testam o mesmo comportamento

---

## Regras invioláveis

- **Nunca alterar comportamento externo** — refactor puro, sem mudança de funcionalidade
- **Nunca mudar schema de banco** sem nova migration versionada
- **Nunca remover testes** — apenas melhorá-los
- **Parar e sinalizar** se o refactor implicar mudança de RN ou contrato de API

---

## Formato de saída

```
🔄 Refactor Pass — Sprint XX

  📦 Duplicação removida:    [o que foi consolidado] (ou "Nenhuma")
  📝 Nomenclatura:           [o que foi renomeado]   (ou "Nenhuma")
  🏗️ Estrutura:              [o que foi reorganizado] (ou "Nenhuma")
  🔷 Tipos:                  [o que foi melhorado]   (ou "Nenhum")
  🧪 Testes:                 [o que foi ajustado]    (ou "Nenhum")

  ✅ Testes: passando
  ✅ Lint: sem warnings
  ✅ Comportamento externo: inalterado

  Débitos eliminados:  [lista]
  Débitos remanescentes (precisam de sprint própria): [lista]

→ Avançando automaticamente para code-review (Modo PR)...
```
