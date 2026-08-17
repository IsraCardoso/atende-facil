## ADDED Requirements

### Requirement: Feedback explícito nas ações self-service WhatsApp
Toda ação de integração WhatsApp na UI (ativar, parear, desconectar, atualizar status) MUST fornecer feedback visual imediato: estado de loading, mensagem de sucesso quando aplicável e mensagem de erro legível quando a API retorna falha — nunca falha silenciosa.

#### Scenario: Ativar integração com sucesso
- **WHEN** usuário clica "Ativar integração" e API retorna `201`
- **THEN** UI sai do empty state, exibe card da instância e feedback de sucesso discreto (Alert success ou texto confirmatório)

#### Scenario: Ativar integração com falha
- **WHEN** usuário clica "Ativar integração" e API retorna erro (ex.: `503`, `502`, `403`)
- **THEN** botão volta ao estado normal e Alert exibe mensagem mapeada do `code`/`error` sem recarregar a página

#### Scenario: Parear com falha
- **WHEN** usuário inicia pareamento e API retorna erro
- **THEN** Alert exibe motivo e opção de tentar novamente

#### Scenario: Listagem de instâncias com falha
- **WHEN** `GET /integrations/whatsapp/instances` falha no carregamento inicial
- **THEN** exibe estado de erro com retry em vez de empty state enganoso

### Requirement: Indicador de integração operacionalmente ativa
Quando a instância WhatsApp está configurada e `connectionStatus` é `connected`, a UI MUST exibir indicador persistente de "Integração ativa" (badge ou banner de sucesso) distinguível de apenas "instância criada".

#### Scenario: Conexão estabelecida
- **WHEN** status muda para `connected`
- **THEN** badge verde "Conectado" permanece visível no card e no painel operacional

#### Scenario: Instância criada mas desconectada
- **WHEN** instância existe com status `disconnected`
- **THEN** UI indica "Integração configurada — aguardando conexão" (não confundir com "ativa/operacional")
