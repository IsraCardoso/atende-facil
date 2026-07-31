## Why

Criar um fluxo hoje sempre começa vazio (`CreateFlowUseCase` gera `definition: {}`) — o admin do tenant precisa montar tudo do zero no editor visual, sem exemplo de referência. E ativar um fluxo exige dois passos manuais em sequência (Publicar, depois Ativar), cada um em telas/menus separados, sem feedback central quando a validação falha. Ambos aprovados no backlog de simplificação de UX ("Gostei, pode tocar tudo!!").

## What Changes

- Novo use case `createGoLiveFlowUseCase` (`apps/api/src/application/use-cases/flows/go-live-flow-use-case.ts`): combina validação + publicação + ativação num único passo. Aceita fluxo em `draft` (valida e publica antes de ativar) ou `published` (ativa direto); `active` é idempotente; `archived` é rejeitado. Reusa os MESMOS códigos de erro de `PublishFlowUseCase`/`ActivateFlowUseCase` (`FLOW_NOT_FOUND`, `FLOW_INVALID_TRANSITION`, `FLOW_VALIDATION_FAILED`) — nenhum código novo.
- Novo endpoint `POST /flows/:id/go-live`.
- `FlowActionsMenu` ganha a ação "Ativar atendimento" (ícone de raio) para fluxos `draft`/`published` — ações granulares "Publicar"/"Ativar" continuam disponíveis para quem quer os dois passos separados.
- Falha de validação no go-live abre um diálogo listando cada issue (mensagens já em português humano, ver change `flow-validator-i18n`) em vez de falhar silenciosamente.
- Nova galeria de templates (`apps/web/src/lib/flow-templates.ts`): 3 fluxos prontos e estruturalmente válidos (verificado por teste automatizado contra `validateFlowDefinition`) — "Boas-vindas simples", "Menu de opções (FAQ)", "Coleta de dados + transferência". O diálogo "Novo fluxo" ganha um seletor de ponto de partida (em branco ou um dos templates); escolher um template cria o fluxo em draft e já seeda a definition, navegando direto pro editor pra revisão/customização.

### Modified Capabilities
- `flows`: RN-020 (ciclo de vida) ganha uma transição combinada draft/published → active num único passo, reusando a mesma validação estrutural já exigida para `published`; capability ganha os requisitos novos de galeria de templates e ativação em um clique na UI (nenhuma capability existente cobria a tela de criação/listagem de flows especificamente).

## Impact

- `apps/api/src/application/use-cases/flows/go-live-flow-use-case.ts` (novo)
- `apps/api/src/application/use-cases/flows/index.ts`, `flow-use-cases.test.ts`
- `apps/api/src/infrastructure/flow/create-flow-module.ts` (DI)
- `apps/api/src/interface/http/flow-routes.ts`, `create-api-server.ts`, `apps/api/src/index.ts` (wiring)
- `apps/web/src/lib/flow-templates.ts` (novo), `flow-templates.test.ts` (novo)
- `apps/web/src/services/flow-api.ts` (`goLiveFlow`)
- `apps/web/src/components/flow-actions-menu.tsx`, `apps/web/src/pages/flows.tsx`
- Sem mudança de schema; sem mudança de contrato em endpoints existentes
