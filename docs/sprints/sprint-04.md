# Sprint 04 — Integração WhatsApp (Agnóstica de Provedor) + Chatwoot

> **Período:** 06/04 até 13/04 | **Status:** `Em andamento`

---

# GESTÃO

## Objetivo da Sprint

> *Mensagens reais do WhatsApp chegam ao sistema, são processadas pelo flow engine e respostas são enviadas de volta ao usuário, com suporte a múltiplos provedores por tenant/instância e hand-off para atendimento humano via Chatwoot.*

Entregar a camada de mensageria no `infrastructure` da API com Ports/Adapters para 4 provedores (Evolution API, Z-API, Uazapi, Meta Cloud API), resolução dinâmica por instância/tenant, processamento fim-a-fim com lock de sessão e idempotência de webhook, e integração com Chatwoot como camada de atendimento humano desacoplada.

---

## Fluxo oficial de documentação (IA)

1. O usuário informa descrição e detalhes da próxima sprint.
2. A IA faz perguntas de clarificação (somente o necessário) e preenche esta doc de sprint.
3. O usuário revisa e aprova a sprint.
4. Somente após aprovação, a IA cria/atualiza as RNs em `docs/business-rules/`.

> **Importante:** não transferir nem detalhar RNs antes da aprovação explícita da sprint.

---

## Entregáveis

| # | Entregável | Critério de conclusão |
|---|---|---|
| 1 | Contratos canônicos inbound/outbound/status | Tipos exportados sem `any`, sem dependência de SDK de provider |
| 2 | Tabelas `sessions` e `whatsapp_instances` | Migration gerada e aplicável, índices em `tenant_id`, `phone`, `status` |
| 3 | 4 adapters de provider completos | Evolution, Z-API, Uazapi e Meta com normalização de payload e envio |
| 4 | ProviderFactory com resolução dinâmica | Adapter correto resolvido por config da instância, sem `if/else` em use case |
| 5 | Lock de sessão no Valkey | TTL 10s, release seguro, serialização de mensagens concorrentes |
| 6 | Idempotência de webhook | Reprocessar mesmo evento não gera duplicação |
| 7 | ProcessIncomingMessageUseCase | Fluxo completo: sessão → engine → resposta → persistência |
| 8 | Integração Chatwoot (hand-off) | Criar conversa, enviar histórico, rotear mensagens em modo não-bot |
| 9 | Endpoints webhook seguros | `POST /webhook/:tenantId/whatsapp/:instanceId` + verificação Meta |
| 10 | Testes de integração e contrato | Suíte cobrindo 2+ providers, idempotência, lock e Chatwoot |

---

## Regras de Negócio desta Sprint

- [RN-011 — WhatsApp provider agnóstico](../business-rules/RN-011-whatsapp-provider-agnostico.md)
- [RN-012 — Webhook idempotência e lock de sessão](../business-rules/RN-012-webhook-idempotencia-lock-sessao.md)
- [RN-013 — Integração Chatwoot e hand-off humano](../business-rules/RN-013-integracao-chatwoot-handoff-humano.md)

---

## Fora do Escopo

- ❌ Dashboard frontend de gerenciamento de instâncias WhatsApp
- ❌ Editor visual de fluxos no frontend
- ❌ IA generativa para resposta automática (RAG)
- ❌ Suporte a mídia (imagens, áudio, vídeo) — apenas texto nesta sprint
- ❌ Painel de atendimento humano próprio (usa Chatwoot)
- ❌ Agendamento de fluxos por horário
- ❌ Migração dos repositórios in-memory de auth para Drizzle (sprint futura)

---

## Métricas de Sucesso

- [ ] Mensagem de texto recebida via webhook é processada pelo engine e resposta enviada ao WhatsApp
- [ ] Troca de provider não requer alteração em use cases
- [ ] Webhook duplicado não gera efeito colateral
- [ ] Múltiplas mensagens simultâneas da mesma sessão são serializadas
- [ ] Hand-off para Chatwoot funciona com criação de conversa e envio de histórico
- [ ] Mensagens em sessão `waiting_human`/`human_active` são roteadas para Chatwoot
- [ ] `bun run build`, `bun run test` e `bun run lint` passando no monorepo

---

# ENGENHARIA

