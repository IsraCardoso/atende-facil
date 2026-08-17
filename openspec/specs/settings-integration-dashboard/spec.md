## Purpose

Operational visibility for tenant integrations (WhatsApp connection and active flow) in settings and global shell.

Implemented in: `settings-integration-status-feedback`.

## Requirements

### Requirement: Painel operacional em Configurações
A página de Configurações MUST exibir um painel `IntegrationOperationalPanel` com resumo do estado operacional do tenant: integração WhatsApp configurada, status de conexão e fluxo conversacional ativo.

#### Scenario: Integração não configurada
- **WHEN** tenant não possui instância WhatsApp primária
- **THEN** painel exibe estado "Integração não ativada" com orientação para usar o card abaixo

#### Scenario: Integração configurada mas desconectada
- **WHEN** instância existe e status é `disconnected` ou `connecting`
- **THEN** painel exibe badge correspondente e instrução para concluir pareamento

#### Scenario: WhatsApp conectado com fluxo ativo
- **WHEN** status é `connected` e existe fluxo com status `active` no tenant
- **THEN** painel exibe "Fluxo ativo: {nome}" com link para `/flows`

#### Scenario: WhatsApp conectado sem fluxo ativo
- **WHEN** status é `connected` e não há fluxo ativo
- **THEN** painel exibe aviso "Nenhum fluxo ativo" com CTA link para `/flows`

#### Scenario: Erro ao carregar resumo
- **WHEN** `GET /integrations/operational-summary` falha
- **THEN** painel exibe Alert de erro com botão "Tentar novamente"

### Requirement: Endpoint de resumo operacional
A API MUST expor `GET /integrations/operational-summary` autenticado, retornando snapshot agregado do tenant extraído do token.

#### Scenario: Resposta com instância e fluxo
- **WHEN** admin/manager autenticado consulta o endpoint
- **THEN** retorna `200` com `whatsapp: { configured, connectionStatus, phone?, instanceId? }` e `activeFlow: { id, name } | null`

#### Scenario: Sem instância
- **WHEN** tenant não tem instância primária
- **THEN** retorna `whatsapp.configured: false` e `activeFlow` conforme banco (pode ser non-null independentemente)

#### Scenario: Isolamento multi-tenant
- **WHEN** qualquer consulta ao endpoint
- **THEN** dados filtrados exclusivamente pelo `tenant_id` do token

### Requirement: Indicadores operacionais na sidebar
O shell autenticado MUST exibir indicadores compactos de status WhatsApp e fluxo ativo acima do menu do tenant (`UserMenu`) na sidebar, visíveis em todas as páginas autenticadas.

#### Scenario: Sidebar expandida
- **WHEN** usuário autenticado visualiza a sidebar em modo expandido
- **THEN** exibe linhas "WhatsApp: {status}" e "Fluxo: {nome ou nenhum ativo}" acima do slug do tenant

#### Scenario: Sidebar recolhida
- **WHEN** sidebar está recolhida
- **THEN** exibe ícones com tooltip e bolinha de status semântica para WhatsApp e fluxo
