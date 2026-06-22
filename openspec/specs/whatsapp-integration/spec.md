## Purpose

Provider-agnostic WhatsApp, webhooks, idempotency, and session locks.

Migrated from legacy business rules: RN-011, RN-012.
Source of truth for new work: this file. Legacy copies remain at `docs/business-rules/`.
Traceability map: `docs/migration/rn-to-openspec-map.md`.

## Requirements

### Requirement: WhatsApp provider agnóstico (legacy: RN-011)
Toda comunicação com provedores de WhatsApp MUST ocorrer por meio de contratos canônicos (inbound/outbound/status) e adapters isolados por provedor. Use cases consomem apenas ports de domínio; a resolução do adapter correto ocorre via ProviderFactory com base na configuração da instância (tenant/instância), sem `if/else` de provedor em código de negócio.

#### Scenario: Mensagem inbound de qualquer provider
- **WHEN** Mensagem inbound de qualquer provider
- **THEN** Normalizada para `CanonicalInboundMessage` antes de chegar ao use case

#### Scenario: Envio de mensagem
- **WHEN** Envio de mensagem
- **THEN** Via `WhatsAppSenderPort` — use case não sabe qual provider está ativo

#### Scenario: Troca de provider de uma instância
- **WHEN** Troca de provider de uma instância
- **THEN** Apenas a coluna `provider` e `config` (JSONB) mudam — nenhum use case é alterado

#### Scenario: Provider desconhecido na factory
- **WHEN** Provider desconhecido na factory
- **THEN** Erro de compilação via switch exaustivo

#### Scenario: Validação de assinatura/token
- **WHEN** Validação de assinatura/token
- **THEN** Cada adapter implementa verificação própria; webhook rejeitado se inválido

> **Legacy:** [`RN-011`](../../docs/business-rules/RN-011-whatsapp-provider-agnostico.md) | **Status:** Ativa | **Domain:** Mensageria e Integração WhatsApp
> **Implemented in:** `sprint-04`
> **Related:** RN-007, RN-012, RN-013
### Requirement: Webhook idempotência e lock de sessão (legacy: RN-012)
Todo webhook recebido MUST passar por verificação de idempotência (por `provider + messageId`) antes de qualquer processamento. Toda sessão em processamento MUST ser protegida por lock distribuído no Valkey com TTL de 10 segundos, garantindo serialização de mensagens concorrentes e auto-release em caso de falha.

#### Scenario: Webhook já processado (mesma `provider + messageId`)
- **WHEN** Webhook já processado (mesma `provider + messageId`)
- **THEN** Retorna 200 sem processar novamente

#### Scenario: Webhook novo
- **WHEN** Webhook novo
- **THEN** Marca como processado e prossegue

#### Scenario: Lock de sessão já ativo
- **WHEN** Lock de sessão já ativo
- **THEN** Segunda mensagem aguarda ou retorna 429

#### Scenario: Processo falha antes de release
- **WHEN** Processo falha antes de release
- **THEN** Lock expira automaticamente após TTL (10s)

#### Scenario: TTL de idempotência
- **WHEN** TTL de idempotência
- **THEN** 24 horas — suficiente para cobrir retries de todos os providers

> **Legacy:** [`RN-012`](../../docs/business-rules/RN-012-webhook-idempotencia-lock-sessao.md) | **Status:** Ativa | **Domain:** Mensageria e Consistência de Estado
> **Implemented in:** `sprint-04`
> **Related:** RN-011, RN-013

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
