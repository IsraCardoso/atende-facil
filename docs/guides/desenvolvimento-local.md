# Desenvolvimento local

Guia único para rodar o Atende Fácil na máquina com WhatsApp real (Evolution) e hand-off humano (Chatwoot opcional).

**Produção:** [deploy-coolify-hostinger.md](./deploy-coolify-hostinger.md)

---

## Pré-requisitos

- Git, Bun (>= 1.3), Docker Desktop
- Portas livres: `3000` (API), `5173` (web), `5432` (Postgres), `6379` (Valkey), `8080` ou `8081` (Evolution)

---

## 1. Subir infra e app

```powershell
cd C:\Users\israe\git\atende-facil
bun install
bun run infra:up
bun run db:migrate
```

Copie `.env.example` → `.env` e ajuste:

| Variável | Dev |
|----------|-----|
| `DEV_MOCK_WHATSAPP_SEND` | `false` para WhatsApp real |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/spec_driven` |

```powershell
bun run dev
```

- API: http://localhost:3000/health  
- Web: http://localhost:5173  

Evolution já sobe no `infra:up` (host `8081` no compose padrão — ajuste webhook se usar `8080`).

---

## 2. Tenant, fluxo e instância

```powershell
.\scripts\local\setup-teste-real-local.ps1 `
  -FreshTenant `
  -TenantPrefix "minha-loja" `
  -FlowJsonPath ".\scripts\local\flows\fluxo-provedora-netfacil.json" `
  -EvolutionInstanceApiKey "SUA_APIKEY"
```

O script imprime **tenant slug**, e-mail e senha — guarde localmente (não commitar).

QR WhatsApp:

```powershell
.\scripts\local\evolution-qr.ps1 -EvolutionApiKey "SUA_APIKEY"
```

---

## 3. Chatwoot local (opcional)

```powershell
.\scripts\local\setup-chatwoot-local.ps1
```

Reinicie a API após o script atualizar `.env`. Painel: http://localhost:3001

---

## 4. Testes rápidos

| Teste | Como validar |
|-------|----------------|
| Bot | Mensagem no WhatsApp → resposta automática |
| Hand-off | Opção atendente no fluxo → `GET /conversations?status=waiting_human` com JWT |
| Humano | Resposta no Chatwoot → chega no WhatsApp (webhook + telefone E.164 corretos) |

```powershell
.\scripts\local\verify-session-data.ps1 -Phone "5562999999999"
```

---

## 5. Postman (opcional)

- [atende-facil-api.postman_collection.json](./atende-facil-api.postman_collection.json)
- [atende-facil-local.postman_environment.json](./atende-facil-local.postman_environment.json)

---

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Bot não responde | Evolution desconectada, `DEV_MOCK_WHATSAPP_SEND=true`, ou webhook errado |
| Inbox vazia | Login com tenant errado |
| Humano não chega no WhatsApp | Chatwoot sem webhook, telefone typo, ou `chatwoot_conversation_id` duplicado |

---

## Persistência local

Dados de tenant/flow/sessão ficam no **volume Docker do Postgres**. Parar `bun run dev` **não apaga** dados. `docker volume rm` ou `infra:down -v` apaga.
