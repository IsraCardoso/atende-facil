## ADDED Requirements

### Requirement: Chatwoot portal URL without conversation
The API MUST expose an authenticated endpoint that returns a portal URL for the tenant's Chatwoot account so agents can open the Chatwoot UI even when no conversation is selected in Atende Fácil. Secrets MUST NOT be exposed to the frontend.

#### Scenario: Chatwoot configured
- **WHEN** authenticated user calls the portal endpoint and `CHATWOOT_APP_URL` is set
- **THEN** response MUST include `portalUrl` pointing to the account dashboard (or conversations list) in Chatwoot

#### Scenario: Chatwoot not configured
- **WHEN** authenticated user calls the portal endpoint and Chatwoot is not configured
- **THEN** response MUST return `portalUrl: null` with a human-readable `reason`

## MODIFIED Requirements

### Requirement: Inbox Chatwoot Embutido com Fallback Obrigatório (legacy: RN-017)
O painel de atendimento (Inbox) utiliza o Chatwoot como UI primária de chat, embutido via iframe. Toda implementação de Inbox MUST oferecer um mecanismo de fallback (deep-link direto para a conversa) caso o iframe não carregue. When no conversation is selected, Inbox MUST still offer portal access to Chatwoot when configured.

#### Scenario: Fallback on iframe failure
- **WHEN** iframe fails to load for a selected conversation
- **THEN** user MUST see deep-link to open that conversation in Chatwoot

#### Scenario: Empty inbox portal
- **WHEN** no conversation is selected and Chatwoot is configured
- **THEN** user MUST see action to open Chatwoot portal without selecting a conversation first
