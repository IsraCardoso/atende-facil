# Prompts de Sprint — Plataforma WhatsApp

> Cole cada prompt abaixo no Cursor ativando a skill `sprint-definition-rn-flow`.
> A IA fará perguntas de clarificação, preencherá a doc da sprint e aguardará sua aprovação explícita antes de criar as RNs.
> Execute as sprints **em ordem** — cada uma depende da anterior.
> Em toda sprint, exigir a seção `Testes Manuais de Entrega (Passo a Passo Executável)` no documento final.

---

## Bloco opcional — Modo Baixo Contexto (subagentes + gates)

> Prefixe qualquer prompt de sprint com o bloco abaixo quando quiser reduzir consumo de contexto e aumentar previsibilidade.

```text
Ative modo baixo contexto com gates obrigatórios.

Siga as etapas:
1) Mapear: localizar arquivos/símbolos candidatos antes de leitura ampla.
2) Decidir: definir abordagem e escopo de edição.
3) Executar: implementar apenas no escopo definido e validar.

Regras:
- não ler arquivo inteiro com mais de 200 linhas sem justificativa;
- ler em fatias de 120 a 180 linhas;
- usar no máximo 2 subagentes por rodada, com objetivo único;
- cada etapa deve retornar contrato de saída curto.

Contratos de saída:
- Mapear (máx 6 linhas): arquivos-alvo, hipótese, risco opcional, próximo passo.
- Decidir (máx 6 linhas): decisão, escopo, validação (até 3 checks), próximo passo.
- Executar (máx 8 linhas): arquivos alterados, resultado de validação, pendências, próximo passo.
```

---

## Sprint 01 — Monorepo + Infraestrutura Base

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 01 — Monorepo e Infraestrutura Base.

Objetivo: configurar a fundação técnica do projeto — monorepo funcional, banco de dados conectado, servidor HTTP respondendo e ambiente de desenvolvimento reproduzível via Docker.

Descrição:
Configurar o monorepo com Turborepo. Criar as apps (api, web, worker) e os packages (types, db, flow, auth, ui). Configurar Bun como runtime e package manager. Configurar Elysia na api com healthcheck. Configurar PostgreSQL com Drizzle ORM e rodar a primeira migration (tabela de tenants vazia). Configurar Valkey. Configurar Docker Compose para ambiente local (postgres + redis). Configurar Biome para lint e formatação. Configurar Vitest. Criar o .env.example com todas as variáveis previstas. Configurar variáveis de ambiente por ambiente (dev, staging, production). Configurar logger estruturado (JSON) com correlation ID. Garantir que `bun run dev`, `bun run test` e `bun run lint` funcionam na raiz do monorepo.

Stack:
- Turborepo (monorepo)
- Bun (runtime + package manager)
- Elysia (HTTP)
- PostgreSQL 16 + Drizzle ORM
- Valkey
- Docker Compose
- Biome (lint/format, estilo Airbnb-like)
- Vitest (testes)

Restrições:
- TypeScript strict em todos os workspaces — proibido `any`
- Estrutura de pastas conforme docs/context/project.md
- Nenhuma lógica de negócio nesta sprint — apenas infraestrutura
- O package `flow` deve ser puro (sem deps de banco ou HTTP)
- Nenhuma dependência extra além das listadas sem aprovação

