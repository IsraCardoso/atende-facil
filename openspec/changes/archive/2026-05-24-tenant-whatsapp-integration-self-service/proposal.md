## Why

Hoje o tenant não consegue escolher provedor WhatsApp, ver se a conexão está online nem parear o aparelho pelo Atende Fácil — tudo depende de scripts locais (`register-whatsapp-instance.ps1`, `evolution-qr.ps1`) e acesso direto ao banco/Evolution API. Isso bloqueia onboarding self-service e deixa o cliente sem visibilidade do estado da integração.

## What Changes

- Nova seção **Integração WhatsApp** em Configurações (`/settings`): escolher provedor, cadastrar credenciais mínimas e definir instância ativa do tenant.
- Indicador de status em tempo quase real: `conectado`, `desconectado`, `conectando`, `erro` (com mensagem acionável).
- Fluxo de pareamento in-app para provedores que usam QR (Evolution como MVP); Meta Cloud com formulário de credenciais + validação.
- API autenticada para CRUD de `whatsapp_instances` (tenant do token), consulta de status e geração/refresh de QR — sem expor `apiKey`/tokens completos na resposta.
- Port `WhatsAppConnectionPort` por provedor (Strategy + Adapter), isolado em `infrastructure`; use cases não conhecem Evolution.
- Polling leve no frontend (`client-swr-dedup` / intervalo configurável) enquanto status for `connecting`.
- Documentar variáveis de ambiente necessárias no `.env.example` (URL base Evolution compartilhada, se aplicável).

## Capabilities

### New Capabilities

- `tenant-whatsapp-self-service`: UI admin para escolher provedor, configurar instância, ver status de conexão e parear WhatsApp sem sair do produto.

### Modified Capabilities

- `whatsapp-integration`: novos requisitos de gestão de instância por tenant, port de conexão/status e mascaramento de segredos na borda HTTP.
- `configuration`: página de configurações passa a incluir integração WhatsApp além de timezone.

## Impact

- **API:** novos use cases (`ListWhatsAppInstances`, `UpsertWhatsAppInstance`, `GetConnectionStatus`, `StartWhatsAppPairing`), rotas HTTP em `/integrations/whatsapp`, extensão de `WhatsAppInstanceRepositoryPort` (list/save/activate).
- **Infrastructure:** adapters Evolution (connection state + QR), stubs ou implementação mínima para Z-API/Uazapi/Meta conforme capacidade de cada um.
- **Web:** `settings.tsx` ou sub-rota `/settings/integrations`; componentes compostos (`IntegrationCard`, `ProviderPicker`, `ConnectionStatus`, `QrPairingDialog`).
- **DB:** possível coluna `display_name` ou `is_primary` em `whatsapp_instances`; migration versionada se necessário.
- **Segurança:** credenciais só em JSONB server-side; respostas API com campos mascarados; rate limit nos endpoints de QR/status.
- **Skills de implementação (obrigatórias na execução):** `ui-ux-pro-max`, `react-best-practices`, `react-composition-patterns`, `taste-skill` (dial: B2B admin, density 5–6, motion 3–4).
