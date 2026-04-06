---
name: code-review
description: Realiza code review estruturado por severidade após cada set e ao final da sprint (antes do PR). Normalmente chamada automaticamente pela skill sprint-set-execution e pela Cadeia de Fechamento — não precisa ser invocada manualmente pelo usuário.
---

# Code Review Avançado

## Objetivo

Garantir qualidade máxima antes de avançar. O review é parte **automática** do fluxo — executado pela `sprint-set-execution` após cada set, e pela Cadeia de Fechamento ao final da sprint.

---

## Modos de execução

### Modo SET (chamado automaticamente após cada set)
- Escopo: código produzido no set atual
- Saída: inline no checkpoint do set
- Próximo passo automático: retornar ao checkpoint e apresentar opções `[A]`, `[C]`, `[K]`
- **Se houver itens 🔴 CRÍTICO:** listar e aguardar correção antes de apresentar as opções

### Modo PR / Sprint (chamado automaticamente pela Cadeia de Fechamento)
- Escopo: toda a sprint
- Saída: relatório consolidado
- Próximo passo automático:
  - **Se houver itens 🔴 CRÍTICO:** corrigir → repetir review → só então chamar `sprint-to-changelog`
  - **Se não houver críticos:** chamar automaticamente `sprint-to-changelog`

---

## Níveis de severidade

### 🔴 CRÍTICO — bloqueia avanço
Deve ser corrigido antes de continuar para o próximo set ou fechar a sprint.

- Bugs que causam comportamento incorreto em produção
- Falhas de segurança (injeção, exposição de dados, bypass de autenticação)
- Quebra de regra de negócio documentada
- Vazamento de camada arquitetural (ex: SQL no controller, HTTP no domain)
- Dados de tenant sem isolamento (`tenant_id` ausente ou não filtrado)

### 🟠 ALTO — corrigir na sprint
Deve ser resolvido ainda na sprint; pode avançar o set mas não fechar a sprint sem resolução.

- N+1 queries óbvias
- Código impossível de testar sem refatoração
- Tipagem fraca (`any`, assertions desnecessários)
- Lógica de negócio duplicada
- Missing index em campo crítico

### 🟡 MÉDIO — registrar como débito se não corrigir agora
Pode avançar, mas deve ser registrado no checklist final da sprint.

- Nomes de variáveis ou funções confusos
- Função com mais de uma responsabilidade clara
- Ausência de tratamento de edge case não crítico

### 🔵 BAIXO — sugestão
Sem impacto em funcionalidade ou manutenção.

- Simplificações de estilo
- Renomeações menores
- Ordem de imports

---

## Checklist (aplicado em ambos os modos)

### Arquitetura
- [ ] Regras de dependência entre camadas respeitadas
- [ ] Use cases com responsabilidade única
- [ ] Domínio sem dependências externas
- [ ] Repositórios expondo linguagem de domínio (não SQL)

### Tipagem e qualidade
- [ ] Zero `any` — sem exceções
- [ ] Sem type assertions desnecessários
- [ ] DTOs distintos das entidades de domínio

### Multi-tenant e segurança
- [ ] `tenant_id` presente e filtrado em todas as queries
- [ ] `tenant_id` extraído do token, nunca do body
- [ ] Inputs validados antes de chegar ao use case
- [ ] Dados sensíveis ausentes dos logs

### Testes
- [ ] 100% de cobertura nos use cases e entidades modificados
- [ ] Testes cobrem caminho feliz, erros e edge cases
- [ ] Factories usadas para dados de teste

### Performance
- [ ] Nenhum N+1 introduzido
- [ ] Queries em coleções têm paginação
- [ ] Campos filtrados com frequência têm índice

### Eventos
- [ ] Eventos publicados após persistência bem-sucedida
- [ ] Consumers idempotentes
- [ ] Nomes de eventos no passado

### Lint
- [ ] Biome passa sem warnings
- [ ] `console.log` ausente — apenas logger estruturado

---

## Formato de saída — Modo SET (inline no checkpoint)

```
🔍 Code Review — SET-X:
  🔴 CRÍTICO:  [item] → [arquivo] → [correção]   (ou "Nenhum")
  🟠 ALTO:     [item] → [arquivo] → [correção]   (ou "Nenhum")
  🟡 MÉDIO:    [item] → registrado como débito   (ou "Nenhum")
  🔵 BAIXO:    [sugestão]                        (ou "Nenhum")
```

→ Se 🔴 CRÍTICO presente: corrigir antes de apresentar `[A]` `[C]` `[K]`
→ Se sem críticos: apresentar opções normalmente

---

## Formato de saída — Modo PR / Sprint

```
🔍 Code Review Final — Sprint XX

🔴 CRÍTICO (X — bloqueiam fechamento):
  1. [descrição] — [arquivo:linha] — [correção sugerida]

🟠 ALTO (X — resolver antes do merge):
  1. [descrição] — [arquivo:linha] — [correção sugerida]

🟡 MÉDIO (X — registrados como débito):
  1. [descrição]

🔵 BAIXO (X — sugestões):
  1. [descrição]

📋 Débitos técnicos para próximas sprints:
  - [ ] [descrição acionável]
```

→ Se 🔴 CRÍTICO presente: corrigir → repetir review
→ Se sem críticos: chamar automaticamente `sprint-to-changelog`