> **Instrução para a IA:** Leia o Plano de Execução antes de começar. Execute um set por vez. Após cada set, apresente o checkpoint e aguarde instrução do usuário.
> **Eficiência de contexto:** quando houver arquivos grandes, usar leitura incremental.

---

## Plano de Execução

```
Rodada 1: [SET-A: Fundação de Domínio e Persistência]
Rodada 2: [SET-B: Camada Agnóstica de Provider]
Rodada 3: [SET-C: Sessão, Lock e Idempotência]
Rodada 4: [SET-D: Orquestração Principal e Chatwoot]
Rodada 5: [SET-E: Endpoints Webhook e Wiring DI]
Rodada 6: [SET-F: Testes Integrados e Fechamento de Qualidade]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06 | SET-A | — |
| SET-C | T07, T08, T09 | SET-A | — |
| SET-D | T10, T11, T12 | SET-B, SET-C | — |
| SET-E | T13, T14, T15 | SET-D | — |
| SET-F | T16, T17, T18 | SET-E | — |

---

## SET-A — Fundação de Domínio e Persistência

> 🎯 **Escopo estimado:** ~450 linhas | **Complexidade:** Média
> **Racional:** Estabelecer os tipos canônicos, ports de domínio e schema de banco que todos os sets subsequentes consomem.

---

### T01 — Definir contratos canônicos de mensageria WhatsApp

**Contexto:** Sem contratos canônicos, cada adapter definiria tipos próprios e o use case ficaria acoplado a payloads nativos de provider.

**O que fazer:**
- [ ] Criar tipo `CanonicalInboundMessage` com campos: `messageId`, `from` (phone), `text`, `timestamp`, `provider`, `rawPayload`
- [ ] Criar tipo `CanonicalOutboundMessage` com campos: `to` (phone), `text`, `instanceId`
- [ ] Criar tipo `CanonicalDeliveryStatus` com campos: `messageId`, `status` (sent/delivered/read/failed), `timestamp`
- [ ] Criar enum `WhatsAppProvider` como union: `"evolution" | "zapi" | "uazapi" | "meta"`
- [ ] Criar tipo `WhatsAppInstanceConfig` com campos por provider (JSONB-safe)

**Critérios de Aceite:**
- [ ] Tipos não dependem de SDK ou lib externa
- [ ] Sem `any` em nenhum contrato
- [ ] Contratos exportados via barrel file

**Notas técnicas:**
> `rawPayload` é `Readonly<Record<string, unknown>>` para preservar dados nativos sem tipagem forte do provider no domínio.

---

### T02 — Definir ports de domínio para sessão, instância, lock e idempotência

**Contexto:** Os use cases precisam consumir sessão, instância, lock e idempotência por interface — implementações concretas ficam no infrastructure.

**O que fazer:**
- [ ] Criar `SessionRepositoryPort` com: `findByTenantAndPhone`, `save`, `updateMode`
- [ ] Criar `WhatsAppInstanceRepositoryPort` com: `findByTenantAndId`, `findActiveByTenant`
- [ ] Criar `SessionLockPort` com: `acquire(tenantId, phone, ttlMs)`, `release(tenantId, phone)`
- [ ] Criar `WebhookIdempotencyPort` com: `isProcessed(provider, messageId)`, `markProcessed(provider, messageId, ttlSeconds)`
- [ ] Criar `WhatsAppSenderPort` com: `sendText(config, message): Promise<CanonicalDeliveryStatus>`
- [ ] Criar `ChatwootPort` com: `createConversation`, `sendMessage`, `findConversationBySessionId`

**Critérios de Aceite:**
- [ ] Ports pertencem ao `domain/ports`
- [ ] Nenhum port importa infraestrutura
- [ ] Tipos de retorno são canônicos

**Notas técnicas:**
> Lock retorna `boolean` em `acquire` (true = adquirido). Release é fire-and-forget seguro.

---

### T03 — Criar tabelas `sessions` e `whatsapp_instances` com migration

**Contexto:** O banco precisa persistir sessões conversacionais e configuração de instâncias WhatsApp por tenant.

**O que fazer:**
- [ ] Criar schema `sessions` com: `id`, `tenant_id`, `phone`, `current_node_id`, `mode`, `data` (JSONB), `flow_id`, `chatwoot_conversation_id`, `created_at`, `updated_at`
- [ ] Criar schema `whatsapp_instances` com: `id`, `tenant_id`, `provider` (enum), `config` (JSONB), `active`, `created_at`, `updated_at`
- [ ] Adicionar índices: `tenant_id`, `phone`, `status` em sessions; `tenant_id` em whatsapp_instances
- [ ] Adicionar unique constraint `(tenant_id, phone)` em sessions
- [ ] Exportar novos schemas via `packages/db/src/schema/index.ts`
- [ ] Gerar migration via `bun run db:generate`

**Critérios de Aceite:**
- [ ] Migration gerada sem erros
- [ ] Índices presentes para queries frequentes
- [ ] Schema segue convenção snake_case e tem `tenant_id` obrigatório
- [ ] Build do `packages/db` passa

**Notas técnicas:**
> `data` em JSONB reflete `Session.data` do flow engine. `config` em JSONB armazena credenciais/endpoints por provider — nunca é exposto em APIs públicas.

---

## SET-B — Camada Agnóstica de Provider (Ports/Adapters + Factory)

> 🎯 **Escopo estimado:** ~600 linhas | **Complexidade:** Alta
> **Racional:** Implementar os 4 adapters e a factory de resolução dinâmica é o maior bloco de código da sprint e elimina vendor lock-in.

---

### T04 — Implementar ProviderFactory e normalização canônica

**Contexto:** O use case não deve saber qual provider está ativo; a factory resolve o adapter correto a partir da config da instância.

**O que fazer:**
- [ ] Criar `ProviderFactory` que recebe `WhatsAppInstanceConfig` e retorna `WhatsAppSenderPort` + `InboundNormalizer`
- [ ] Criar tipo `InboundNormalizer` com: `normalize(rawPayload: unknown): CanonicalInboundMessage | null`
- [ ] Criar tipo `WebhookVerifier` com: `verify(request: WebhookVerificationInput): WebhookVerificationResult`
- [ ] Factory usa switch exaustivo por `WhatsAppProvider` — sem `if/else`
- [ ] Garantir que factory é injetável via DI

**Critérios de Aceite:**
- [ ] Provider inválido causa erro explícito em compilação (exaustive switch)
- [ ] Factory não importa SDK de nenhum provider
- [ ] Tipagem garante que cada adapter implementa os mesmos ports

**Notas técnicas:**
> Factory retorna um objeto `ProviderBundle` contendo sender, normalizer e verifier para cada provider.

---

### T05 — Implementar adapters Evolution API e Meta Cloud API

**Contexto:** Evolution é o provider inicial de uso; Meta é o oficial do WhatsApp e o mais exigente em verificação de webhook.

**O que fazer:**
- [ ] Implementar `EvolutionAdapter` que: normaliza webhook inbound, envia texto via `POST /message/sendText/:instanceName`, valida header `apikey`
- [ ] Implementar `MetaCloudAdapter` que: normaliza webhook `entry[].changes[].value`, envia via `POST /{version}/{phone-number-id}/messages` com `Bearer`, implementa challenge `hub.mode`/`hub.verify_token`/`hub.challenge`
- [ ] Ambos implementam `WhatsAppSenderPort` e `InboundNormalizer`
- [ ] Nenhum adapter importa outro adapter ou use case

**Critérios de Aceite:**
- [ ] Normalização converte payload nativo para `CanonicalInboundMessage`
- [ ] Envio retorna `CanonicalDeliveryStatus`
- [ ] Validação de assinatura/token implementada por provider
- [ ] Testes unitários de normalização com payloads fixture

**Notas técnicas:**
> Evolution: autenticação por header `apikey`. Meta: `Authorization: Bearer {token}`, webhook com `hub.mode=subscribe`.

---

### T06 — Implementar adapters Z-API e Uazapi

**Contexto:** Z-API e Uazapi são alternativas populares no Brasil e completam a cobertura de 4 providers.

**O que fazer:**
- [ ] Implementar `ZapiAdapter` que: normaliza webhooks por tipo (`received`, `delivery`, `status`), envia via `POST /instances/{instance}/token/{token}/send-text`, valida `Client-Token`
- [ ] Implementar `UazapiAdapter` que: normaliza webhooks via endpoints V2, envia via `POST /send/text` com base `https://{subdomain}.uazapi.com`, valida headers de segurança
- [ ] Ambos implementam `WhatsAppSenderPort` e `InboundNormalizer`

