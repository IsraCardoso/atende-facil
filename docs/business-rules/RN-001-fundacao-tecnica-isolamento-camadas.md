# RN-001 — Fundação técnica e isolamento de camadas

> **Status:** `Ativa`
> **Domínio:** Arquitetura e Fundação Técnica
> **Criada em:** 2026-04-05 | **Atualizada em:** 2026-04-05

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

A Sprint 01 define a fundação técnica do produto e precisa impedir acoplamentos prematuros que dificultam manutenção e escala. Sem isolamento entre camadas, a evolução futura tende a gerar dependências circulares e alto custo de refatoração. Esta RN garante que a base do monorepo já nasça alinhada com a arquitetura hexagonal e com responsabilidades claras por módulo.

---

## A Regra

**Durante a Sprint 01, todo código deve respeitar estritamente o isolamento de camadas definido no `engineering.mdc`, e o package `flow` deve permanecer completamente puro (sem dependências de DB, HTTP, DI ou frameworks externos).**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Módulo em `domain` | Não pode importar `infrastructure`, `interface` ou libs de integração externa |
| Módulo em `application` | Pode depender apenas de `domain` |
| Módulo em `interface` | Pode depender de `application`, mas não de implementações de `infrastructure` por atalho |
| Package `flow` | Deve permanecer isolado, sem acesso a banco, HTTP, fila, DI ou variáveis de ambiente |
| Tentativa de introduzir lógica de negócio nesta sprint | Deve ser recusada e replanejada para sprint posterior |

---

## Exemplos

**✅ Válido:**
> Um use case em `application` chama uma interface de repositório definida em `domain`, e a implementação concreta fica em `infrastructure`.

**❌ Inválido:**
> Um arquivo em `domain` importa cliente do Drizzle ou um controller HTTP para executar leitura direta de banco.

---

## Impactos Técnicos

- **Validação:** revisão arquitetural por set, inspeção de imports e estrutura de pastas.
- **Mensagem de erro:** `"Violação de arquitetura: dependência entre camadas fora da Dependency Rule."`
- **Afeta:** `apps/api/src/*`, `packages/flow`, organização de workspaces e testes de fundação.

---

## Rastreabilidade

- **Solicitado por:** Engenharia de Plataforma
- **RNs relacionadas:** [RN-002](./RN-002-configuracao-ambientes-segredos.md), [RN-003](./RN-003-observabilidade-correlation-id.md)
- **Sprints que implementaram:** [sprint-01](../sprints/sprint-01.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
