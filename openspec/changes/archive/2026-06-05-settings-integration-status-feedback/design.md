## Context

A sprint `tenant-whatsapp-integration-self-service` entregou CRUD de instâncias, badge de conexão e pareamento QR. O bug reportado ocorre porque `handleEnable` ignora respostas `!ok` — erros comuns incluem `503 WHATSAPP_PLATFORM_UNAVAILABLE` (Evolution não configurada no `.env`), `502 EVOLUTION_PROVISION_FAILED`, `403` (role) ou falha de migration `0008`.

O admin precisa validar em um único lugar: (1) integração habilitada, (2) WhatsApp conectado, (3) fluxo ativo para atendimento automatizado (RN-020: máximo 1 fluxo ativo por tenant).

**Skills obrigatórias na implementação:**
- `react-best-practices`: `async-parallel` no endpoint agregado; `rerender-move-effect-to-event` para feedback em handlers; `bundle-dynamic-imports` mantido no QR dialog.
- `react-composition-patterns`: compound `IntegrationOperationalPanel` com subcomponentes `Summary`, `WhatsAppStatus`, `ActiveFlow`.
- `ui-ux-pro-max` + `taste-skill`: hierarquia visual clara, estados vazios com CTA, Alert semântico para erros, microcopy em português.

## Goals / Non-Goals

**Goals:**
- Toda ação de integração (ativar, parear, desconectar) MUST exibir feedback visível (sucesso ou erro acionável).
- Painel operacional em Configurações com resumo: instância configurada, status de conexão, fluxo ativo ou aviso.
- Endpoint `GET /integrations/operational-summary` agregando dados em paralelo no servidor.
- Mensagens de erro mapeadas para texto legível (`WHATSAPP_PLATFORM_UNAVAILABLE` → "Integração WhatsApp indisponível no ambiente. Contate o administrador.").

**Non-Goals:**
- Alterar lógica de ativação/publicação de fluxos.
- Toast global (não existe no projeto) — usar `Alert` inline + estado local.
- Feature flags ou novos provedores WhatsApp.

## Decisions

### D1 — Endpoint agregado vs múltiplas chamadas no cliente

**Decisão:** `GET /integrations/operational-summary` no backend.

**Rationale:** `async-parallel` no use case (`Promise.all` instância + status + fluxo ativo) evita waterfall e garante snapshot consistente para o painel.

**Alternativa descartada:** Cliente chama `/instances`, `/status` e `/flows?status=active` — 3 round-trips, estados intermediários confusos.

### D2 — Feedback de erro sem toast library

**Decisão:** `Alert` (shadcn) inline abaixo do CTA + helper `mapApiErrorToMessage(code, error)`.

**Rationale:** Projeto não tem sonner/toast; Alert já existe em `packages/ui`. Mantém escopo mínimo.

### D3 — Compound component para painel operacional

**Decisão:** `IntegrationOperationalPanel` como compound component separado de `WhatsAppIntegration`, composto em `settings.tsx`.

**Rationale:** Separação de responsabilidades (react-composition-patterns): WhatsAppIntegration cuida de CRUD/pareamento; painel cuida de visão operacional agregada.

### D4 — Exibir fluxo ativo apenas quando WhatsApp `connected`

**Decisão:** Seção "Fluxo de atendimento" visível quando `whatsapp.connectionStatus === 'connected'`.

**Rationale:** Atendimento automatizado só ocorre com mensagens entrando; evita ruído quando integração ainda não está operacional.

### D5 — Extensão do api-client para erros tipados

**Decisão:** Adicionar tipo `ApiErrorBody = { error: string; code?: string }` e helper `getApiErrorMessage(response)` sem breaking change em `ApiResponse`.

## Risks / Trade-offs

- **[Risk] Evolution down após save da instância** → Instância existe mas status `error`; UI mostra badge + mensagem, não reverte save.
- **[Risk] Status stale entre polls** → Painel usa refresh manual + polling existente em `useWhatsAppConnection`; botão "Atualizar" no painel chama reload do summary.
- **[Trade-off] Summary não substitui detalhe do card WhatsApp** → Painel é resumo; card mantém ações (QR, desconectar).

## Migration Plan

1. Deploy API com nova rota (backward compatible).
2. Deploy web com feedback de erro e painel.
3. Nenhuma migration de banco adicional.

## Open Questions

- Nenhuma bloqueante — mensagens de erro podem ser refinadas após QA manual.
