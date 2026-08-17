# RN-003 — Observabilidade mínima com correlationId

> **Status:** `Ativa`
> **Domínio:** Observabilidade e Operação
> **Criada em:** 2026-04-05 | **Atualizada em:** 2026-04-05

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

Sem padronização de logs, incidentes de infraestrutura e integração são difíceis de diagnosticar. Na Sprint 01, ainda sem lógica de negócio, a observabilidade precisa focar em rastreabilidade técnica da requisição e falhas de bootstrap. Esta RN define o padrão mínimo para logs estruturados em JSON com `correlationId`.

---

## A Regra

**Toda entrada de log operacional em runtime deve ser estruturada em JSON e incluir `correlationId`; em fluxo HTTP, o `correlationId` deve ser gerado na borda da requisição e propagado durante o processamento, sendo proibido uso direto de `console.log`.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Requisição HTTP recebida | Gerar ou reutilizar `correlationId` e anexar aos logs do request |
| Logs durante processamento da mesma requisição | Manter o mesmo `correlationId` |
| Eventos de bootstrap sem contexto HTTP | Usar `correlationId` técnico estável (ex.: `system`) |
| Erro operacional | Logar com `level` apropriado e contexto mínimo para diagnóstico |
| Uso de `console.log` em código de runtime | Deve ser substituído por logger estruturado |

---

## Exemplos

**✅ Válido:**
> `{"timestamp":"...","level":"info","message":"healthcheck request","correlationId":"req-abc123","context":{"path":"/health"}}`

**❌ Inválido:**
> `console.log("erro ao conectar no banco", err)`

---

## Impactos Técnicos

- **Validação:** middleware de borda HTTP, utilitário de logger e regras de lint.
- **Mensagem de erro:** `"Uso de log inválido: utilize logger estruturado com correlationId."`
- **Afeta:** `apps/api` (request lifecycle), `apps/worker` (logs operacionais), padrão de logging do monorepo.

---

## Rastreabilidade

- **Solicitado por:** Engenharia de Plataforma
- **RNs relacionadas:** [RN-001](./RN-001-fundacao-tecnica-isolamento-camadas.md), [RN-002](./RN-002-configuracao-ambientes-segredos.md)
- **Sprints que implementaram:** [sprint-01](../sprints/sprint-01.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