Contexto adicional:
Este é o primeiro sprint. O resultado deve ser um monorepo funcionando do zero, com todos os ambientes de desenvolvimento configurados e uma base arquitetural sólida que as próximas sprints possam construir sobre.
```

---

## Sprint 02 — Multi-tenant + Autenticação + RBAC

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 02 — Multi-tenant, Autenticação e RBAC.

Objetivo: qualquer usuário deve conseguir se registrar como tenant, fazer login e ter suas permissões verificadas em cada endpoint.

Descrição:
Criar as entidades de domínio: Tenant e User. Criar as migrations para as tabelas `tenants` e `users` (ambas com todos os campos necessários incluindo tenant_id indexado). Integrar BetterAuth para autenticação (email/senha). Implementar RBAC com três roles: `admin`, `manager`, `agent`. Criar middleware de autenticação para Elysia que extrai tenant_id do token (nunca do body). Criar os use cases: RegisterTenant, CreateUser, Login, GetCurrentUser. Criar os endpoints correspondentes. O sistema deve suportar modo single-tenant via MULTI_TENANT=false + DEFAULT_TENANT_ID no .env. Escrever testes unitários para os use cases e testes de integração para os endpoints de auth.

Roles e permissões iniciais:
- admin: gerenciar usuários, flows, configurações do tenant
- manager: gerenciar flows, ver conversas
- agent: ver e responder conversas atribuídas a ele

Restrições:
- tenant_id SEMPRE do token — nunca do body da requisição
- Proibido retornar senha ou hash em qualquer resposta
- 100% de cobertura unitária nos use cases
- Testes E2E para: registrar tenant, login, acessar endpoint protegido sem token (espera 401), acessar com role errado (espera 403)

Contexto adicional:
Multi-tenant é o alicerce de segurança do produto. O isolamento entre tenants deve ser garantido desde esta sprint em toda query que tocar banco.
```

---

## Sprint 03 — Flow Engine (Domínio Puro)

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 03 — Flow Engine.

Objetivo: o motor de fluxo conversacional deve processar mensagens de texto, navegar entre nós, coletar dados e transitar para atendimento humano — sem nenhuma dependência de banco ou HTTP.

Descrição:
Implementar o Flow Engine no package `packages/flow`. O engine é puro — recebe estado e mensagem, retorna novo estado e ação. Definir e implementar os tipos de nó:
- `message`: envia texto e vai para o próximo nó automaticamente
- `option`: exibe menu numerado, aguarda resposta e navega para o nó correspondente
- `input`: solicita dado do usuário, salva no campo definido e avança
- `transfer`: marca a sessão para atendimento humano e emite evento
- `end`: encerra o fluxo

Definir as entidades de domínio: Flow, Node, Edge, Session. Session deve ter: phone, currentNodeId, mode (bot | waiting_human | human_active), data (campo livre para dados coletados), tenantId. Implementar a função principal `processMessage(session, message, flow): ProcessResult`. Implementar validação de fluxo antes de ativar: nó inicial existe? todos os caminhos chegam a `end` ou `transfer`? inputs têm destino? Escrever testes unitários com 100% de cobertura para todos os tipos de nó e para a validação de fluxo.

Restrições:
- O package `flow` NÃO pode importar nada de `packages/db`, apps ou libs de HTTP
- Funções puras sempre que possível
- Proibido `any`
- 100% de cobertura unitária

Contexto adicional:
Este é o coração do produto. A qualidade e testabilidade do engine determinam a confiabilidade de toda a plataforma. Priorizar clareza e simplicidade — o engine não deve ter lógica surpresa.
```

---

## Sprint 04 — Integração WhatsApp (Agnóstica de Provedor)

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 04 — Integração WhatsApp (Agnóstica de Provedor).

Objetivo: mensagens reais do WhatsApp chegam ao sistema, são processadas pelo flow engine e respostas são enviadas de volta ao usuário, permitindo selecionar o provedor por tenant/instância.

Descrição:
Projetar a camada de mensageria no `infrastructure` da api com Ports/Adapters para suportar múltiplos provedores sem alterar os use cases: Evolution API, Z-API, Uazapi e API oficial da Meta (WhatsApp Cloud API). O sistema deve permitir selecionar o provedor por tenant/instância e resolver o adapter correto em runtime. Criar contrato canônico de entrada (webhook inbound), contrato canônico de saída (send message) e status de entrega/leitura. Criar adapters por provedor convertendo payloads/headers para o contrato canônico:

- Evolution: autenticação por header `apikey`, envio `POST /message/sendText/:instanceName`, webhooks por eventos configuráveis.
- Z-API: envio `POST /instances/{instance}/token/{token}/send-text`, segurança adicional por `Client-Token`, webhooks por tipo (`delivery`, `received`, `status`) configurados por endpoints de update.
- Uazapi: base por subdomínio (`https://{subdomain}.uazapi.com`) e endpoints de envio como `POST /send/text`, com webhooks/SSE na documentação V2.
- Meta Cloud API: envio `POST /{version}/{phone-number-id}/messages` com `Authorization: Bearer`, webhook com verificação por `hub.mode`, `hub.verify_token`, `hub.challenge` e payload em `entry[].changes[].value`.

