## Purpose

Runtime da Evolution API gerenciada pela plataforma: variáveis de ambiente, webhooks alcançáveis e diagnóstico operacional.

## Requirements

### Requirement: Variáveis obrigatórias para Evolution gerenciada
Quando `DEV_MOCK_WHATSAPP_SEND=false`, a API MUST carregar `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` não vazios para habilitar ligar/desligar instâncias Evolution. `PUBLIC_API_URL` MUST ser alcançável pelo container Evolution para webhooks.

#### Scenario: Dev local com infra Docker
- **WHEN** desenvolvedor sobe `bun run infra:up` e API com `DEV_MOCK_WHATSAPP_SEND=false`
- **THEN** `.env.development.example` documenta `EVOLUTION_API_URL=http://localhost:8081`, `EVOLUTION_API_KEY=atende-facil-evo-key` e `PUBLIC_API_URL` com host acessível pela Evolution

#### Scenario: Variáveis ausentes
- **WHEN** `EVOLUTION_API_URL` ou `EVOLUTION_API_KEY` estão ausentes
- **THEN** operações de ligar integração retornam `503 WHATSAPP_PLATFORM_UNAVAILABLE`

#### Scenario: Produção Coolify
- **WHEN** stack sobe via compose ou Coolify
- **THEN** serviço `api` recebe `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `PUBLIC_API_URL`; keys coincidem entre API e Evolution

### Requirement: Webhook callback alcançável pela Evolution
Webhook `{PUBLIC_API_URL}/webhook/{tenantId}/whatsapp/{instanceId}` MUST ser resolvível a partir do container Evolution.

#### Scenario: API no host, Evolution no Docker (dev)
- **WHEN** API em `localhost:3000` e Evolution em container
- **THEN** `PUBLIC_API_URL` usa `host.docker.internal` ou equivalente documentado

#### Scenario: Produção
- **WHEN** API em `https://api.seudominio.com`
- **THEN** Evolution consegue POST no webhook após ligar integração

### Requirement: Diagnóstico de plataforma Evolution
`GET /integrations/operational-summary` MUST incluir `platform: { available, reason? }` refletindo config Evolution válida.

#### Scenario: Plataforma configurada
- **WHEN** credenciais presentes
- **THEN** `platform.available: true`

#### Scenario: Plataforma não configurada
- **WHEN** credenciais ausentes
- **THEN** `platform.available: false` com `reason` sem expor segredos

### Requirement: Verificação operacional local
Repositório MUST fornecer script/comando que valida Evolution + apikey antes do fluxo UI.

#### Scenario: Verificação OK
- **WHEN** `verify-evolution` após `infra:up` e `.env` correto
- **THEN** confirma Evolution acessível e orienta ativar na UI

#### Scenario: Key incorreta
- **WHEN** `EVOLUTION_API_KEY` diverge do compose
- **THEN** verificador reporta falha de autenticação

### Requirement: Fluxo E2E documentado sem scripts obrigatórios
Guia de desenvolvimento local MUST descrever ciclo completo pela UI: infra → env → login → Ativar → QR → mensagem teste → Desconectar → Desativar.

#### Scenario: Onboarding novo desenvolvedor
- **WHEN** segue o guia atualizado
- **THEN** consegue parear WhatsApp sem `register-whatsapp-instance.ps1` ou `evolution-qr.ps1`
