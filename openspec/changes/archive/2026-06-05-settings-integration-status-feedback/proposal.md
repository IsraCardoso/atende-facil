## Why

O botão **"Ativar integração"** em Configurações não oferece feedback quando a API falha (Evolution indisponível, migration pendente, permissão negada ou erro de provisionamento), dando a impressão de que "não faz nada". Além disso, mesmo após ativar com sucesso, falta um painel operacional claro que indique se a integração está **realmente operacional** (conectada) e qual **fluxo conversacional** está ativo no tenant — informações essenciais para o admin validar que o atendimento automatizado funcionará.

## What Changes

- Corrigir fluxo de ativação com feedback explícito: loading, sucesso e erro com mensagem acionável (sem falhas silenciosas).
- Exibir indicador persistente de **integração configurada** vs **WhatsApp conectado** (badge + resumo textual).
- Quando a integração estiver conectada, exibir **fluxo ativo** do tenant (nome + link) ou aviso **"Nenhum fluxo ativo"** com CTA para Fluxos.
- Novo endpoint agregado `GET /integrations/operational-summary` (status WhatsApp + fluxo ativo em uma chamada) para evitar waterfall no cliente.
- Melhorar tratamento de erros em `listInstances`, `createInstance`, `startPairing` e `disconnect` na UI.
- Componente compound `IntegrationOperationalPanel` em Settings seguindo react-composition-patterns, com UX polida (ui-ux-pro-max + taste-skill).

## Capabilities

### New Capabilities

- `settings-integration-dashboard`: painel operacional em Configurações com resumo de integração WhatsApp e fluxo ativo.

### Modified Capabilities

- `whatsapp-integration`: requisitos de feedback de erro/sucesso nas ações self-service e visibilidade do estado operacional.
- `flows`: exposição do fluxo ativo no contexto de integração (read-only summary para admin).

## Impact

- **API:** novo use case + rota `GET /integrations/operational-summary`; possível extensão de mensagens de erro em `POST /integrations/whatsapp/instances`.
- **Web:** `whatsapp-integration.tsx`, novo painel operacional, hook `use-integration-operational-summary`, melhorias em `api-client` para extrair `error`/`code` de respostas.
- **Packages:** tipos compartilhados em `@atende-facil/types` (se necessário).
- **Specs:** deltas em `whatsapp-integration` e `flows`; nova spec `settings-integration-dashboard`.
- **Sem breaking changes** em contratos públicos existentes.