Criar a tabela `sessions` com migration. Criar o repositório de Session. Criar o use case `ProcessIncomingMessage` que: busca ou cria sessão do usuário, carrega o fluxo ativo do tenant, chama o flow engine, persiste o novo estado da sessão e envia a resposta pelo adapter selecionado. Criar endpoint webhook no Elysia (`POST /webhook/:tenantId/whatsapp`) e endpoint de verificação quando necessário (ex.: Meta). Implementar lock por sessão no Valkey para evitar condição de corrida quando o usuário manda múltiplas mensagens seguidas. Criar testes de integração para o fluxo completo (mensagem → normalização → engine → envio), cobrindo pelo menos dois provedores com a mesma suíte de contrato.

---

### 🔧 ADIÇÃO — Camada de abstração de provider

Introduzir ProviderFactory para resolver dinamicamente o adapter correto baseado na configuração da instância (tenant/instância), evitando qualquer `if/else` espalhado nos use cases.

Criar tabela `whatsapp_instances`:
- id
- tenant_id
- provider (enum: evolution | zapi | uazapi | meta)
- config (JSONB)
- active

---

### 🔧 ADIÇÃO — Integração com Chatwoot

Integrar o :contentReference[oaicite:1]{index=1} como camada oficial de atendimento humano.

Criar ChatwootAdapter no infrastructure com responsabilidades:

- Criar conversa no Chatwoot quando ocorrer hand-off
- Atualizar conversa existente
- Enviar mensagens do usuário para o Chatwoot
- Receber mensagens do agente via webhook
- Mapear session ↔ conversationId

Adicionar ao modelo de sessão:
- conversationId (Chatwoot)
- mode (bot | waiting_human | human_active)

Criar endpoint:
- POST /webhook/chatwoot

Atualizar o use case `ProcessIncomingMessage`:

Se session.mode === 'bot':
    → executa flow engine

    Se resposta = BOT:
        → envia via provider

    Se resposta = TRANSFER:
        → cria conversa no Chatwoot
        → envia histórico
        → session.mode = waiting_human

Se session.mode !== 'bot':
    → encaminha mensagem diretamente para o Chatwoot

---

Restrições:
- Webhook deve ser idempotente (mesmo evento duas vezes = mesmo resultado)
- Lock por sessão obrigatório no Valkey (TTL de 10s)
- tenant_id do path param do webhook deve ser validado contra o banco
- Nunca logar conteúdo de mensagem do usuário (privacidade)
- Seleção de provedor deve ocorrer por configuração (tenant/instância), nunca por `if/else` espalhado em use case
- Use cases não podem importar SDK de provedor; toda integração externa deve ficar em adapter
- Validar assinatura/verificação de webhook quando o provedor exigir

### 🔧 ADIÇÃO às Restrições:
- Integração com Chatwoot deve ocorrer exclusivamente via adapter (nunca diretamente em use case)
- Mensagens em sessões não-bot devem ser roteadas exclusivamente para o Chatwoot

---

Contexto adicional:
Esta sprint conecta o engine ao mundo real e precisa evitar lock-in tecnológico. O principal risco é acoplamento com um provedor específico e concorrência de mensagens; por isso o design deve nascer agnóstico, orientado a contracts, com lock por sessão desde o início.

### 🔧 ADIÇÃO ao Contexto:
O Chatwoot deve ser tratado como a camada de atendimento humano desacoplada, evitando que o backend precise implementar um sistema de inbox próprio, reduzindo complexidade e acelerando o time-to-market.