**Critérios de Aceite:**
- [ ] Mesma suíte de contrato que Evolution/Meta
- [ ] Normalização para `CanonicalInboundMessage` consistente
- [ ] Testes unitários com fixtures de payload por provider

**Notas técnicas:**
> Z-API: segurança adicional por `Client-Token` no header. Uazapi: base URL por subdomínio.

---

## SET-C — Sessão, Lock e Idempotência Operacional

> 🎯 **Escopo estimado:** ~400 linhas | **Complexidade:** Média-Alta
> **Racional:** Garantir consistência de estado quando múltiplas mensagens chegam simultaneamente.

---

### T07 — Implementar SessionRepository e WhatsAppInstanceRepository concretos

**Contexto:** Os ports de domínio precisam de implementações concretas para persistir e consultar dados.

**O que fazer:**
- [ ] Implementar `DrizzleSessionRepository` que satisfaz `SessionRepositoryPort`
- [ ] Implementar `DrizzleWhatsAppInstanceRepository` que satisfaz `WhatsAppInstanceRepositoryPort`
- [ ] Garantir filtro de `tenant_id` em todas as queries
- [ ] Implementar `InMemorySessionRepository` e `InMemoryWhatsAppInstanceRepository` para testes

**Critérios de Aceite:**
- [ ] Repositories pertencem ao `infrastructure`
- [ ] `tenant_id` é filtro obrigatório — nunca query sem tenant
- [ ] Testes unitários com implementação in-memory

