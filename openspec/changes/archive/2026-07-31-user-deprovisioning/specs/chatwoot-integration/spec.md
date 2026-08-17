## MODIFIED Requirements

### Requirement: Acesso ao Chatwoot via SSO Federado (legacy: RN-019)
The system MUST enforce the following: O acesso ao Chatwoot é feito via URL de login único emitida pela Platform API do Chatwoot a pedido do backend (`GET /platform/api/v1/users/{id}/login`), nunca por HMAC próprio. O frontend nunca armazena, gera ou vê tokens de acesso ao Chatwoot; o token retornado é de uso único e é reemitido a cada abertura. O espelho do usuário no Chatwoot é provisionado sob demanda e sempre entra como papel `agent` — nunca `administrator` — mesmo para usuários `admin` do Atende Fácil. Falha na emissão degrada para deep-link, nunca bloqueia o carregamento da conversa. A resolução do `ChatwootPlatformPort` MUST ser per-tenant: cada tenant federa na conta Chatwoot definida em sua própria config (`tenant_integrations`, provider `chatwoot`), nunca numa conta global compartilhada entre tenants. Tenant sem config própria usa fallback de env global (compatibilidade single-tenant). **Ao desativar ou remover um membership de tenant, o sistema MUST tentar revogar o acesso do espelho à conta Chatwoot daquele tenant** (`ChatwootPlatformPort.revokeUserFromAccount`) — best-effort: falha na revogação loga warn e NÃO bloqueia a deprovisão no Atende Fácil.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

#### Scenario: Tenant com config Chatwoot própria
- **WHEN** o tenant tem `tenant_integrations` (provider `chatwoot`) com `apiUrl`+`platformToken`+`accountId` completos
- **THEN** o espelho é criado e vinculado à conta do PRÓPRIO tenant, nunca à conta de outro tenant ou à conta global

#### Scenario: Tenant sem config Chatwoot própria
- **WHEN** o tenant não tem `tenant_integrations` cadastrada, ou a config está incompleta (falta `platformToken`)
- **THEN** o sistema usa o fallback de env global (`CHATWOOT_PLATFORM_TOKEN`/`CHATWOOT_API_URL`/`CHATWOOT_ACCOUNT_ID`), preservando o comportamento anterior

#### Scenario: Membership desativado ou removido com espelho Chatwoot existente
- **WHEN** um membership com `chatwootUserId` não-nulo é desativado (`suspended`) ou removido (hard delete)
- **THEN** o sistema chama `revokeUserFromAccount` para remover o usuário da conta Chatwoot daquele tenant

#### Scenario: Falha na revogação do Chatwoot
- **WHEN** `revokeUserFromAccount` falha (Chatwoot indisponível ou erro da Platform API)
- **THEN** o warn é logado com `correlationId`+`tenantId`, e a deprovisão no Atende Fácil (mudança de status ou remoção do membership) MUST prosseguir normalmente
