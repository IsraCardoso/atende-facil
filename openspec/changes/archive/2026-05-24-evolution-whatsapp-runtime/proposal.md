## Why

O tenant não consegue usar WhatsApp de ponta a ponta pelo Atende Fácil: ao clicar "Ativar integração" aparece `WHATSAPP_PLATFORM_UNAVAILABLE` porque `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` não chegam à API (env examples incompletos, compose de produção sem repasse). Além do wiring, o ciclo de vida in-app está incompleto — existe ativar/conectar/desconectar sessão, mas **falta desligar a integração** (deprovisionar instância Evolution e voltar ao empty state), e o fluxo de autenticação (QR) só funciona quando o runtime Evolution está corretamente configurado. O objetivo é que **local e Coolify** permitam ligar a integração, autenticar o WhatsApp pelo produto e desligar tudo sem scripts externos.

## What Changes

### Runtime e ambiente (bloqueador atual)
- Alinhar `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `PUBLIC_API_URL` em todos os `.env.*.example` com defaults do `infra/docker-compose.yml`.
- Repassar vars Evolution à API no `docker-compose.production.yml` e guias Coolify.
- Resolver `PUBLIC_API_URL` para webhooks alcançáveis pela Evolution em Docker local (`host.docker.internal`).
- Unificar carregamento de config Evolution; diagnóstico `platform.available` no operational-summary.
- Script `verify-evolution` para validar reachability antes de testar na UI.

### Ciclo de vida completo in-app (RN-029)
- **Ligar integração:** `POST /integrations/whatsapp/instances` — provisiona instância Evolution + webhook (já existe; corrigir env + rollback em falha).
- **Autenticar WhatsApp:** `POST .../pair` — QR in-app com polling até `connected` (já existe; garantir funcionamento E2E).
- **Desconectar sessão:** `POST .../disconnect` — logout Baileys sem remover instância (já existe).
- **Desligar integração (NOVO):** `POST .../instances/:id/deactivate` — logout + `DELETE` instância na Evolution + remove/desativa registro no banco; UI volta ao empty state "Ativar integração".
- UI com ações claras: Ativar → Conectar (QR) → Desconectar → Desativar integração; confirmação antes de desligar.

## Capabilities

### New Capabilities

- `evolution-platform-runtime`: Wiring runtime (env, Docker, webhook callback, diagnóstico) para Evolution gerenciada funcionar em dev local e Coolify.

### Modified Capabilities

- `configuration`: Documentação completa das variáveis Evolution/webhook em exemplos de ambiente e compose de produção.
- `whatsapp-integration`: Ciclo de vida completo (ativar, parear QR, desconectar sessão, desativar integração), deprovisionamento Evolution, disponibilidade de plataforma e webhook alcançável.

## Impact

- **API:** `DeactivateWhatsAppIntegrationUseCase`, extensão `WhatsAppInstanceProvisionerPort` com `removeEvolutionInstance`, rota `POST /instances/:id/deactivate`.
- **Infrastructure:** `evolution-instance-provisioner` (delete), `resolvePublicApiUrlForWebhooks`, bootstrap unificado.
- **Web:** botão "Desativar integração", Alert de plataforma indisponível, fluxo QR validado E2E.
- **Config/Infra:** `.env.*.example`, `docker-compose.production.yml`, guias local e Coolify.
- **Sem breaking changes** em rotas existentes; nova rota de desativação.