**Notas técnicas:**
> Repositories concretos usam Drizzle ORM via `DatabaseConnection` já existente no `packages/db`.

---

### T08 — Implementar lock distribuído de sessão no Valkey

**Contexto:** Mensagens simultâneas do mesmo usuário devem ser serializadas para evitar estado inconsistente.

**O que fazer:**
- [ ] Implementar `ValkeySessionLockAdapter` que satisfaz `SessionLockPort`
- [ ] Lock usa `SET NX EX` com chave `session-lock:{tenantId}:{phone}` e TTL 10s
- [ ] Release usa `DEL` com verificação de ownership (valor = random token)
- [ ] Implementar `InMemorySessionLockAdapter` para testes

**Critérios de Aceite:**
- [ ] Acquire retorna `false` se lock já existe
- [ ] Release não falha se lock não existe
- [ ] TTL garante auto-release em caso de crash
- [ ] Testes cobrem acquire/release/expiry

**Notas técnicas:**
> Pattern clássico de lock distribuído: SET key randomValue NX EX ttl → se OK, lock adquirido. DEL apenas se valor = randomValue.

---

### T09 — Implementar idempotência de webhook

**Contexto:** Providers podem reenviar o mesmo webhook; processar duas vezes geraria mensagens duplicadas.

**O que fazer:**
- [ ] Implementar `ValkeyWebhookIdempotencyAdapter` que satisfaz `WebhookIdempotencyPort`
- [ ] Chave: `webhook-idem:{provider}:{messageId}` com TTL configurável (default 24h)
- [ ] `isProcessed` retorna `true` se chave existe
- [ ] `markProcessed` cria chave com TTL
- [ ] Implementar `InMemoryWebhookIdempotencyAdapter` para testes

**Critérios de Aceite:**
- [ ] Webhook duplicado retorna 200 sem processar
- [ ] TTL garante limpeza automática
- [ ] Testes cobrem cenário de duplicata e expiração

**Notas técnicas:**
> 24h de TTL é suficiente para cobrir retries de todos os providers conhecidos.

---

## SET-D — Orquestração Principal e Chatwoot

> 🎯 **Escopo estimado:** ~500 linhas | **Complexidade:** Alta
> **Racional:** Este é o coração da sprint — o use case que conecta mensagem, engine, sessão, provider e Chatwoot.

---

### T10 — Criar ProcessIncomingMessageUseCase

**Contexto:** O use case orquestra todo o fluxo desde a chegada da mensagem até o envio da resposta.

