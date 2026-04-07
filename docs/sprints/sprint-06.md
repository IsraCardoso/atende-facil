# Sprint 06 — Dashboard de Atendimento (Inbox via Chatwoot)

> **Período:** 07/04 até 14/04 | **Status:** `Concluída`

---

# GESTAO

## Objetivo da Sprint

> *O atendente acessa o painel, vê as conversas aguardando atendimento via Chatwoot embutido, assume uma conversa, responde e encerra — tudo sem sair do sistema.*

Entregar o primeiro entregável visível ao usuário final: uma página de Inbox que embute o Chatwoot via iframe com SSO assinado pelo backend, com fallback via deep-link direto para a conversa. Backend fornece endpoints auxiliares de listagem/detalhe paginados e geração segura de URLs de acesso ao Chatwoot.

---

## Entregáveis

| # | Entregável | Critério de conclusão |
|---|---|---|
| 1 | Wiring do módulo conversation no bootstrap da API | Conversation module inicializado, WebSocket e webhook Chatwoot operacionais |
| 2 | Endpoints auxiliares `GET /conversations` e `GET /conversations/:id` | Paginação obrigatória, tenant isolation, resposta com dados de conversation |
| 3 | Endpoint de acesso Chatwoot (embed URL + deep-link) | URL assinada com token curto gerada pelo backend |
| 4 | Fundação frontend (Vite + Tailwind + roteamento + tema) | SPA funcional com shell responsivo e tema claro/escuro |
| 5 | Página Inbox com Chatwoot embutido + fallback | Iframe operacional + deep-link como fallback |
| 6 | Testes unitários e E2E dos fluxos críticos | Build, test e lint passando |

---

## Regras de Negócio desta Sprint

- [RN-017 — Inbox Chatwoot embutido com fallback obrigatório](../business-rules/RN-017-inbox-chatwoot-embutido-fallback.md)
- [RN-018 — Endpoints auxiliares de conversations com tenant isolation](../business-rules/RN-018-endpoints-auxiliares-conversations.md)
- [RN-019 — Acesso seguro ao Chatwoot via URL assinada](../business-rules/RN-019-acesso-seguro-chatwoot-url-assinada.md)

---

## Fora do Escopo

- Chat proprio (UI de mensagens implementada do zero)
- Config Chatwoot por tenant (debito tecnico da sprint 05)
- DrizzleConversationRepository (persistencia real — permanece in-memory nesta sprint)
- Editor visual de fluxos
- Suporte a midia (imagens, audio, video)

---

## Metricas de Sucesso

- [ ] Atendente acessa Inbox e ve lista de conversas paginada
- [ ] Iframe do Chatwoot carrega com SSO automatico
- [ ] Fallback via deep-link funciona quando iframe indisponivel
- [ ] Tenant isolation verificado em todos os endpoints
- [ ] `bun run build`, `bun run test` e `bun run lint` passando

---

## Decisoes da Sprint

| # | Decisao | Justificativa |
|---|---|---|
| D1 | SSO via token HMAC curto (nao JWT completo) | Simplicidade para MVP; Chatwoot aceita token de autenticacao via URL |
| D2 | Fallback = deep-link direto por conversa | Melhor UX que abrir inbox geral do Chatwoot |
| D3 | Frontend com Vite + Tailwind + React Router | Stack definida no project.md; fundacao minima para entregar Inbox |
| D4 | Conversation repo permanece in-memory | Foco no fluxo visual; persistencia real e debito para proxima sprint |

---

# ENGENHARIA

## Plano de Execucao

