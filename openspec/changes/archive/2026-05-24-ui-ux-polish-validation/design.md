## Context

A renovação UI portou componentes do backoffice para `packages/ui` e `DashboardShell`, mas o **Inbox** reutilizou a prop `sidebar` do shell para renderizar `ConversationList` **acima** dos itens de navegação (`Inbox`, `Fluxos`, …). Isso comprime o aside e causa sobreposição visual (filtro de status sobre o branding).

O botão **Novo agendamento** chama `handleClickSlot` e abre `ScheduleModal`, porém no ambiente de teste **todos os fluxos estão em Rascunho** — `publishedFlows` retorna vazio. O modal abre sem fluxo selecionável e parece “não fazer nada”.

RN-017 exige fallback deep-link Chatwoot; hoje o link só aparece após selecionar conversa com `chatwootConversationId`. Atendentes precisam acessar o painel geral mesmo com inbox vazia.

## Goals / Non-Goals

**Goals:**

- Layout inbox em split-view: nav global intacta + coluna de conversas + área de chat/empty state.
- Portal Chatwoot acessível sem conversa selecionada (URL gerada no backend).
- Modal de agendamento sempre visível com estados: loading, sem fluxos publicados, formulário válido.
- Alinhamento consistente em tabelas e shell footer.
- Checklist de validação manual obrigatório antes de fechar change.

**Non-Goals:**

- Redesign completo do weekly grid.
- SSO HMAC real (mantém implementação atual).
- Config Chatwoot por tenant (RN-026 continua débito).

## Decisions

### D1 — Inbox split-view fora do `sidebar` do shell

**Decisão:** `InboxPage` usa `AppShell` **sem** prop `sidebar`. Layout interno:

```
[ DashboardShell aside: só nav + user menu ]
[ main: flex row → ConversationList w-72 | ChatwootEmbed / EmptyState ]
```

**Alternativa descartada:** manter lista no `sidebar` do shell — causa o bug atual e mistura domínios (nav app vs lista de conversas).

### D2 — Portal Chatwoot via API

**Decisão:** `GET /integrations/chatwoot/portal` (autenticado, tenant do token) retorna:

```json
{ "portalUrl": "https://chat…/app/accounts/{accountId}/dashboard", "reason": null }
```

Implementado em `chatwoot-access-service.generatePortalUrl()` usando `CHATWOOT_APP_URL` + `CHATWOOT_ACCOUNT_ID`. Sem segredo no frontend.

**Alternativa descartada:** hardcodar URL no `.env` do web — viola RN-019.

### D3 — Schedule modal com empty state de fluxos

**Decisão:** Se `publishedFlows.length === 0`, Dialog abre com `Alert` + link para `/flows` (“Publique um fluxo antes de agendar”). Botão Salvar desabilitado. Se há fluxos, formulário normal.

**Alternativa descartada:** abrir modal só quando há fluxos — usuário não recebe feedback.

### D4 — Gate de entrega UI

**Decisão:** Nenhuma task 6.x pode ser `[x]` sem executar checklist em `design.md` e registrar resultado. `ui-ux-renovation` tasks 6.1–6.3 revertidas até esta change aplicar.

## Risks / Trade-offs

- **[Risk] Chatwoot não configurado** → `portalUrl: null` + `reason` legível; empty state mostra instrução de `.env`.
- **[Risk] Dialog atrás do shell** → validar `z-index` do `DialogContent` (≥50) e testar em dark mode.
- **[Risk] Mobile inbox** → em `<md`, lista em Sheet ou toggle; manter paridade com spec inbox responsivo.

## Migration Plan

1. Aplicar fixes em branch da change.
2. Validar checklist manual (login → todas as rotas → novo agendamento com/sem fluxos publicados).
3. Marcar tasks desta change e só então re-marcar `ui-ux-renovation` 6.x.
4. `/opsx-archive` após aprovação do usuário.

## Testes Manuais de Entrega (Passo a Passo Executável)

**Pré-requisitos:** `bun run dev`, Postgres up, login `admin@demo.com` / `Test1234!` / `demo-atende`.

1. **Inbox layout** — `/inbox`: sidebar mostra só nav + tenant/tema/sair; lista de conversas em coluna separada; sem sobreposição do filtro no título.
2. **Chatwoot vazio** — sem conversas: empty state exibe botão “Abrir Chatwoot” (nova aba) quando `CHATWOOT_APP_URL` configurado.
3. **Novo agendamento sem fluxos publicados** — `/schedules` → clicar “Novo agendamento”: modal abre com alerta e CTA para fluxos.
4. **Novo agendamento com fluxo publicado** — publicar um fluxo → repetir: modal com select preenchido e criar agendamento.
5. **Fluxos tabela** — `/flows`: colunas alinhadas verticalmente; ações não “flutuam” desalinhadas.
6. **Tema** — alternar claro/escuro em todas as telas acima.

**Critério de aprovação:** todos os passos passam; lint + build web ok; usuário confirma visualmente.

## Open Questions

- URL exata do portal: dashboard vs lista de conversas do Chatwoot — usar `/dashboard` como padrão; ajustar se time preferir `/conversations`.
