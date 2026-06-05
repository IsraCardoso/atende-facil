## 1. API — Use case e rota

- [x] 1.1 Criar `GetIntegrationOperationalSummaryUseCase` (instância primária + status conexão + `flowRepository.findActiveByTenant` em paralelo)
- [x] 1.2 Testes unitários do use case (com/sem instância, com/sem fluxo ativo, Evolution indisponível)
- [x] 1.3 Rota `GET /integrations/operational-summary` com auth admin/manager
- [x] 1.4 Registrar use case no container/bootstrap (`index.ts`)

## 2. Web — Infraestrutura de erros e API client

- [x] 2.1 Helper `getApiErrorMessage` + tipo `ApiErrorBody` em `api-client.ts` ou util dedicado
- [x] 2.2 Mapa de códigos WhatsApp (`WHATSAPP_PLATFORM_UNAVAILABLE`, `EVOLUTION_PROVISION_FAILED`, etc.)
- [x] 2.3 `integration-operational-api.ts` + `useIntegrationOperationalSummary` hook

## 3. Web — Feedback nas ações WhatsApp

- [x] 3.1 `handleEnable`: Alert de erro/sucesso; tratar falha em `reload` inicial
- [x] 3.2 `handlePair` / `handleDisconnect`: Alert em falha
- [x] 3.3 Distinção visual "configurada" vs "conectada/operacional" no card

## 4. Web — Painel operacional (compound component)

- [x] 4.1 `IntegrationOperationalPanel` compound (`Summary`, `WhatsAppStatus`, `ActiveFlow`)
- [x] 4.2 Integrar painel em `settings.tsx` acima do card WhatsApp
- [x] 4.3 Estados: não ativada, aguardando conexão, conectada + fluxo/nenhum fluxo, erro com retry

## 5. Validação

- [x] 5.1 `bun run lint` + `bun run build -w api -w web`
- [x] 5.2 `npm test -w api -- --run` (novos + existentes)
- [x] 5.3 Testes manuais: ativar com Evolution down (erro visível), ativar com sucesso, conectar, ver fluxo ativo