```

---

## Sprint 05 — Hand-off Humano + Sistema de Eventos

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 05 — Hand-off Humano e Sistema de Eventos.

Objetivo: quando um fluxo determina que é hora de um humano atender, o sistema muda o modo da sessão, notifica o painel em tempo real e pausa o bot.

Descrição:
Implementar o sistema de eventos com EventEmitter no domínio. Eventos obrigatórios: `conversation.handed_off`, `conversation.human_active`, `conversation.bot_resumed`. Criar a tabela `conversations` com migration. Conversation deve ter: id, tenantId, phone, status (bot | waiting_human | human_active), assignedTo (userId), createdAt, updatedAt. Implementar a transição de modo no use case ProcessIncomingMessage: quando o flow engine retorna ação `transfer`, sessão muda para `waiting_human` e o evento `conversation.handed_off` é emitido.

---

### 🔧 ADIÇÃO — Integração com Chatwoot

Integrar o :contentReference[oaicite:2]{index=2} como canal oficial de atendimento humano.

Atualizar Conversation:
- adicionar chatwootConversationId

Criar sincronização via webhook:

Eventos recebidos do Chatwoot:

- nova mensagem do agente:
    → enviar mensagem ao usuário via provider correto

- conversa atribuída:
    → status = human_active
    → emitir `conversation.human_active`

- conversa encerrada:
    → status = bot
    → emitir `conversation.bot_resumed`

---

Criar use cases adicionais:

- SyncChatwootMessage
- SyncChatwootStatus

---

### 🔧 AJUSTE IMPORTANTE

O envio de mensagens humanas NÃO deve mais ocorrer diretamente via Evolution API.

Todas as mensagens de agentes devem:
→ entrar via Chatwoot
→ passar pelo backend
→ sair pelo provider correto

---

Criar o use case AssignConversation (atendente assume a conversa → status vai para `human_active`). Criar o use case CloseConversation (encerra atendimento humano → status volta para `bot` opcional ou `end`). Implementar WebSocket no Elysia para notificação em tempo real do painel quando chegar nova conversa waiting_human. Escrever testes unitários para todas as transições de estado.

Restrições:
- Eventos publicados APÓS persistência — nunca antes
- Bot deve ignorar mensagens enquanto session.mode !== 'bot'
- 100% de cobertura unitária nas transições de estado

### 🔧 ADIÇÃO às Restrições:
- Toda comunicação humana deve passar obrigatoriamente pelo Chatwoot
- O backend não deve expor endpoint direto de envio humano fora da integração com Chatwoot

Testes E2E: usuário pede humano → sessão muda para waiting_human → evento emitido → atendente assume → mensagem enviada

Contexto adicional:
O hand-off humano é uma das features mais críticas do produto. A transição de estado deve ser atômica e rastreável. O WebSocket é necessário para o painel que vem na sprint seguinte.

### 🔧 ADIÇÃO ao Contexto:
A utilização do Chatwoot elimina a necessidade de implementar um sistema de inbox próprio, permitindo foco nas regras de negócio e automação.
```

---

## Sprint 06 — Dashboard de Atendimento (Inbox)

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 06 — Dashboard de Atendimento (Inbox).

Objetivo: o atendente (agent) acessa o painel, vê as conversas aguardando atendimento, assume uma conversa, responde e encerra.

Descrição:
Criar a tela de Inbox no frontend (React + Tailwind + shadcn/ui).

---

### 🔧 AJUSTE — Uso do Chatwoot

O inbox NÃO será implementado do zero.

O sistema utilizará o :contentReference[oaicite:3]{index=3} como dashboard de atendimento.

---

### Atendimento:

- Embutir Chatwoot via iframe no frontend
- Implementar fallback via deep linking

---

### Backend:

Criar endpoints auxiliares:

- mapping session ↔ conversation
- listagem opcional de conversas (cache)

---

Criar os endpoints necessários: GET /conversations, etc (mantidos apenas como suporte e integração — não como fonte primária do chat UI).

---

Design:
- Modo claro e escuro desde o início
- Layout responsivo
- Sidebar + área principal (Chatwoot embutido)

### 🔧 ADIÇÃO ao Design:
- O layout deve acomodar iframe externo sem quebrar responsividade
- Garantir consistência visual com sistema mesmo com UI externa

---

Restrições:
- Paginação obrigatória
- Atendente só vê conversas do seu tenant

### 🔧 ADIÇÃO às Restrições:
- NÃO implementar chat próprio nesta sprint
- Autenticação integrada com Chatwoot obrigatória (SSO ou sessão compartilhada)
- Deve funcionar mesmo sem iframe (fallback obrigatório)

---

