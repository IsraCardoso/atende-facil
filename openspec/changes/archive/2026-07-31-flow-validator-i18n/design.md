## Context

`validateFlowDefinition` (`packages/flow/src/validation.ts`) já retorna mensagens em português, mas com acentuação removida e nomes de campo internos (`startNodeId`, `fieldKey`, `nextNodeId`) vazando pro texto — o consumidor final é o admin do tenant montando um fluxo no editor visual (`apps/web`), não um desenvolvedor lendo logs.

## Goals / Non-Goals

**Goals:** todas as 21 mensagens em português correto e acentuado, sem jargão de nome de campo interno, descrevendo o problema na perspectiva de quem edita o fluxo.

**Non-Goals:** não muda `code`, `severity` nem `details` (contrato programático inalterado); não adiciona internacionalização (i18n multi-idioma) — só corrige o português já usado; não muda a lógica de validação em si (quais condições geram issue), só o texto.

## Decisions

**D1 — Mensagem descreve o problema E, quando possível, a ação esperada, sem citar nome de campo/variável interna.** Ex.: em vez de "No de input deve definir fieldKey", "Este nó de coleta de dado não definiu onde a resposta do cliente será guardada" — o usuário do editor nunca viu a palavra `fieldKey` na UI.

**D2 — `code` e `details` continuam a fonte de verdade para lógica programática; `message` é só apresentação.** Nenhum teste ou código de produção faz `switch`/parsing sobre `.message` (confirmado: `packages/flow/src/validation.test.ts` não referencia `.message`) — seguro reescrever o texto sem quebrar contrato.

## Risks / Trade-offs

- [Trade-off] Mensagens mais longas/descritivas ocupam mais espaço na UI de validação — aceitável, clareza para usuário não-técnico pesa mais que brevidade aqui.

## Migration Plan

Sem migration. Mudança de texto puro, sem mudança de schema/contrato. Deploy: sobe direto.
