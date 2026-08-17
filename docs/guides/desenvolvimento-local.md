# Desenvolvimento local

Guia único para rodar o Atende Fácil na máquina com WhatsApp real (Evolution) e hand-off humano (Chatwoot opcional).

**Produção:** [deploy-coolify-hostinger.md](./deploy-coolify-hostinger.md)

---

## Pré-requisitos

- Git, Bun (>= 1.3), Docker Desktop
- Portas livres: `3000` (API), `5173` (web), `5432` (Postgres), `6379` (Valkey), `8081` (Evolution)

---

## 1. Subir infra e app

```powershell
cd C:\Users\israe\git\atende-facil
bun install
bun run infra:up
bun run db:migrate
```

Copie `.env.development.example` → `.env` (ou `.env.example`) e confirme:

| Variável | Dev |
|----------|-----|
| `DEV_MOCK_WHATSAPP_SEND` | `false` para WhatsApp real |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/spec_driven_dev` |
| `EVOLUTION_API_URL` | `http://localhost:8081` |
| `EVOLUTION_API_KEY` | `atende-facil-evo-key` (igual ao `infra/docker-compose.yml`) |
| `PUBLIC_API_URL` | `http://host.docker.internal:3000` (webhooks da Evolution no Docker) |

Valide a Evolution antes de subir a API:

```powershell
bun run verify:evolution
```

```powershell
bun run dev
```

- API: http://localhost:3000/health  
- Web: http://localhost:5173  

---

## 2. WhatsApp pela UI (recomendado)

Fluxo completo em **Configurações** (`/settings`), sem scripts:

1. **Ativar integração** — provisiona instância Evolution + webhook.
2. **Conectar WhatsApp** — escaneie o QR no celular.
3. Envie mensagem de teste (com fluxo ativo em Fluxos).
4. **Desconectar** — encerra a sessão Baileys (instância permanece).
5. **Desativar integração** — remove instância na Evolution e volta ao empty state.

Se aparecer "Evolution API indisponível", confira as três variáveis acima e reinicie a API.

---

## 3. Scripts legados (opcional)

Para bootstrap rápido de tenant + fluxo:

```powershell
.\scripts\local\setup-teste-real-local.ps1 `
  -FreshTenant `
  -TenantPrefix "minha-loja" `
  -FlowJsonPath ".\scripts\local\flows\fluxo-provedora-netfacil.json"
```

O pareamento QR pode ser feito pela UI; `evolution-qr.ps1` permanece como alternativa de diagnóstico.

---

## 4. Chatwoot local (opcional)

```powershell
.\scripts\local\setup-chatwoot-local.ps1
```

Reinicie a API após o script atualizar `.env`. Painel: http://localhost:3001

---

## 5. Testes rápidos

| Teste | Como validar |
|-------|----------------|
| Bot | Mensagem no WhatsApp → resposta automática |
| Hand-off | Opção atendente no fluxo → `GET /conversations?status=waiting_human` com JWT |
| Humano | Resposta no Chatwoot → chega no WhatsApp (webhook + telefone E.164 corretos) |

```powershell
.\scripts\local\verify-session-data.ps1 -Phone "5562999999999"
```

---

## 6. Postman (opcional)

- [atende-facil-api.postman_collection.json](./atende-facil-api.postman_collection.json)
- [atende-facil-local.postman_environment.json](./atende-facil-local.postman_environment.json)

---

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| `WHATSAPP_PLATFORM_UNAVAILABLE` | `EVOLUTION_API_URL` ou `EVOLUTION_API_KEY` ausentes no `.env` |
| Bot não responde | Evolution desconectada, `DEV_MOCK_WHATSAPP_SEND=true`, ou `PUBLIC_API_URL` errado |
| Webhook não chega | Evolution no Docker não alcança `localhost:3000` — use `host.docker.internal` |
| Inbox vazia | Login com tenant errado |
| Humano não chega no WhatsApp | Chatwoot sem webhook, telefone typo, ou `chatwoot_conversation_id` duplicado |

---

## Persistência local

Dados de tenant/flow/sessão ficam no **volume Docker do Postgres**. Parar `bun run dev` **não apaga** dados. `docker volume rm` ou `infra:down -v` apaga.
