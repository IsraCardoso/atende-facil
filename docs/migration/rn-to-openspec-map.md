# Mapa de Rastreabilidade: RN → OpenSpec

> Gerado por `scripts/migrate-to-openspec.mjs`. Não editar IDs legacy manualmente.

| RN legada | Capability OpenSpec | Arquivo spec | Arquivo legado |
|-----------|---------------------|--------------|----------------|
| RN-001 | `architecture-foundation` | `openspec/specs/architecture-foundation/spec.md` | `docs/business-rules/RN-001-fundacao-tecnica-isolamento-camadas.md` |
| RN-002 | `configuration` | `openspec/specs/configuration/spec.md` | `docs/business-rules/RN-002-configuracao-ambientes-segredos.md` |
| RN-003 | `observability` | `openspec/specs/observability/spec.md` | `docs/business-rules/RN-003-observabilidade-correlation-id.md` |
| RN-004 | `multi-tenant` | `openspec/specs/multi-tenant/spec.md` | `docs/business-rules/RN-004-identidade-isolamento-tenant-token.md` |
| RN-005 | `authentication` | `openspec/specs/authentication/spec.md` | `docs/business-rules/RN-005-autenticacao-jwt-bearer-seguranca.md` |
| RN-006 | `authorization` | `openspec/specs/authorization/spec.md` | `docs/business-rules/RN-006-rbac-autorizacao-endpoints.md` |
| RN-007 | `architecture-foundation` | `openspec/specs/architecture-foundation/spec.md` | `docs/business-rules/RN-007-ports-adapters-services-cache-logs.md` |
| RN-008 | `flow-engine` | `openspec/specs/flow-engine/spec.md` | `docs/business-rules/RN-008-flow-engine-puro-deterministico.md` |
| RN-009 | `flow-engine` | `openspec/specs/flow-engine/spec.md` | `docs/business-rules/RN-009-semantica-nos-transicao-sessao.md` |
| RN-010 | `flow-engine` | `openspec/specs/flow-engine/spec.md` | `docs/business-rules/RN-010-validacao-fluxo-ativacao-segura.md` |
| RN-011 | `whatsapp-integration` | `openspec/specs/whatsapp-integration/spec.md` | `docs/business-rules/RN-011-whatsapp-provider-agnostico.md` |
| RN-012 | `whatsapp-integration` | `openspec/specs/whatsapp-integration/spec.md` | `docs/business-rules/RN-012-webhook-idempotencia-lock-sessao.md` |
| RN-013 | `chatwoot-integration` | `openspec/specs/chatwoot-integration/spec.md` | `docs/business-rules/RN-013-integracao-chatwoot-handoff-humano.md` |
| RN-014 | `conversations` | `openspec/specs/conversations/spec.md` | `docs/business-rules/RN-014-conversation-entity-transicoes-estado.md` |
| RN-015 | `domain-events` | `openspec/specs/domain-events/spec.md` | `docs/business-rules/RN-015-sistema-eventos-dominio-valkey-pubsub.md` |
| RN-016 | `chatwoot-integration` | `openspec/specs/chatwoot-integration/spec.md` | `docs/business-rules/RN-016-chatwoot-webhook-reverso-sincronizacao.md` |
| RN-017 | `chatwoot-integration` | `openspec/specs/chatwoot-integration/spec.md` | `docs/business-rules/RN-017-inbox-chatwoot-embutido-fallback.md` |
| RN-018 | `conversations` | `openspec/specs/conversations/spec.md` | `docs/business-rules/RN-018-endpoints-auxiliares-conversations.md` |
| RN-019 | `chatwoot-integration` | `openspec/specs/chatwoot-integration/spec.md` | `docs/business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md` |
| RN-020 | `flows` | `openspec/specs/flows/spec.md` | `docs/business-rules/RN-020-crud-ciclo-vida-flows.md` |
| RN-021 | `flows` | `openspec/specs/flows/spec.md` | `docs/business-rules/RN-021-persistencia-flows-drizzle.md` |
| RN-022 | `flow-editor` | `openspec/specs/flow-editor/spec.md` | `docs/business-rules/RN-022-editor-visual-fluxos.md` |
| RN-023 | `flow-editor` | `openspec/specs/flow-editor/spec.md` | `docs/business-rules/RN-023-simulacao-local-fluxos.md` |
| RN-024 | `persistence` | `openspec/specs/persistence/spec.md` | `docs/business-rules/RN-024-persistencia-drizzle-obrigatoria.md` |
| RN-025 | `security` | `openspec/specs/security/spec.md` | `docs/business-rules/RN-025-seguranca-transporte-rate-limiting.md` |
| RN-026 | `chatwoot-integration` | `openspec/specs/chatwoot-integration/spec.md` | `docs/business-rules/RN-026-config-chatwoot-por-tenant.md` |
| RN-027 | `flow-scheduling` | `openspec/specs/flow-scheduling/spec.md` | `docs/business-rules/RN-027-agendamento-fluxos-por-horario.md` |
| RN-028 | `multi-tenant` | `openspec/specs/multi-tenant/spec.md` | `docs/business-rules/RN-028-timezone-por-tenant.md` |

## Sprints arquivadas

| Sprint | Archive OpenSpec | Documento legado |
|--------|------------------|------------------|
| sprint-01 | `openspec/changes/archive/2026-04-06-sprint-01/` | `docs/sprints/sprint-01.md` |
| sprint-02 | `openspec/changes/archive/2026-04-08-sprint-02/` | `docs/sprints/sprint-02.md` |
| sprint-03 | `openspec/changes/archive/2026-04-09-sprint-03/` | `docs/sprints/sprint-03.md` |
| sprint-04 | `openspec/changes/archive/2026-04-13-sprint-04/` | `docs/sprints/sprint-04.md` |
| sprint-05 | `openspec/changes/archive/2026-04-13-sprint-05/` | `docs/sprints/sprint-05.md` |
| sprint-06 | `openspec/changes/archive/2026-04-14-sprint-06/` | `docs/sprints/sprint-06.md` |
| sprint-07 | `openspec/changes/archive/2026-04-14-sprint-07/` | `docs/sprints/sprint-07.md` |
| sprint-08 | `openspec/changes/archive/2026-04-14-sprint-08/` | `docs/sprints/sprint-08.md` |
| sprint-09 | `openspec/changes/archive/2026-04-21-sprint-09/` | `docs/sprints/sprint-09.md` |
| sprint-10 | `openspec/changes/archive/2026-04-21-sprint-10/` | `docs/sprints/sprint-10.md` |
