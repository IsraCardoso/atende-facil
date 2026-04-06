# Flow (`packages/flow`)

Nucleo puro do motor conversacional.

Este pacote deve permanecer **isolado** de infraestrutura:

- sem dependencias de banco;
- sem dependencias HTTP;
- sem container DI;
- sem acoplamento com runtime externo.

---

## Objetivo da sprint 03

- processar mensagens por tipo de no (`message`, `option`, `input`, `transfer`, `end`);
- evoluir `Session` de forma deterministica;
- validar fluxo antes da ativacao com regras estruturais;
- expor contratos de integracao sem acoplamento com adapters concretos.

---

## API publica

- `processMessage(session, message, flow): ProcessResult`
- `validateFlowDefinition(flow): FlowValidationResult`
- Tipos de dominio: `Flow`, `FlowNode`, `Session`, `ProcessResult`, `FlowValidationIssue`
- Contratos de integracao: `FlowEventPublisherPort`, `FlowExecutionObserverPort`

---

## Regras principais

- `Session.data` usa `Record<string, unknown>`;
- no `option` aceita numero (`1..N`) e matching textual por `label`/`aliases`;
- `transfer` move sessao para `waiting_human`;
- `end` encerra fluxo com `currentNodeId = null`;
- ciclos automaticos sem interacao sao bloqueados (validacao e runtime guard).

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run build --filter=flow` (na raiz) | Build/typecheck |
| `bun run test --filter=flow` (na raiz) | Testes unitarios |
| `bun run lint --filter=flow` (na raiz) | Lint/format check |

---

## Diretrizes

- Regras de dominio devem ser expressas por tipos e funcoes puras.
- Qualquer acesso a persistencia deve ficar fora deste pacote.
- Evitar efeitos colaterais, estado global e leitura de ambiente.