**O que fazer:**
- [ ] Criar use case com dependências injetadas: `SessionRepositoryPort`, `WhatsAppInstanceRepositoryPort`, `SessionLockPort`, `WebhookIdempotencyPort`, `WhatsAppSenderPort`, `ChatwootPort`, `AppLoggerPort`, `FlowRepositoryPort`
- [ ] Implementar fluxo: verificar idempotência → adquirir lock → buscar/criar sessão → carregar fluxo ativo → processar engine → persistir sessão → enviar resposta → liberar lock
- [ ] Se `session.mode === 'bot'`: processar flow engine
- [ ] Se `session.mode !== 'bot'`: encaminhar mensagem para Chatwoot
- [ ] Publicar evento de domínio em caso de handoff

**Critérios de Aceite:**
- [ ] Use case não importa infrastructure ou SDK de provider
- [ ] Lock é adquirido antes de processar e liberado no finally
- [ ] Idempotência é verificada antes do lock
- [ ] Testes unitários com mocks de ports

**Notas técnicas:**
> O use case recebe `CanonicalInboundMessage` já normalizada — a normalização ocorre no controller/webhook handler.

---

### T11 — Implementar ChatwootAdapter

**Contexto:** Chatwoot é a camada de atendimento humano; quando ocorre hand-off, a conversa é criada/atualizada no Chatwoot.

**O que fazer:**
- [ ] Implementar `ChatwootHttpAdapter` que satisfaz `ChatwootPort`
- [ ] `createConversation`: cria conversa via API REST do Chatwoot e retorna `conversationId`
- [ ] `sendMessage`: envia mensagem para conversa existente
- [ ] `findConversationBySessionId`: busca conversa vinculada à sessão
- [ ] Config via variáveis de ambiente: `CHATWOOT_API_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID`
- [ ] Implementar `InMemoryChatwootAdapter` para testes

**Critérios de Aceite:**
- [ ] Adapter pertence ao `infrastructure/chatwoot`
- [ ] Não importa domínio de session diretamente — recebe dados primitivos
- [ ] Testes unitários com adapter in-memory

**Notas técnicas:**
> Chatwoot API é REST simples. O adapter isola completamente — se Chatwoot mudar de versão, só o adapter muda.

---

### T12 — Implementar lógica de hand-off e evento de domínio

**Contexto:** Quando o engine retorna `TRANSFER`, o use case deve criar conversa no Chatwoot, enviar histórico e publicar evento.

**O que fazer:**
- [ ] No `ProcessIncomingMessageUseCase`, quando `action.kind === 'transferred_to_human'`:
  - Criar conversa no Chatwoot via `ChatwootPort`
  - Enviar últimas mensagens como contexto
  - Persistir `chatwoot_conversation_id` na sessão
  - Mudar `mode` para `waiting_human`
- [ ] Publicar evento `ConversationHandedOff` via `FlowEventPublisherPort`
- [ ] Evento inclui: `tenantId`, `phone`, `sessionId`, `chatwootConversationId`, `reason`

**Critérios de Aceite:**
- [ ] Hand-off persiste `chatwootConversationId` na sessão
- [ ] Evento publicado após persistência bem-sucedida
- [ ] Mensagens em `waiting_human`/`human_active` vão direto para Chatwoot
- [ ] Testes cobrem fluxo bot→transfer→chatwoot

**Notas técnicas:**
> Evento é publicado após persistência, nunca antes — garante consistência.

---

## SET-E — Endpoints Webhook e Wiring DI

> 🎯 **Escopo estimado:** ~350 linhas | **Complexidade:** Média
> **Racional:** Expor os endpoints públicos e conectar tudo via container DI.

---

### T13 — Criar endpoint webhook principal

**Contexto:** Providers enviam mensagens via webhook; o endpoint deve ser público mas seguro.

**O que fazer:**
- [ ] Criar `POST /webhook/:tenantId/whatsapp/:instanceId` no Elysia
- [ ] Validar `tenantId` contra banco (tenant existe e está ativo)
- [ ] Validar `instanceId` contra banco (instância pertence ao tenant e está ativa)
- [ ] Resolver provider da instância e validar assinatura/token do request
- [ ] Normalizar payload via `InboundNormalizer` do provider
- [ ] Chamar `ProcessIncomingMessageUseCase` com mensagem canônica
- [ ] Retornar 200 em caso de sucesso (mesmo se idempotente)

**Critérios de Aceite:**
- [ ] Endpoint é público (sem JWT auth) mas validado por provider
- [ ] `tenantId`/`instanceId` inválidos retornam 404
- [ ] Assinatura inválida retorna 401
- [ ] Resposta é sempre 200 para evitar retry infinito do provider

