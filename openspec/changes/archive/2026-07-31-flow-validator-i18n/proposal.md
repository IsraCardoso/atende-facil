## Why

As 21 mensagens de `validateFlowDefinition` (`packages/flow/src/validation.ts`) já são em português, mas com acentuação removida ("no" em vez de "nó", "alcancavel" em vez de "alcançável") e jargão técnico vazando pro texto (`startNodeId`, `fieldKey`, `nextNodeId`) — leitura de log de backend, não uma mensagem que o dono de um negócio configurando o próprio fluxo no editor entende sem ajuda técnica. Item do backlog de simplificação de UX aprovado ("Gostei, pode tocar tudo!!").

## What Changes

- As 21 mensagens de `FlowValidationIssue.message` reescritas em português acentuado, sem jargão de nome de campo interno — descrevem o problema e, quando possível, a ação esperada, na perspectiva de quem está montando o fluxo no editor visual, não de quem lê logs de API.
- `code` (usado programaticamente, ex.: por testes ou lógica futura de UI) e `details` (dados estruturados) permanecem INALTERADOS — só o texto do `message` muda.

### Modified Capabilities
- `flow-engine`: RN-010 (validação estrutural) ganha o requisito de que as mensagens de validação sejam em português legível, sem jargão de campo interno.

## Impact

- `packages/flow/src/validation.ts` (21 strings de mensagem)
- Nenhuma mudança de contrato: `FlowValidationCode`, `FlowValidationSeverity`, `details` inalterados; `apps/api` e `apps/web` consomem o `message` já pronto, sem parsing
