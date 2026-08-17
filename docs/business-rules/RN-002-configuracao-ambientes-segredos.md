# RN-002 — Configuração de ambientes e segredos

> **Status:** `Ativa`
> **Domínio:** Configuração e Segurança Operacional
> **Criada em:** 2026-04-05 | **Atualizada em:** 2026-04-05

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

A base do projeto depende de serviços externos (PostgreSQL e Valkey) e de configuração por ambiente (`dev`, `staging`, `production`). Falhas de configuração e vazamento de segredos são riscos recorrentes em fases iniciais. Esta RN cria um padrão único para variáveis de ambiente, com validação explícita e prevenção de credenciais em código.

---

## A Regra

**Toda configuração sensível ou variável de execução deve ser fornecida por ambiente, com documentação obrigatória em `.env.example` e falha explícita de bootstrap quando variáveis obrigatórias estiverem ausentes; é proibido armazenar segredos no código-fonte.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Ambiente `dev`, `staging` ou `production` | Deve carregar configuração correspondente sem hardcode |
| Variável obrigatória ausente | Inicialização deve falhar com mensagem clara indicando o nome da variável |
| Arquivo `.env.example` | Deve listar todas as variáveis necessárias sem valores reais |
| Segredo encontrado em código versionado | Mudança deve ser bloqueada e corrigida antes de merge |
| Variável opcional | Pode ter fallback seguro, desde que documentado |

---

## Exemplos

**✅ Válido:**
> `DATABASE_URL` e `REDIS_URL` são lidas de env, validadas no bootstrap, e `.env.example` contém as chaves sem credenciais reais.

**❌ Inválido:**
> String de conexão de banco hardcoded em arquivo de configuração da API.

---

## Impactos Técnicos

- **Validação:** bootstrap da aplicação, módulo de config e revisão de segurança.
- **Mensagem de erro:** `"Variável de ambiente obrigatória ausente: {NOME_DA_VARIAVEL}."`
- **Afeta:** `.env`, `.env.example`, inicialização de `apps/api`, `packages/db` e integrações de infraestrutura.

---

## Rastreabilidade

- **Solicitado por:** Engenharia de Plataforma
- **RNs relacionadas:** [RN-001](./RN-001-fundacao-tecnica-isolamento-camadas.md), [RN-003](./RN-003-observabilidade-correlation-id.md)
- **Sprints que implementaram:** [sprint-01](../sprints/sprint-01.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
