## ADDED Requirements

### Requirement: Tenant escolhe provedor WhatsApp na UI
O sistema MUST permitir que um usuário autenticado do tenant selecione e configure uma instância WhatsApp em Configurações, escolhendo entre os provedores suportados (`evolution`, `zapi`, `uazapi`, `meta`), sem scripts manuais nem acesso ao banco.

#### Scenario: Primeira configuração sem instância
- **WHEN** tenant autenticado acessa Configurações → Integração WhatsApp e não possui instância ativa
- **THEN** exibe empty state com CTA para adicionar integração e lista de provedores disponíveis

#### Scenario: Seleção de provedor Evolution
- **WHEN** usuário escolhe Evolution e informa `instanceName` (e credenciais exigidas pelo ambiente)
- **THEN** sistema persiste instância vinculada ao `tenant_id` do token e exibe card da integração

#### Scenario: Troca de provedor
- **WHEN** usuário altera o provedor de uma instância existente
- **THEN** formulário exibe campos específicos do novo provedor e invalida pareamento anterior até nova configuração

### Requirement: Status de conexão visível e acionável
A UI MUST exibir o estado atual da integração ativa com badge semântico (`connected`, `disconnected`, `connecting`, `error`) e texto de ajuda quando desconectado ou em erro.

#### Scenario: WhatsApp conectado
- **WHEN** API retorna status `connected`
- **THEN** badge verde "Conectado" e número/identificador mascarado quando disponível

#### Scenario: WhatsApp desconectado
- **WHEN** API retorna status `disconnected`
- **THEN** badge neutro "Desconectado" e CTA primário "Conectar WhatsApp"

#### Scenario: Pareamento em andamento
- **WHEN** API retorna status `connecting`
- **THEN** badge âmbar "Aguardando leitura do QR" e polling automático a cada 3–5s até `connected` ou timeout

#### Scenario: Erro de integração
- **WHEN** API retorna status `error` com `reason`
- **THEN** badge vermelho, mensagem legível e ação "Tentar novamente"

### Requirement: Pareamento WhatsApp in-app (QR)
Para provedores com pareamento por QR (Evolution como MVP), o sistema MUST permitir iniciar conexão e exibir QR code dentro do Atende Fácil, com expiração e refresh.

#### Scenario: Iniciar pareamento
- **WHEN** usuário clica "Conectar WhatsApp" em instância Evolution desconectada
- **THEN** abre dialog com QR base64, instruções de leitura no aparelho e contador de expiração (~60s)

#### Scenario: QR expirado
- **WHEN** QR expira antes da leitura
- **THEN** exibe aviso e botão "Gerar novo QR" sem recarregar a página inteira

#### Scenario: Pareamento concluído
- **WHEN** status muda para `connected` durante polling
- **THEN** dialog fecha (ou mostra sucesso) e card atualiza para Conectado

#### Scenario: Desconectar
- **WHEN** usuário confirma desconexão
- **THEN** sistema chama logout no provedor (quando suportado) e status volta para `disconnected`

### Requirement: Segredos nunca expostos ao frontend
Respostas da API e estado da UI MUST mascarar credenciais (`apiKey`, `accessToken`, etc.); apenas flags `hasApiKey` ou sufixos (`••••1234`) são permitidos.

#### Scenario: Listagem de instâncias
- **WHEN** frontend lista instâncias do tenant
- **THEN** payload não contém valores completos de segredos

#### Scenario: Edição parcial de credencial
- **WHEN** usuário salva formulário deixando campo de token em branco
- **THEN** backend preserva valor existente sem sobrescrever com vazio
