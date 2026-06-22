## ADDED Requirements

### Requirement: Documentação Evolution em exemplos de ambiente (legacy: RN-002)
Todos os arquivos `.env.example`, `.env.development.example`, `.env.staging.example` e `.env.production.example` MUST listar `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `PUBLIC_API_URL` e, quando aplicável ao compose de produção, `EVOLUTION_PUBLIC_URL` — com comentários explicando o pareamento com `infra/docker-compose.yml` e Coolify, sem valores secretos reais em produção.

#### Scenario: `.env.development.example`
- **WHEN** desenvolvedor copia o arquivo para `.env`
- **THEN** encontra bloco WhatsApp/Evolution com valores de exemplo alinhados ao compose local (`8081`, `atende-facil-evo-key`) e nota sobre `PUBLIC_API_URL` para webhooks

#### Scenario: `.env.production.example`
- **WHEN** operador configura Coolify
- **THEN** encontra `PUBLIC_API_URL=https://api.seudominio.com`, `EVOLUTION_API_URL` (URL interna ou pública conforme topologia) e `EVOLUTION_PUBLIC_URL` para `SERVER_URL` da Evolution

#### Scenario: Compose de produção
- **WHEN** `infra/docker-compose.production.yml` define serviço `api`
- **THEN** environment inclui `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `PUBLIC_API_URL` propagados de variáveis do host
