## 1. Backend — ativação em um passo

- [x] 1.1 Criar `apps/api/src/application/use-cases/flows/go-live-flow-use-case.ts`: `createGoLiveFlowUseCase` — valida (`validateFlowDefinition`), publica se `draft`, ativa (desativando o anterior), idempotente se já `active`, rejeita `archived`; reusa `FLOW_NOT_FOUND`/`FLOW_INVALID_TRANSITION`/`FLOW_VALIDATION_FAILED`
- [x] 1.2 `apps/api/src/application/use-cases/flows/index.ts`: exportar o novo use case
- [x] 1.3 `apps/api/src/infrastructure/flow/create-flow-module.ts`: registrar `goLiveFlow` no container DI
- [x] 1.4 `apps/api/src/interface/http/flow-routes.ts`: `POST /:id/go-live`
- [x] 1.5 `apps/api/src/interface/http/create-api-server.ts`, `apps/api/src/index.ts`: expor `goLiveFlow` na composição de rotas
- [x] 1.6 `flow-use-cases.test.ts`: cenários novos (draft→active, published→active, desativa anterior, validação inválida não muda status, idempotente se já ativo, rejeita archived, not found)

## 2. Frontend — galeria de templates

- [x] 2.1 Criar `apps/web/src/lib/flow-templates.ts`: 3 templates (`boas-vindas`, `menu-faq`, `coleta-dados`), cada um com `definition` estruturalmente válida
- [x] 2.2 Criar `apps/web/src/lib/flow-templates.test.ts`: cada template validado contra `validateFlowDefinition` real (`flow` package), zero issues de severidade `error`
- [x] 2.3 `apps/web/src/pages/flows.tsx`: diálogo "Novo fluxo" ganha seletor de ponto de partida (em branco ou template); ao criar, se um template foi escolhido, `updateFlow(id, {definition})` antes de navegar pro editor

## 3. Frontend — ativação em um clique

- [x] 3.1 `apps/web/src/services/flow-api.ts`: método `goLiveFlow(id)` → `POST /flows/:id/go-live`
- [x] 3.2 `apps/web/src/components/flow-actions-menu.tsx`: ação "Ativar atendimento" para status `draft`/`published`, ao lado das ações granulares existentes (Publicar/Ativar seguem disponíveis)
- [x] 3.3 `apps/web/src/pages/flows.tsx`: `handleAction` trata `"go-live"`; falha `FLOW_VALIDATION_FAILED` abre diálogo listando as issues (mensagens humanas da change `flow-validator-i18n`)

## 4. Documentação e validação

- [x] 4.1 `docs/changelog/CHANGELOG.md`: entrada em inglês
- [x] 4.2 `bun test` — workspace `api` (flow-use-cases) e `web` (flow-templates + suíte completa)
- [x] 4.3 `bun run lint` (Biome) — `api` e `web`, 0 erros
- [x] 4.4 `tsc --noEmit` — `api` e `web`, 0 erros
- [x] 4.5 Smoke test manual no browser (Vite dev server, sem backend/DB neste ambiente): diálogo "Novo fluxo" renderiza os 3 templates + opção "Em branco"; menu de ações mostra "Ativar atendimento" — round-trip completo contra API+Postgres real não exercitado nesta sessão, coberto pelos testes automatizados de use case
