## Why

A entrega `ui-ux-renovation` foi marcada como concluída sem validação manual completa. Testes reais revelaram **desalinhamentos visuais** (inbox, tabelas, shell), **fluxo quebrado de agendamentos** (botão “Novo agendamento” sem feedback quando não há fluxos publicados) e **ausência de atalho ao Chatwoot** quando a inbox está vazia — violando a expectativa do atendente (RN-017).

Esta change corrige regressões de UX e estabelece **gate de validação obrigatório** antes de encerrar qualquer entrega de UI.

## What Changes

- **Inbox layout**: separar lista de conversas da sidebar de navegação global; painel dedicado ao lado do conteúdo (padrão inbox split-view).
- **Chatwoot sem conversas**: expor URL do painel Chatwoot (portal da conta/inbox) via API autenticada; empty state com CTA “Abrir Chatwoot”.
- **Agendamentos**: modal sempre abre com feedback claro; bloqueio guiado quando `publishedFlows` está vazio; corrigir z-index/portal do Dialog se necessário.
- **Polish visual**: alinhamento de tabela em Fluxos, espaçamento do shell (nav + user menu), `PageHeader` em páginas full-width.
- **Validação**: checklist executável com evidência (screenshots ou passos) antes de marcar tasks 6.x como concluídas em `ui-ux-renovation` / esta change.
- Reabrir tasks 6.1–6.3 de `ui-ux-renovation` até validação passar.

## Capabilities

### New Capabilities

- `ui-delivery-gates`: critérios e checklist obrigatório de validação manual antes de encerrar changes de UI.

### Modified Capabilities

- `admin-shell`: inbox não injeta `ConversationList` no slot `sidebar` da nav global.
- `web-pages-ux`: empty state inbox com link Chatwoot; alinhamento de tabelas e headers.
- `chatwoot-integration`: endpoint de portal URL sem `conversationId`.
- `flow-scheduling`: criação de agendamento com estados vazios e erros explícitos.

## Impact

- `apps/web`: `inbox.tsx`, `dashboard-shell.tsx` (ou novo `inbox-layout.tsx`), `schedules.tsx`, `schedule-modal.tsx`, `flows.tsx`, `conversation-list.tsx`
- `apps/api`: rota autenticada `GET /integrations/chatwoot/portal` (ou equivalente), extensão de `chatwoot-access-service`
- `openspec/changes/ui-ux-renovation/tasks.md`: reverter conclusão prematura das tasks 6.x
- Sem breaking changes de API pública além de endpoint novo opcional
