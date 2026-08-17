## MODIFIED Requirements

### Requirement: Acesso ao Chatwoot via SSO Federado (legacy: RN-019)
The system MUST enforce the following: O acesso ao Chatwoot é feito via URL de login único emitida pela Platform API do Chatwoot a pedido do backend (`GET /platform/api/v1/users/{id}/login`), nunca por HMAC próprio. O frontend nunca armazena, gera ou vê tokens de acesso ao Chatwoot; o token retornado é de uso único e é reemitido a cada abertura. O espelho do usuário no Chatwoot é provisionado sob demanda e sempre entra como papel `agent` — nunca `administrator` — mesmo para usuários `admin` do Atende Fácil. Falha na emissão degrada para deep-link, nunca bloqueia o carregamento da conversa. **A resolução do `ChatwootPlatformPort` MUST ser per-tenant**: cada tenant federa na conta Chatwoot definida em sua própria config (`tenant_integrations`, provider `chatwoot`), nunca numa conta global compartilhada entre tenants. Tenant sem config própria usa fallback de env global (compatibilidade single-tenant).

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Tenant com config Chatwoot própria
- **WHEN** o tenant tem `tenant_integrations` (provider `chatwoot`) com `apiUrl`+`platformToken`+`accountId` completos
- **THEN** o espelho é criado e vinculado à conta do PRÓPRIO tenant, nunca à conta de outro tenant ou à conta global

#### Scenario: Tenant sem config Chatwoot própria
- **WHEN** o tenant não tem `tenant_integrations` cadastrada, ou a config está incompleta (falta `platformToken`)
- **THEN** o sistema usa o fallback de env global (`CHATWOOT_PLATFORM_TOKEN`/`CHATWOOT_API_URL`/`CHATWOOT_ACCOUNT_ID`), preservando o comportamento anterior

### Requirement: Config Chatwoot por tenant (legacy: RN-026)
The system MUST enforce the following: Credenciais Chatwoot MUST ser armazenadas por tenant em `tenant_integrations` (`apiUrl`, `apiToken`, `accountId`, `inboxId`, `appUrl`, `ssoSecret`, `webhookToken`, `platformToken`). Use cases que precisam de `ChatwootPort` ou `ChatwootPlatformPort` MUST recebê-los via factory `(tenantId) => Port`, nunca como singleton global — a factory busca a config do tenant, cria o adapter e cacheia por `tenantId`, com fallback para env global quando o tenant não tem config própria. Isso vale tanto para o `ChatwootPort` de mensageria (RN-026 original) quanto para o `ChatwootPlatformPort` de emissão de SSO (RN-019).

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Tenant sem `platformToken` configurado
- **WHEN** a config do tenant tem `apiUrl`/`accountId`/`apiToken` (mensageria) mas não tem `platformToken`
- **THEN** o `ChatwootPort` de mensageria usa a config do tenant normalmente; o `ChatwootPlatformPort` de SSO cai no fallback de env global
