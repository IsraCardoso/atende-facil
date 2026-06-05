## 1. Configuração e documentação de ambiente

- [x] 1.1 Adicionar `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `PUBLIC_API_URL` em `.env.development.example` alinhados ao `infra/docker-compose.yml`
- [x] 1.2 Atualizar `.env.example` (`EVOLUTION_API_KEY=atende-facil-evo-key`, comentário webhook)
- [x] 1.3 Atualizar `.env.production.example` e `.env.staging.example` com `PUBLIC_API_URL`, `EVOLUTION_PUBLIC_URL` e notas Coolify
- [x] 1.4 Injetar `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `PUBLIC_API_URL` no serviço `api` de `infra/docker-compose.production.yml`
- [x] 1.5 Atualizar `docs/guides/desenvolvimento-local.md` — ciclo UI completo (Ativar → QR → Desconectar → Desativar)
- [x] 1.6 Atualizar `docs/guides/deploy-coolify-hostinger.md` — vars obrigatórias na API

## 2. Infrastructure — config Evolution, webhook e deprovisionamento

- [x] 2.1 Criar `resolvePublicApiUrlForWebhooks` em `apps/api/src/infrastructure/config/`
- [x] 2.2 Criar `toEvolutionPlatformConfig` a partir de `ApiEnvironment`; usar em `index.ts`
- [x] 2.3 Passar `publicApiUrl` resolvida para use cases via bootstrap
- [x] 2.4 Estender `WhatsAppInstanceProvisionerPort` com `removeEvolutionInstance`
- [x] 2.5 Implementar `DELETE /instance/delete/{name}` em `evolution-instance-provisioner.ts`
- [x] 2.6 Testes unitários: `resolvePublicApiUrlForWebhooks`, `toEvolutionPlatformConfig`, deprovision

## 3. Domain e persistência

- [x] 3.1 Adicionar `deleteByTenantAndId` em `WhatsAppInstanceRepositoryPort`
- [x] 3.2 Implementar delete no repositório Drizzle (`whatsapp-instances`)

## 4. Application — use cases

- [x] 4.1 Criar `DeactivateWhatsAppIntegrationUseCase` (logout best-effort → remove Evolution → delete DB)
- [x] 4.2 Ajustar `UpsertWhatsAppInstanceUseCase`: provisionar antes de commit final ou rollback em falha
- [x] 4.3 Estender `get-integration-operational-summary` com `platform: { available, reason? }`
- [x] 4.4 Testes unitários: deactivate, upsert rollback, operational-summary platform

## 5. Interface HTTP

- [x] 5.1 Registrar `POST /integrations/whatsapp/instances/:id/deactivate` com RBAC admin/manager
- [x] 5.2 Wire use case no bootstrap/container e `whatsapp-integration-routes.ts`
- [x] 5.3 Garantir `GET /integrations/operational-summary` expõe campo `platform`

## 6. Web — ciclo de vida completo na UI

- [x] 6.1 Adicionar `deactivate(instanceId)` em `whatsapp-integration-api.ts`
- [x] 6.2 Botão "Desativar integração" com `AlertDialog` de confirmação no card
- [x] 6.3 Consumir `platform.available` — Alert warning preventivo
- [x] 6.4 Após desativar, voltar ao empty state; feedback sucesso/erro via `getApiErrorMessage`
- [x] 6.5 Validar fluxo QR existente (polling `connecting` → fecha dialog em `connected`)

## 7. Verificação operacional

- [x] 7.1 Criar `scripts/local/verify-evolution.ps1`
- [x] 7.2 Adicionar `verify:evolution` no `package.json` raiz

## 8. Validação final

- [x] 8.1 Lint (`bun run lint`) e testes afetados (`vitest` nos módulos alterados)
- [x] 8.2 Teste manual E2E local (ver seção abaixo)
- [x] 8.3 Teste manual checklist Coolify (vars + ativar + QR)

## Testes Manuais de Entrega (Passo a Passo Executável)

### Cenário A — Dev local (UI completa)

**Objetivo:** Ligar integração, autenticar WhatsApp, desconectar sessão e desligar integração sem scripts.

**Pré-requisitos:** Docker Desktop, `bun install`, portas 3000/5173/8081 livres.

1. `bun run infra:up` → Postgres, Valkey e Evolution healthy.
2. Copiar `.env.development.example` → `.env`; confirmar vars Evolution e `DEV_MOCK_WHATSAPP_SEND=false`.
3. `bun run db:migrate` → migrations OK.
4. `bun run verify:evolution` → Evolution acessível com apikey.
5. `bun run dev` → API `/health` 200, web em `:5173`.
6. Login admin → `/settings` → Integração WhatsApp.
7. Clicar **Ativar integração** → card aparece, sem erro 503.
8. Clicar **Conectar WhatsApp** → QR exibido; escanear no celular → badge **Conectado**.
9. Enviar mensagem teste no WhatsApp → bot responde (se fluxo ativo).
10. Clicar **Desconectar** → status `disconnected`.
11. Clicar **Desativar integração** → confirmar → empty state "Ativar integração".

**Critério de aprovação:** passos 7–11 sem erro; passo 8 atinge `connected`; passo 11 remove instância da listagem.

### Cenário B — Coolify / produção

**Objetivo:** Mesmo fluxo com vars de produção.

**Pré-requisitos:** Stack deployada; `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `PUBLIC_API_URL` na API.

1. Confirmar vars na API e `AUTHENTICATION_API_KEY` igual na Evolution.
2. Repetir passos 6–11 do Cenário A no domínio de produção.

**Critério de aprovação:** ativação e QR funcionam; webhooks chegam na API (`PUBLIC_API_URL` público).
