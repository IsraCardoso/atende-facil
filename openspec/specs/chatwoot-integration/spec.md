## Purpose

Human handoff, reverse webhooks, embedded inbox, and tenant config.

Migrated from legacy business rules: RN-013, RN-016, RN-017, RN-019, RN-026.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: Integração Chatwoot e hand-off humano (legacy: RN-013)
Quando o flow engine retorna `action.kind === 'transferred_to_human'`, o use case MUST: (1) criar conversa no Chatwoot via adapter, (2) enviar histórico de contexto, (3) persistir `chatwootConversationId` na sessão, (4) mudar `mode` para `waiting_human`, (5) publicar evento de domínio `ConversationHandedOff`. Mensagens em sessões `waiting_human` ou `human_active` devem ser roteadas exclusivamente para o Chatwoot, sem processar o flow engine.

#### Scenario: Nó `transfer` alcançado
- **WHEN** Nó `transfer` alcançado
- **THEN** Conversa criada no Chatwoot, sessão muda para `waiting_human`

#### Scenario: Mensagem em sessão `waiting_human`
- **WHEN** Mensagem em sessão `waiting_human`
- **THEN** Encaminhada para Chatwoot, engine não processado

#### Scenario: Mensagem em sessão `human_active`
- **WHEN** Mensagem em sessão `human_active`
- **THEN** Encaminhada para Chatwoot, engine não processado

#### Scenario: Chatwoot indisponível no hand-off
- **WHEN** Chatwoot indisponível no hand-off
- **THEN** Erro logado, sessão não muda de modo (fail-safe)

#### Scenario: Evento de domínio
- **WHEN** Evento de domínio
- **THEN** Publicado após persistência bem-sucedida, nunca antes

> **Legacy:** [`RN-013`](../../docs/business-rules/RN-013-integracao-chatwoot-handoff-humano.md) | **Status:** Ativa | **Domain:** Atendimento Humano e Integração Externa
> **Implemented in:** `sprint-04`
> **Related:** RN-009, RN-011, RN-012
### Requirement: Chatwoot webhook reverso e sincronização (legacy: RN-016)
The system MUST enforce the following: Toda comunicação humana passa obrigatoriamente pelo Chatwoot. O backend não expõe endpoint direto de envio humano. Webhooks do Chatwoot são autenticados por token fixo e processados por use cases dedicados.

#### Scenario: Agente envia mensagem no Chatwoot
- **WHEN** Agente envia mensagem no Chatwoot
- **THEN** Webhook `message_created` (outgoing) → backend envia ao WhatsApp via provider correto

#### Scenario: Conversa atribuída no Chatwoot
- **WHEN** Conversa atribuída no Chatwoot
- **THEN** Webhook `conversation_status_changed` (open) → conversation muda para `human_active`

#### Scenario: Conversa resolvida no Chatwoot
- **WHEN** Conversa resolvida no Chatwoot
- **THEN** Webhook `conversation_status_changed` (resolved) → conversation volta para `bot`, sessão reinicia

#### Scenario: Webhook com token inválido/ausente
- **WHEN** Webhook com token inválido/ausente
- **THEN** Resposta 401, nenhum processamento

#### Scenario: Webhook com evento desconhecido
- **WHEN** Webhook com evento desconhecido
- **THEN** Resposta 200, log debug, nenhum processamento

#### Scenario: Webhook com conversation não encontrada
- **WHEN** Webhook com conversation não encontrada
- **THEN** Log warn, resposta 200 (não causar retry do Chatwoot)

#### Scenario: Mensagem `incoming` no webhook (do cliente)
- **WHEN** Mensagem `incoming` no webhook (do cliente)
- **THEN** Ignorada — evita loop (o cliente já enviou via WhatsApp)

> **Legacy:** [`RN-016`](../../docs/business-rules/RN-016-chatwoot-webhook-reverso-sincronizacao.md) | **Status:** Ativa | **Domain:** Integração / Chatwoot
> **Implemented in:** `sprint-05`
> **Related:** RN-013, RN-014, RN-015
### Requirement: Inbox Chatwoot Embutido com Fallback Obrigatório (legacy: RN-017)
O painel de atendimento (Inbox) utiliza o Chatwoot como UI primária de chat, embutido via iframe. Toda implementação de Inbox MUST oferecer um mecanismo de fallback (deep-link direto para a conversa) caso o iframe não carregue.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: Acesso ao Chatwoot via SSO Federado (legacy: RN-019)
The system MUST enforce the following: O acesso ao Chatwoot é feito via URL de login único emitida pela Platform API do Chatwoot a pedido do backend (`GET /platform/api/v1/users/{id}/login`), nunca por HMAC próprio. O frontend nunca armazena, gera ou vê tokens de acesso ao Chatwoot; o token retornado é de uso único e é reemitido a cada abertura. O espelho do usuário no Chatwoot é provisionado sob demanda e sempre entra como papel `agent` — nunca `administrator` — mesmo para usuários `admin` do Atende Fácil. Falha na emissão degrada para deep-link, nunca bloqueia o carregamento da conversa.

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

### Requirement: Config Chatwoot por tenant (legacy: RN-026)
The system MUST enforce the following: 

#### Scenario: Default behavior
- **WHEN** the system operates under normal conditions
- **THEN** the rule above MUST be enforced

