## Context

**Estado atual:** `whatsapp_instances` existe no Postgres com adapters de envio/normalização (RN-011) e webhooks funcionais. Cadastro e pareamento são manuais via `register-whatsapp-instance.ps1` e `evolution-qr.ps1`. A página `/settings` só expõe timezone. O repositório `WhatsAppInstanceRepositoryPort` é read-only (`findByTenantAndId`, `findActiveByTenant`).

**Stakeholder:** tenant admin que precisa conectar o WhatsApp sem suporte técnico.

**Skills obrigatórias na implementação:**
| Skill | Uso |
|---|---|
| `react-composition-patterns` | `WhatsAppIntegration` como compound component com Provider + subcomponentes (`Card`, `Status`, `ProviderForm`, `QrDialog`) — evitar props booleanas (`showQr`, `isEvolution`) |
| `react-best-practices` | `bundle-dynamic-imports` para dialog QR; polling com cleanup; `rerender-derived-state` para status; `client-swr-dedup` no hook de status |
| `ui-ux-pro-max` | Consultar `ux` + `shadcn` domains: feedback de loading, empty states, hierarquia visual B2B admin |
| `taste-skill` | Design read: *B2B SaaS admin para operador de atendimento, linguagem Linear/minimal, VARIANCE 5, MOTION 3, DENSITY 5* — sem gradientes AI, badges semânticos discretos |

## Goals / Non-Goals

**Goals:**
- Self-service completo: escolher provedor → configurar → ver status → parear (QR Evolution MVP).
- API hexagonal com `WhatsAppConnectionPort` e use cases testáveis.
- Segurança: segredos server-side, mascaramento, rate limit em pair/status.
- UI em `/settings` alinhada ao shell admin existente.

**Non-Goals:**
- Tenant informar credenciais Evolution (`apiUrl`/`apiKey` são da plataforma via `EVOLUTION_API_*`).
- Suporte completo de QR para Z-API/Uazapi na v1 (UI preparada; backend retorna `NOT_SUPPORTED` com mensagem).
- OAuth Meta Business embedded (v1: formulário de credenciais + link para docs Meta).
- Múltiplas instâncias ativas simultâneas por tenant (MVP: uma primária).
- Billing ou limites por plano.

## Decisions

### D1 — Extender repositório em vez de `tenant_integrations`
**Decisão:** CRUD em `whatsapp_instances` (já modela provider + config).

**Alternativa descartada:** reutilizar `tenant_integrations` — mistura Chatwoot com WhatsApp e duplicaria conceito.

**Extensão de schema (migration):**
```sql
ALTER TABLE whatsapp_instances
  ADD COLUMN display_name varchar(128),
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false;
```

### D2 — Novo port `WhatsAppConnectionPort`
```typescript
type WhatsAppConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error'

type WhatsAppConnectionPort = {
  getStatus(config): Promise<{ status, phone?, reason? }>
  startPairing?(config): Promise<{ qrBase64, expiresAt }>
  disconnect?(config): Promise<void>
}
```

Resolvido em `resolveProviderBundle()` junto com sender/normalizer. Evolution implementa os três métodos; Meta implementa só `getStatus` (validação leve de token).

### D3 — Use cases (application layer)
| Use case | Responsabilidade |
|---|---|
| `ListWhatsAppInstancesUseCase` | Lista + mascara config |
| `UpsertWhatsAppInstanceUseCase` | Valida provider/config, merge parcial de secrets |
| `GetWhatsAppConnectionStatusUseCase` | Resolve instance → connection port |
| `StartWhatsAppPairingUseCase` | Só se port suporta pairing |
| `DisconnectWhatsAppUseCase` | Logout Evolution |

`tenantId` sempre do contexto autenticado.

### D4 — Rotas HTTP (`integration-routes.ts`)
```
GET    /integrations/whatsapp/instances
POST   /integrations/whatsapp/instances
PUT    /integrations/whatsapp/instances/:id
GET    /integrations/whatsapp/instances/:id/status
POST   /integrations/whatsapp/instances/:id/pair
POST   /integrations/whatsapp/instances/:id/disconnect
```