**Notas técnicas:**
> Webhook endpoints não usam auth JWT — são públicos por natureza. Segurança vem da validação de assinatura/token do provider.

---

### T14 — Criar endpoint de verificação Meta Challenge

**Contexto:** Meta exige verificação GET com `hub.mode`, `hub.verify_token` e `hub.challenge` antes de aceitar webhooks.

**O que fazer:**
- [ ] Criar `GET /webhook/:tenantId/whatsapp/:instanceId` para Meta challenge
- [ ] Validar `hub.mode === 'subscribe'`
- [ ] Validar `hub.verify_token` contra config da instância
- [ ] Retornar `hub.challenge` em texto puro se válido
- [ ] Retornar 403 se inválido

**Critérios de Aceite:**
- [ ] Challenge funciona apenas para instâncias Meta
- [ ] Token de verificação vem da config da instância (JSONB)
- [ ] Teste unitário com payload de challenge

**Notas técnicas:**
> Meta envia GET antes de POST. O endpoint deve responder com `hub.challenge` em plain text.

---

### T15 — Wiring DI e integração no bootstrap

**Contexto:** Todas as dependências precisam ser registradas no container e conectadas ao server Elysia.

**O que fazer:**
- [ ] Criar módulo `create-whatsapp-module.ts` no `infrastructure` com tokens e registro DI
- [ ] Registrar: repositories, adapters de lock/idempotência, provider factory, chatwoot adapter, use case
- [ ] Integrar webhook routes no `createApiServer`
- [ ] Atualizar `.env.example` e `.env.development.example` com novas variáveis
- [ ] Atualizar `ApiEnvironment` com novas variáveis de ambiente

**Critérios de Aceite:**
- [ ] Nenhuma instanciação com `new` fora do container
- [ ] Build compila sem erros
- [ ] Server Elysia serve rotas de webhook e auth simultaneamente

**Notas técnicas:**
> Seguir padrão do `create-auth-module.ts`: tokens tipados, singleton para infra, transient para use cases.

---

## SET-F — Testes Integrados e Fechamento de Qualidade

> 🎯 **Escopo estimado:** ~400 linhas | **Complexidade:** Média
> **Racional:** Validar o fluxo ponta-a-ponta, contrato de providers e critérios de qualidade da sprint.

---

### T16 — Criar suíte de testes de contrato por provider

**Contexto:** Todos os adapters devem satisfazer o mesmo contrato canônico — a suíte garante consistência.

**O que fazer:**
- [ ] Criar suíte de contrato compartilhada que valida: normalização inbound, envio outbound, verificação de assinatura
- [ ] Rodar a suíte com fixtures de payload de Evolution e Meta (mínimo 2)
- [ ] Validar que Z-API e Uazapi também passam na mesma suíte

**Critérios de Aceite:**
- [ ] Suíte é genérica — funciona para qualquer adapter
- [ ] Pelo menos 2 providers cobertos em profundidade
- [ ] Todos os 4 passam na suíte de contrato

**Notas técnicas:**
> Pattern: definir interface de teste `ProviderContractSuite` e parametrizar com adapter + fixtures.

---

### T17 — Criar testes de integração do fluxo completo

**Contexto:** O fluxo mensagem → normalização → engine → envio precisa funcionar fim a fim.

**O que fazer:**
- [ ] Testar fluxo completo com in-memory adapters
- [ ] Cobrir cenários: mensagem válida, webhook duplicado (idempotência), lock por sessão (concorrência), hand-off para Chatwoot
- [ ] Cobrir roteamento de mensagem em modo `waiting_human` para Chatwoot

**Critérios de Aceite:**
- [ ] Fluxo completo funciona com adapters in-memory
- [ ] Duplicata não gera efeito colateral
- [ ] Lock serializa processamento
- [ ] Hand-off cria conversa e redireciona

**Notas técnicas:**
> Usar factories de teste para criar sessões, instâncias e fluxos com dados controlados.

---

### T18 — Validação de qualidade e fechamento da sprint

**Contexto:** A sprint deve encerrar pronta para PR sem regressão em outros packages.

**O que fazer:**
- [ ] Executar `bun run build` na raiz
- [ ] Executar `bun run test` na raiz
- [ ] Executar `bun run lint` na raiz
- [ ] Corrigir quaisquer regressões encontradas
- [ ] Verificar que não há alteração fora do escopo sem justificativa