Testes E2E:
- acessar inbox via Chatwoot iframe
- fallback funcionando corretamente

Contexto adicional:
Este é o primeiro entregável visível ao usuário final (retailer). A UX deve ser limpa e imediata.

### 🔧 ADIÇÃO ao Contexto:
O uso do Chatwoot reduz drasticamente o esforço de desenvolvimento e permite focar na diferenciação do produto.
```

---

## Sprint 08 — Editor Visual de Fluxos (React Flow)

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 08 — Editor Visual de Fluxos.

Objetivo: o admin do tenant consegue criar e editar fluxos visualmente, arrastando nós e conectando-os, sem editar JSON manualmente.

Descrição:
Implementar o editor visual de fluxos usando React Flow no frontend. Tipos de nó com interface visual própria: MessageNode (campo de texto), OptionNode (texto + lista de opções numeradas, cada uma com conexão de saída), InputNode (texto da pergunta + nome do campo a ser salvo), TransferNode (configuração de motivo), EndNode. Sidebar esquerda com lista de tipos de nó para arrastar. Painel lateral direito que abre ao clicar em um nó para edição de configuração (sem modal — painel inline). Botão de salvar que serializa o grafo do React Flow para o formato JSON do backend e chama a API de update de flow. Botão de validar que chama o endpoint de validação antes de ativar. Preview de simulação: botão que abre modal de simulação onde o usuário digita mensagens e vê o bot responder com o fluxo atual (sem WhatsApp — simulação local no frontend usando o flow engine exportado). Guias visuais e tooltips em cada tipo de nó explicando o que ele faz.

Restrições:
- O editor NÃO é a fonte de verdade — o JSON salvo no backend é. O editor apenas serializa/deserializa.
- Não permitir conexões inválidas (ex: EndNode não pode ter saídas)
- Validação antes de salvar no editor (client-side básica) + validação no backend (definitiva)
- Responsivo — funciona em tablet, mas desktop é o foco
- Sem libs de estado global adicionais — usar React state e React Flow state

Contexto adicional:
Este é o diferencial de produto. A UX do editor determina o sucesso comercial. Priorizar: simplicidade, feedback visual imediato e impossibilidade de criar fluxos inválidos acidentalmente.
```

---

## Sprint 09 — Agendamento e Automações por Horário

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 09 — Agendamento e Automações por Horário.

Objetivo: o admin do tenant configura quais fluxos ficam ativos em quais horários e dias da semana, e o sistema troca automaticamente.

Descrição:
Criar a tabela `flow_schedules` com migration. Schedule tem: id, tenantId, flowId, daysOfWeek (array), startTime (HH:MM), endTime (HH:MM), timezone, active. Implementar o FlowResolver no backend: ao receber uma mensagem, determina qual fluxo usar para aquele tenant no momento atual, considerando schedules ativos. Se nenhum schedule estiver ativo, usa o fluxo padrão do tenant (fallback). Criar o worker job (no app worker) que roda a cada minuto com cron e invalida o cache do fluxo ativo quando um schedule deve entrar em vigor. Criar os endpoints CRUD de schedules (protegidos por role admin/manager). Criar a tela de configuração de horários no frontend: calendário semanal visual (dias × horários), seleção de fluxo por faixa. Suporte a timezone por tenant (configurável nas settings do tenant).

Restrições:
- Timezone do tenant, nunca do servidor
- Fluxo fallback obrigatório (sem fallback = erro de configuração)
- Dois schedules do mesmo tenant não podem se sobrepor no mesmo horário/dia — validar no backend
- O FlowResolver deve ser testado com 100% de cobertura para casos de: horário comercial, fora do horário, sobreposição de schedules, sem schedule ativo
- Cache do fluxo ativo invalidado pelo worker ao mudar de schedule

