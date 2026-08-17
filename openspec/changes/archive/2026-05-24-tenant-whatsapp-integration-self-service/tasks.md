## 1. Domain e persistência

- [x] 1.1 Migration: `display_name`, `is_primary` em `whatsapp_instances`
- [x] 1.2 Tipos `WhatsAppConnectionStatus` e DTOs mascarados em `domain/`
- [x] 1.3 Estender `WhatsAppInstanceRepositoryPort` com `listByTenant`, `save`, `setPrimary`
- [x] 1.4 Implementar métodos no `DrizzleWhatsAppInstanceRepository` + testes unitários

## 2. Infrastructure — connection port

- [x] 2.1 Criar `WhatsAppConnectionPort` em `domain/ports/`
- [x] 2.2 Implementar `EvolutionConnectionAdapter` (status, pair, disconnect)
- [x] 2.3 Estender `ProviderBundle` + factory com connection port
- [x] 2.4 Stub `getStatus` para Meta; `NOT_SUPPORTED` para pair em Z-API/Uazapi (v1)
- [x] 2.5 Testes unitários com fixtures HTTP (Evolution connectionState/connect/logout)

## 3. Application — use cases

- [x] 3.1 `ListWhatsAppInstancesUseCase` com mascaramento de secrets
- [x] 3.2 `UpsertWhatsAppInstanceUseCase` com merge parcial de credenciais
- [x] 3.3 `GetWhatsAppConnectionStatusUseCase`
- [x] 3.4 `StartWhatsAppPairingUseCase` + `DisconnectWhatsAppUseCase`
- [x] 3.5 Cobertura unitária 100% dos use cases

## 4. Interface HTTP

- [x] 4.1 `integration-routes.ts` com rotas `/integrations/whatsapp/*`
- [x] 4.2 Validação Elysia por provider (schemas tipados)
- [x] 4.3 Rate limit em `pair` e `status`
- [x] 4.4 Wiring no container/bootstrap + `.env.example`
- [x] 4.5 Testes E2E Supertest dos endpoints principais

## 5. Web — API client e hooks

- [x] 5.1 `whatsapp-integration-api.ts` (CRUD + status + pair + disconnect)
- [x] 5.2 `use-whatsapp-connection.ts` com polling e cleanup
- [x] 5.3 Tipos compartilhados em `packages/types` se necessário

## 6. Web — UI (skills: composition + taste + ux-pro-max)

- [x] 6.1 Compound `WhatsAppIntegration` provider + exports
- [x] 6.2 `ProviderPicker` com variantes explícitas por provedor
- [x] 6.3 Formulários `EvolutionConfigForm` e `MetaConfigForm`
- [x] 6.4 `ConnectionStatusBadge` + empty state
- [x] 6.5 `QrPairingDialog` com expiração e refresh (`bundle-dynamic-imports`)
- [x] 6.6 Integrar seção em `settings.tsx` mantendo card de timezone
- [x] 6.7 Exibir webhook URL read-only no card

## 7. Validação final

- [x] 7.1 Executar checklist manual do `design.md` (light + dark)
- [x] 7.2 `bun run lint` + `bun run build` (api + web)
- [x] 7.3 Confirmar DevTools: nenhum segredo completo nas respostas