**Critérios de Aceite:**
- [ ] Build, testes e lint passam sem warnings
- [ ] Nenhuma regressão introduzida em packages existentes
- [ ] Sprint pronta para fechamento e changelog

**Notas técnicas:**
> Se houver falha fora do escopo causada pela sprint, corrigir antes do fechamento.

---

## Testes Manuais de Entrega (Passo a Passo Executável)

### Cenário 1 — Recebimento e processamento de mensagem WhatsApp

**Objetivo:** Garantir que uma mensagem recebida via webhook é processada pelo engine e a resposta é preparada para envio.

**Pré-requisitos:**
- [ ] Dependências instaladas
- [ ] Branch da sprint atualizada localmente
- [ ] Docker com PostgreSQL e Valkey em execução

**Passo a passo executável:**
1. Executar `bun run test --filter=api` e filtrar testes do `ProcessIncomingMessageUseCase`.
   - **Resultado esperado:** Use case processa mensagem, navega pelo fluxo e retorna resposta.
2. Verificar teste de normalização de payload Evolution → `CanonicalInboundMessage`.
   - **Resultado esperado:** Todos os campos canônicos preenchidos corretamente.
3. Verificar teste de envio via adapter Evolution (mock HTTP).
   - **Resultado esperado:** Request formatado corretamente para `POST /message/sendText/:instanceName`.

**Critério de aprovação do cenário:**
- [ ] Fluxo completo funciona de ponta a ponta com adapters in-memory.

---

### Cenário 2 — Idempotência e lock de sessão

**Objetivo:** Garantir que webhooks duplicados não geram efeitos e mensagens concorrentes são serializadas.

**Pré-requisitos:**
- [ ] Testes da API acessíveis localmente

**Passo a passo executável:**
1. Executar teste que envia mesmo webhook duas vezes.
   - **Resultado esperado:** Segunda chamada retorna 200 sem processar novamente.
2. Executar teste que simula duas mensagens simultâneas da mesma sessão.
   - **Resultado esperado:** Segunda mensagem aguarda lock e processa após a primeira.

**Critério de aprovação do cenário:**
- [ ] Duplicata não gera resposta duplicada e concorrência não corrompe sessão.

---

### Cenário 3 — Hand-off para Chatwoot

**Objetivo:** Garantir que o nó `transfer` cria conversa no Chatwoot e redireciona mensagens subsequentes.

**Pré-requisitos:**
- [ ] Testes da API com adapter in-memory de Chatwoot

**Passo a passo executável:**
1. Executar teste que navega até nó `transfer` no fluxo.
   - **Resultado esperado:** `session.mode` muda para `waiting_human`, conversa criada no Chatwoot, `chatwootConversationId` persistido.
2. Executar teste que envia mensagem em sessão `waiting_human`.
   - **Resultado esperado:** Mensagem roteada para Chatwoot, engine não processada.

**Critério de aprovação do cenário:**
- [ ] Hand-off funcional com roteamento correto por modo de sessão.

---

### Cenário 4 — Validação multi-provider

**Objetivo:** Garantir que todos os 4 providers passam na suíte de contrato.

**Pré-requisitos:**
- [ ] Suíte de testes executável

**Passo a passo executável:**
1. Executar `bun run test --filter=api` e filtrar testes de contrato de provider.
   - **Resultado esperado:** Evolution, Z-API, Uazapi e Meta passam na mesma suíte.
2. Verificar que ProviderFactory resolve adapter correto por config.
   - **Resultado esperado:** Switch exaustivo cobre todos os providers.

**Critério de aprovação do cenário:**
- [ ] Todos os 4 providers passam na suíte de contrato sem exceção.

---

## Checklist Final da Sprint

- [ ] Todos os sets concluídos e aprovados
- [ ] Todos os critérios de aceite validados
- [ ] Seção `Testes Manuais de Entrega (Passo a Passo Executável)` preenchida, executável e detalhada
- [ ] Changelog atualizado em `docs/changelog/CHANGELOG.md`
- [ ] Decisões técnicas novas registradas em `docs/decisions/`
- [ ] Sem débito técnico não documentado
- [ ] Débitos resolvidos marcados como `[x]` no changelog/sprint, com nota de resolução
- [ ] RNs respeitadas em toda implementação
