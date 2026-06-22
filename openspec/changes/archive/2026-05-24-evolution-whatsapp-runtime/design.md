## Context

RN-029 define que o tenant gerencia WhatsApp **somente pela UI** — a plataforma opera a Evolution (credenciais globais, provisionamento, webhook). O código já implementa grande parte:

| Etapa | Endpoint / UI | Status |
|-------|---------------|--------|
| Ligar integração | `POST /instances` + "Ativar integração" | Implementado; **bloqueado por env** |
| Autenticar (QR) | `POST /instances/:id/pair` + dialog QR + polling | Implementado |
| Desconectar sessão | `POST /instances/:id/disconnect` | Implementado |
| Desligar integração | — | **Ausente** |

O erro `WHATSAPP_PLATFORM_UNAVAILABLE` ocorre quando `loadEvolutionPlatformConfig()` retorna `null`. `.env.development.example` omite vars; compose produção não repassa para `api`; `PUBLIC_API_URL=localhost` falha para webhooks quando Evolution está em container.

## Goals / Non-Goals

**Goals:**

- Fluxo E2E na UI: **Ativar → Conectar (QR) → mensagens → Desconectar → Desativar** — local (`infra:up`) e Coolify.
- Tenant nunca informa credenciais Evolution; plataforma liga/desliga instância e sessão.
- Env documentado e compose alinhado; diagnóstico antes de ativar.
- Deprovisionamento limpo ao desativar (Evolution + banco).

**Non-Goals:**

- Ligar/desligar o **container** Evolution via UI (permanece `infra:up` / Coolify).
- Tenant com credenciais Evolution próprias.
- Meta/Z-API/Uazapi nesta change.
- ngrok automático — só documentar.

## Decisions

### D1 — Fonte única de config Evolution

`index.ts` usa `toEvolutionPlatformConfig(loadApiEnvironment())`; `loadEvolutionPlatformConfig` delega ou permanece helper puro testável.

### D2 — `PUBLIC_API_URL` para webhooks locais

`resolvePublicApiUrlForWebhooks(env)`:

| Contexto | Valor |
|----------|-------|
| `PUBLIC_API_URL` explícita | Usa como está |
| Dev + Evolution em `localhost` | Default `http://host.docker.internal:{apiPort}` (Win/Mac); Linux documentado |

### D3 — Variáveis nos examples e compose

```env
EVOLUTION_API_URL=http://localhost:8081
EVOLUTION_API_KEY=atende-facil-evo-key
PUBLIC_API_URL=http://host.docker.internal:3000
```

Produção API: `EVOLUTION_API_URL=http://evolution:8080` (rede interna); `PUBLIC_API_URL` = URL pública da API.

### D4 — Diagnóstico `platform` no operational-summary

```typescript
platform: { available: boolean; reason?: string }
```

UI exibe Alert warning quando `!platform.available`.

### D5 — Ciclo de vida: quatro operações distintas

| Ação do usuário | Semântica | Evolution | Banco |
|-----------------|-----------|-----------|-------|
| **Ativar integração** | Ligar — criar instância tenant | `POST /instance/create` + webhook | Insert + `isPrimary` |
| **Conectar WhatsApp** | Autenticar — parear QR | `GET /instance/connect/{name}` | Sem mudança |
| **Desconectar** | Logout sessão Baileys | `DELETE /instance/logout/{name}` | Sem mudança |
| **Desativar integração** | Desligar — remover integração | logout (best-effort) + `DELETE /instance/delete/{name}` | Delete row ou `active=false` |

**Alternativa descartada:** Reutilizar "Desconectar" para desligar integração — confunde logout de sessão com remoção da instância.

### D6 — Port de deprovisionamento

Estender `WhatsAppInstanceProvisionerPort`:

```typescript
removeEvolutionInstance(instanceName: string): Promise<void>
```

Implementação em `evolution-instance-provisioner.ts`: `DELETE /instance/delete/{instanceName}` (Evolution v2). Idempotente se 404.

### D7 — Use case `DeactivateWhatsAppIntegrationUseCase`

1. Validar tenant + instância + role admin/manager.
2. Se Evolution: `disconnect` (best-effort) → `removeEvolutionInstance`.
3. Remover registro (`deleteByTenantAndId` no repositório) — sem soft delete na v1 (tabela sem `deleted_at`; cascade FK ok).
4. Retornar `{ success: true }`.

**Ordem de ativação (melhoria):** Provisionar Evolution **antes** de `setPrimary`/`save` final; em falha de provision, não persistir instância órfã.

### D8 — UI

- Empty state: "Ativar integração".
- Com instância: "Conectar WhatsApp" / "Desconectar" (sessão) + "Desativar integração" (destructive, `AlertDialog` confirma).
- Após desativar: volta ao empty state.
- Polling em `connecting` mantido (4s).

### D9 — Script `verify-evolution`

Valida Evolution HTTP + apikey; documenta próximo passo (UI).

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| `host.docker.internal` no Linux | Documentar `172.17.0.1` ou API no compose |
| Delete Evolution falha mas DB removido | Log + retry idempotente; ordem: Evolution primeiro, DB depois |
| Instância órfã na Evolution após falha parcial | D7 ordem invertida na ativação; script de limpeza manual documentado |
| Mensagens em trânsito ao desativar | Desconectar antes de delete; aviso na confirmação UI |

## Migration Plan

1. Atualizar env examples e compose.
2. Nova rota `deactivate` — sem migration de schema (delete físico na row).
3. Desenvolvedores: adicionar 3 vars ao `.env` e reiniciar API.
4. Coolify: vars na API + redeploy.

**Rollback:** Reverter deploy; instâncias Evolution órfãs podem ser limpas manualmente no painel Evolution.

## Open Questions

- Linux sem Docker Desktop: documentar `PUBLIC_API_URL` manual — resolvido na doc, não no código.
- Soft delete futuro em `whatsapp_instances`? — Fora do escopo; delete físico ok para v1.
