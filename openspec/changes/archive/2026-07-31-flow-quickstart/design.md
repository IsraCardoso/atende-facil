## Context

`PublishFlowUseCase` (draft→published, valida) e `ActivateFlowUseCase` (published→active, desativa o anterior) já existem como use cases separados, cada um com sua rota (`POST /flows/:id/publish`, `POST /flows/:id/activate`) e item de menu próprio (`FlowActionsMenu`). Criar um fluxo hoje sempre gera `definition: {}` vazio (`CreateFlowUseCase`) — sem atalho de conteúdo pronto.

## Goals / Non-Goals

**Goals:** um clique leva `draft`/`published` até `active`, com os mesmos erros já existentes (não invento vocabulário novo); templates prontos aceleram o primeiro fluxo sem exigir entender a sintaxe de nós antes de ver algo funcionando.

**Non-Goals:** não remove as ações granulares "Publicar"/"Ativar" (usuário avançado pode preferir revisar entre os passos); não adiciona editor de templates pelo admin (são fixos no código, curadoria de produto); não adiciona categorização/paginação de templates (3 itens não justifica).

## Decisions

**D1 — `GoLiveFlowUseCase` reusa os códigos de erro existentes (`FLOW_NOT_FOUND`, `FLOW_INVALID_TRANSITION`, `FLOW_VALIDATION_FAILED`), não inventa um novo.** O frontend já sabe re-usar exatamente o parsing de `FLOW_VALIDATION_FAILED` (`details.issues`) que `PublishFlowUseCase` já produzia — nenhum client novo a escrever.

**D2 — Fluxo `active` chamado novamente é idempotente (retorna sucesso, `previousActiveFlow: null`), não erro.** `isValidFlowTransition("active", "active")` não está no mapa de transições — mas re-clicar "Ativar atendimento" num fluxo já ativo não é um erro do usuário, é a mesma intenção já satisfeita. Alternativa (lançar `FLOW_INVALID_TRANSITION`) rejeitada: o botão fica escondido pra `active` no menu, então esse caminho só é alcançado por chamada direta à API — tratar como no-op é mais seguro que um erro confuso.

**D3 — Templates são dados ESTÁTICOS no frontend (`apps/web/src/lib/flow-templates.ts`), não uma entidade nova no backend.** Alternativa considerada: endpoint `GET /flow-templates` + tabela `flow_templates`. Rejeitada: só 3 templates fixos, sem necessidade de CRUD ou customização por tenant hoje — YAGNI. Selecionar um template é só `createFlow` (já existe) seguido de `updateFlow(id, {definition})` (já existe) — nenhum endpoint novo necessário pra esta parte.

**D4 — Cada template é verificado por teste automatizado contra `validateFlowDefinition` real, não só inspeção visual.** "Prontos" implica realmente estruturalmente válidos (sem nó órfão, com caminho a terminal) — um teste que falhasse pegaria regressão se `packages/flow` mudar as regras de validação no futuro.

## Risks / Trade-offs

- [Risco] Templates ficam desatualizados se `packages/flow` mudar tipos de nó obrigatórios. **Mitigação**: D4 — teste roda contra a validação real, quebra no CI se desalinhar.
- [Trade-off] Ação "Ativar atendimento" some do menu quando o fluxo já está `active` (mesma regra das ações granulares) — usuário que quer forçar reativação precisa desativar primeiro. Aceitável: não é um caso de uso pedido.

## Migration Plan

Sem migration de schema. Sem mudança de contrato em endpoints existentes. Deploy: código sobe, ambos os fluxos (granular e um-clique) coexistem.