Contexto adicional:
Esta feature é muito valorizada por clientes com horário comercial definido (farmácias, clínicas, restaurantes). O FlowResolver é crítico — um erro aqui significa bot errado respondendo clientes.
```

---

## Sprint 10 — Design System + Temas + Polish de UI

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 10 — Design System, Temas e Polish de UI.

Objetivo: toda a interface usa tokens de design consistentes, tem modo claro e escuro funcionando e oferece seleção de temas de cor predefinidos.

Descrição:
Consolidar o design system no package `packages/ui`. Definir tokens de cor, tipografia, espaçamento e bordas. Criar 4 temas de cor predefinidos (ex: Blue SaaS, Healthcare Green, Dark Purple, Warm Amber) — paletas definidas pela IA com boas práticas de design. Implementar modo claro e escuro com persistência em localStorage e respeito à preferência do sistema. Criar componentes base reutilizáveis no `packages/ui` (Button, Input, Badge, Card, Modal, Table, Sidebar, TopBar) usando shadcn/ui como base e customizando com os tokens. Criar a tela de configurações do tenant (Settings) com: nome do tenant, timezone, seleção de tema, logo (upload futuro). Criar a tela de perfil do usuário com: nome, email, role, trocar senha. Auditar todas as telas das sprints anteriores e substituir estilos hardcodados pelos tokens e componentes do design system. Garantir responsividade completa: sidebar colapsável em mobile, inbox adaptado para telas pequenas, editor de fluxo com aviso de "melhor em desktop".

Restrições:
- Nenhuma cor hardcodada nos componentes — apenas tokens do design system
- Temas aplicados via CSS custom properties (não inline styles)
- Modo claro e escuro sem flash na carga (SSR-safe ou com loading state)
- Acessibilidade básica: contraste WCAG AA, foco visível, aria-labels nos ícones

Contexto adicional:
Esta sprint transforma o produto de funcional para polido. A consistência visual é o que diferencia um produto interno de um SaaS comercial. Priorizar: consistência de tokens e responsividade.

### 🔧 ADIÇÃO ao Design:
- garantir consistência visual ao integrar Chatwoot (iframe)
- evitar conflitos de tema (light/dark)
```

---

## Sprint 11 — Fundação de IA + RAG

```
Use a skill sprint-definition-rn-flow.

Quero criar a Sprint 11 — Fundação de IA e RAG.

Objetivo: o admin do tenant consegue fazer upload de documentos (FAQ, catálogo, protocolos) que serão usados pelo sistema de IA para responder perguntas fora do fluxo determinístico.

Descrição:
Instalar e configurar pgvector no PostgreSQL. Criar a tabela `knowledge_documents` e `knowledge_chunks` com migration (incluindo campo de embedding vetor). Implementar o pipeline de ingestão no worker: upload de arquivo (PDF ou TXT) → chunking → geração de embeddings via OpenAI API → armazenamento no banco com tenant_id. Criar endpoint de upload de documento (multipart, protegido por role admin). Implementar o AIAdapter no infrastructure que: recebe query + tenantId, busca chunks relevantes via similaridade de cosseno no pgvector, monta o prompt com contexto RAG + instruções do tenant, chama OpenAI completions, retorna resposta. Criar o tipo de nó `ai` no flow engine: quando o engine chega a um nó `ai`, chama o AIAdapter e usa a resposta como mensagem enviada ao usuário. A sessão permanece no nó `ai` aguardando próxima mensagem (modo conversacional livre até o usuário digitar comando de sair ou timeout). Criar a tela de Knowledge Base no frontend: listar documentos, fazer upload, ver status de processamento (pending | processing | ready | error), excluir documento.

Restrições:
- Embeddings por tenant — nunca misturar chunks de tenants diferentes
- OpenAI API key por tenant (configurável nas settings) OU chave global do sistema como fallback
- Pipeline de ingestão é assíncrono — upload retorna imediato, processamento roda no worker
- Se OpenAI estiver indisponível, nó `ai` retorna mensagem de fallback configurada no nó
- Custo de embeddings deve ser monitorado — logar tokens consumidos por tenant
- Testes unitários para: chunking, montagem de prompt, fallback de erro de API
### 🔧 ADIÇÃO às Restrições:
- nó `ai` só pode atuar quando session.mode === 'bot'
- nunca interferir em sessões humanas (Chatwoot)
Contexto adicional:
Esta sprint abre o roadmap de IA do produto. O isolamento de dados por tenant é absolutamente crítico. O nó `ai` deve ser opcional e configurável — não obrigatório em nenhum fluxo.
```