```
Rodada 1: [SET-A: Backend Wiring + Endpoints de Suporte]
Rodada 2: [SET-B: Acesso Chatwoot (SSO + URLs)]
Rodada 3: [SET-C: Fundacao Frontend]
Rodada 4: [SET-D: Inbox Page com Chatwoot]
Rodada 5: [SET-E: Testes e Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05 | SET-A | — |
| SET-C | T06, T07, T08 | — | — |
| SET-D | T09, T10 | SET-B, SET-C | — |
| SET-E | T11, T12 | SET-D | — |

---

## SET-A — Backend Wiring + Endpoints de Suporte

> Escopo estimado: ~350 linhas | Complexidade: Media

### T01 — Wiring do conversation module no bootstrap

**Contexto:** O conversation module existe mas nao e inicializado no bootstrap da API.

**O que fazer:**
- [ ] Importar e inicializar `createConversationModule` em `apps/api/src/index.ts`
- [ ] Passar dependencias `conversation` para `createApiServer`
- [ ] Garantir que webhook Chatwoot e WebSocket ficam operacionais

**Criterios de Aceite:**
- [ ] Bootstrap inicializa conversation module
- [ ] WebSocket e webhook Chatwoot respondem

### T02 — Endpoint GET /conversations (paginado)

**Contexto:** O frontend precisa listar conversas do tenant para exibir no painel lateral.

**O que fazer:**
- [ ] Adicionar metodo `findByTenantPaginated` ao `ConversationRepositoryPort`
- [ ] Implementar no `InMemoryConversationRepository`
- [ ] Criar use case `ListConversationsUseCase`
- [ ] Criar rota `GET /conversations` autenticada com query params: `status`, `page`, `limit`

**Criterios de Aceite:**
- [ ] Paginacao obrigatoria (default limit=20, max=100)
- [ ] Filtro por status opcional
- [ ] tenant_id extraido do token, nunca do body/query

### T03 — Endpoint GET /conversations/:id

**Contexto:** O frontend precisa do detalhe de uma conversa para exibir informacoes e gerar link Chatwoot.

**O que fazer:**
- [ ] Criar use case `GetConversationUseCase`
- [ ] Criar rota `GET /conversations/:id` autenticada
- [ ] Retornar conversation com dados de session vinculada

**Criterios de Aceite:**
- [ ] Conversation nao encontrada retorna 404
- [ ] tenant_id validado contra token

---

## SET-B — Acesso Chatwoot (SSO + URLs)

> Escopo estimado: ~200 linhas | Complexidade: Media

### T04 — Servico de geracao de URL Chatwoot

**Contexto:** O frontend precisa de URLs seguras para embed (iframe) e fallback (deep-link).

**O que fazer:**
- [ ] Criar `ChatwootAccessService` em application/services
- [ ] Metodo `generateEmbedUrl(tenantId, chatwootConversationId)`: retorna URL com token HMAC
- [ ] Metodo `generateDeepLink(chatwootConversationId)`: retorna URL direta da conversa
- [ ] Adicionar variaveis `CHATWOOT_APP_URL` e `CHATWOOT_SSO_SECRET` ao env

**Criterios de Aceite:**
- [ ] URL de embed contem token com expiracao
- [ ] Deep-link aponta para conversa especifica
- [ ] Segredos nunca expostos no frontend

### T05 — Endpoint GET /conversations/:id/access

**Contexto:** O frontend chama este endpoint para obter URL de embed ou deep-link.

**O que fazer:**
- [ ] Criar rota `GET /conversations/:id/access` autenticada
- [ ] Retornar `{ embedUrl, deepLink }` gerados pelo ChatwootAccessService
- [ ] Validar tenant ownership

**Criterios de Aceite:**
- [ ] Retorna URLs validas para conversa existente
- [ ] 404 para conversa inexistente ou de outro tenant

---

## SET-C — Fundacao Frontend

> Escopo estimado: ~400 linhas | Complexidade: Media-Alta

### T06 — Setup Vite + Tailwind + dependencias

**Contexto:** O frontend esta no bootstrap minimo. Precisa de bundler, CSS e dependencias base.

**O que fazer:**
- [ ] Adicionar Vite + @vitejs/plugin-react ao package.json
- [ ] Criar vite.config.ts com proxy para API
- [ ] Criar index.html com div#root
- [ ] Instalar e configurar Tailwind CSS + PostCSS
- [ ] Atualizar scripts: dev (vite), build (vite build), preview (vite preview)

**Criterios de Aceite:**
- [ ] `bun run dev` inicia dev server com HMR
- [ ] `bun run build` gera bundle de producao
- [ ] Tailwind classes funcionam no JSX

### T07 — Shell de app (layout + tema)

**Contexto:** O Inbox precisa de um layout responsivo com sidebar e area principal.

**O que fazer:**
- [ ] Criar componente `AppShell` com sidebar colapsavel + area principal
- [ ] Implementar tema claro/escuro com `prefers-color-scheme` + toggle manual
- [ ] Criar provider de tema com persistencia em localStorage
- [ ] Responsivo: sidebar vira drawer em mobile

**Criterios de Aceite:**
- [ ] Layout renderiza corretamente em desktop e mobile
- [ ] Toggle de tema funciona e persiste

### T08 — Roteamento e cliente HTTP

**Contexto:** O app precisa de rotas e comunicacao com o backend.

**O que fazer:**
- [ ] Instalar react-router-dom
- [ ] Criar rotas: `/` (redirect para /inbox), `/inbox`, `/login`
- [ ] Criar modulo `api-client` com fetch autenticado (Bearer token)
- [ ] Criar hook `useAuth` basico (token em memoria/localStorage)

**Criterios de Aceite:**
- [ ] Navegacao entre rotas funciona
- [ ] api-client envia Authorization header

---

## SET-D — Inbox Page com Chatwoot

> Escopo estimado: ~350 linhas | Complexidade: Media

### T09 — Lista de conversas (sidebar)

**Contexto:** O atendente precisa ver as conversas pendentes no painel lateral.

**O que fazer:**
- [ ] Criar componente `ConversationList` que consome `GET /conversations`
- [ ] Exibir phone, status e timestamp
- [ ] Paginacao com botao "carregar mais"
- [ ] Filtro por status (bot, waiting_human, human_active)
- [ ] Highlight da conversa selecionada

**Criterios de Aceite:**
- [ ] Lista carrega e pagina corretamente
- [ ] Filtro de status funciona
- [ ] Selecao de conversa atualiza area principal

### T10 — Area principal com iframe Chatwoot + fallback

**Contexto:** Ao selecionar uma conversa, o Chatwoot abre no iframe. Se iframe falhar, deep-link abre.

**O que fazer:**
- [ ] Criar componente `ChatwootEmbed` que recebe embedUrl
- [ ] Iframe com sandbox minimo e CSP adequado
- [ ] Detectar falha de carregamento do iframe (onerror/timeout)
- [ ] Exibir botao "Abrir no Chatwoot" com deep-link como fallback
- [ ] Estado vazio quando nenhuma conversa selecionada

**Criterios de Aceite:**
- [ ] Iframe carrega Chatwoot com conversa correta
- [ ] Fallback exibe deep-link funcional
- [ ] Layout responsivo mantido com iframe

---

## SET-E — Testes e Fechamento

> Escopo estimado: ~300 linhas | Complexidade: Media

### T11 — Testes unitarios backend

**Contexto:** Endpoints de conversations e servico de acesso Chatwoot precisam de cobertura.

**O que fazer:**
- [ ] Testes do ListConversationsUseCase (paginacao, filtros, tenant isolation)
- [ ] Testes do GetConversationUseCase (sucesso, not found, wrong tenant)
- [ ] Testes do ChatwootAccessService (URLs geradas, expiracao, seguranca)
- [ ] Testes das rotas de conversations (integracao com Elysia)

**Criterios de Aceite:**
- [ ] 100% cobertura nos use cases novos
- [ ] Tenant isolation verificado em todos os cenarios

### T12 — Build, lint e docs finais

**Contexto:** Fechar a sprint com qualidade.

**O que fazer:**
- [ ] Verificar `bun run build` em todos os workspaces
- [ ] Verificar `bun run test` em todos os workspaces
- [ ] Verificar `bun run lint` sem warnings
- [ ] Atualizar `.env.example` com novas variaveis
- [ ] Preencher checklist final

**Criterios de Aceite:**
- [ ] Build, test e lint passando
- [ ] Nenhuma variavel nova sem entrada no .env.example

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 — Inbox com iframe Chatwoot

**Objetivo:** Validar que o atendente acessa o inbox e ve o Chatwoot embutido.

**Pre-requisitos:**
- [ ] API rodando com conversation module ativo
- [ ] Chatwoot acessivel na URL configurada
- [ ] Frontend rodando em modo dev

**Passo a passo:**
1. Fazer login no frontend com credenciais de agent
   - **Resultado esperado:** Redirect para /inbox
2. Verificar lista de conversas no painel lateral
   - **Resultado esperado:** Conversas do tenant exibidas com paginacao
3. Clicar em uma conversa com status waiting_human
   - **Resultado esperado:** Iframe do Chatwoot carrega com a conversa correta
4. Filtrar por status "human_active"
   - **Resultado esperado:** Lista atualiza mostrando apenas conversas ativas

**Criterio de aprovacao:**
- [ ] Todos os 4 passos executados com resultados esperados

### Cenario 2 — Fallback deep-link

**Objetivo:** Validar que o fallback funciona quando iframe indisponivel.

**Pre-requisitos:**
- [ ] API rodando
- [ ] Frontend rodando

**Passo a passo:**
1. Selecionar uma conversa no painel lateral
   - **Resultado esperado:** Botao "Abrir no Chatwoot" visivel
2. Clicar no botao de fallback
   - **Resultado esperado:** Nova aba abre com deep-link direto para a conversa no Chatwoot

**Criterio de aprovacao:**
- [ ] Deep-link abre conversa correta no Chatwoot

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao de testes manuais preenchida e executavel
- [ ] Changelog atualizado
- [ ] Sem debito tecnico nao documentado
- [ ] RNs respeitadas em toda implementacao