Rate limit: 10 req/min em `pair` e `status` por tenant (reutilizar middleware existente).

### D5 — Frontend: compound components
```
components/whatsapp-integration/
  whatsapp-integration.tsx      # Provider + compound export
  whatsapp-integration-card.tsx
  provider-picker.tsx           # explicit variants por provider
  evolution-config-form.tsx
  meta-config-form.tsx
  connection-status-badge.tsx
  qr-pairing-dialog.tsx
hooks/
  use-whatsapp-connection.ts    # polling quando connecting
services/
  whatsapp-integration-api.ts
```

`settings.tsx` compõe `<WhatsAppIntegration>` abaixo do card de timezone — sem inflar a página com lógica.

**Polling:** `useEffect` + `setInterval` 4s enquanto `status === 'connecting'`; cleanup no unmount (`react-best-practices`).

### D6 — Evolution adapter: connection
Reutilizar endpoints já usados em `evolution-qr.ps1`:
- `GET /instance/connectionState/:instanceName`
- `GET /instance/connect/:instanceName` → `base64`
- `DELETE /instance/logout/:instanceName`

Normalizar estados Evolution (`open`, `close`, `connecting`) → enum canônico.

### D7 — Variáveis de ambiente
| Variável | Uso |
|---|---|
| `EVOLUTION_DEFAULT_API_URL` | Pré-preencher form em dev (opcional) |
| `PUBLIC_API_URL` | Montar URL de webhook exibida ao usuário (read-only) |

Documentar em `.env.example`. Segredos do tenant ficam no JSONB, não no `.env`.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| QR expira em ~60s | Contador + botão refresh; polling de status em paralelo |
| Evolution API indisponível | Status `error` com `reason`; não quebrar settings |
| Expor `apiKey` no network tab | DTO mascarado; nunca retornar campo completo |
| Polling agressivo | Intervalo 4s, parar em `connected`/`error`/`disconnected` |
| Z-API/Meta sem pairing na v1 | UI mostra formulário; status após salvar credenciais |

## Migration Plan

1. Migration `display_name` + `is_primary`.
2. Deploy API com novos endpoints (backward compatible — webhooks inalterados).
3. Deploy web com seção em settings.
4. Tenants existentes: script de migração opcional marca instância existente como `is_primary=true`.
5. Rollback: reverter deploy de API + web (sem feature flag).

## Testes Manuais de Entrega (Passo a Passo Executável)

**Pré-requisitos:** API + web + Postgres + Evolution local rodando; tenant `demo-atende` autenticado.

1. Acessar `/settings` → ver seção "Integração WhatsApp".
2. Clicar "Adicionar integração" → escolher Evolution → preencher `instanceName`, `apiUrl`, `apiKey` → Salvar.
3. **Esperado:** card com status "Desconectado" e webhook URL exibida (read-only).
4. Clicar "Conectar WhatsApp" → **Esperado:** dialog com QR visível.
5. Escanear QR no celular → em até 30s status muda para "Conectado".
6. Recarregar página → status permanece "Conectado" (persistido no provedor).
7. Clicar "Desconectar" → status "Desconectado".
8. DevTools Network → confirmar que respostas não contêm `apiKey` completo.
9. Repetir passos 1–3 em dark mode — layout consistente com Agendamentos.

**Critério de aprovação:** tenant configura, pareia e vê status sem scripts CLI; inbox recebe mensagem após conectado (teste opcional com webhook).

## Open Questions

1. ~~**Evolution gerenciada**~~ **Decidido:** plataforma Atende Fácil gerencia Evolution (`EVOLUTION_API_URL` + `EVOLUTION_API_KEY`).
2. ~~**Feature flag**~~ **Decidido:** sem FF.
3. ~~**RN formal**~~ **Decidido:** `RN-029-whatsapp-self-service-plataforma.md` criada.
