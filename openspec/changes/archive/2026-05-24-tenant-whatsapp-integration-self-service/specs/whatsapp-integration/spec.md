## ADDED Requirements

### Requirement: Gestão de instâncias WhatsApp por tenant
O sistema MUST expor operações de domínio para listar, criar, atualizar e ativar instâncias WhatsApp isoladas por `tenant_id`, persistidas em `whatsapp_instances`, consumidas pela UI admin e pelos webhooks existentes.

#### Scenario: Listar instâncias do tenant
- **WHEN** use case `ListWhatsAppInstances` é invocado com `tenantId` do token
- **THEN** retorna todas as instâncias do tenant com `provider`, `active`, `config` mascarada e metadados

#### Scenario: Criar instância
- **WHEN** tenant salva nova instância com provider e config válidos
- **THEN** registro é persistido com `tenant_id` do token e `active=true` (ou conforme regra de instância primária)

#### Scenario: Ativar instância única
- **WHEN** tenant define uma instância como ativa/primária
- **THEN** demais instâncias do mesmo tenant ficam `active=false` (uma instância ativa por tenant no MVP)

#### Scenario: tenant_id do body ignorado
- **WHEN** requisição HTTP inclui `tenantId` no corpo
- **THEN** sistema usa exclusivamente `tenant_id` extraído do JWT autenticado

### Requirement: Port de conexão e status por provedor
Além de envio/normalização, cada provedor MUST implementar `WhatsAppConnectionPort` com consulta de estado e pareamento (quando aplicável), resolvido via factory — sem lógica de Evolution em use cases.

#### Scenario: Consulta de status Evolution
- **WHEN** use case solicita status de instância Evolution configurada
- **THEN** adapter chama API do provedor (`connectionState`) e normaliza para enum canônico `WhatsAppConnectionStatus`

#### Scenario: Geração de QR Evolution
- **WHEN** use case solicita início de pareamento para Evolution desconectada
- **THEN** adapter retorna `{ status: 'connecting', qrBase64, expiresAt }` ou erro tipado

#### Scenario: Provedor sem QR
- **WHEN** provedor é Meta Cloud API
- **THEN** port retorna status baseado em validação de credenciais/webhook, sem QR

#### Scenario: Provider desconhecido
- **WHEN** factory recebe provider não mapeado
- **THEN** erro de compilação ou runtime tipado `UNSUPPORTED_PROVIDER` na borda HTTP

### Requirement: Endpoints HTTP autenticados de integração
A API MUST expor rotas REST autenticadas sob prefixo `/integrations/whatsapp` com rate limit, validação de input e respostas `{ data }` / `{ error, code }`.

#### Scenario: GET status
- **WHEN** `GET /integrations/whatsapp/instances/:id/status`
- **THEN** retorna `{ status, phone?, reason? }` normalizado

#### Scenario: POST pareamento
- **WHEN** `POST /integrations/whatsapp/instances/:id/pair`
- **THEN** retorna QR ou confirma fluxo do provedor; 429 se rate limit excedido

#### Scenario: Instância de outro tenant
- **WHEN** `:id` pertence a outro tenant
- **THEN** retorna 404 (não vazar existência cross-tenant)
