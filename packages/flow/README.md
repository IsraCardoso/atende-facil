# Flow (`packages/flow`)

Nucleo puro de fluxo conversacional.

Este pacote deve permanecer **isolado** de infraestrutura:

- sem dependencias de banco;
- sem dependencias HTTP;
- sem container DI;
- sem acoplamento com runtime externo.

---

## Objetivo nesta sprint

- disponibilizar base tecnica minima para evolucao do motor de fluxo;
- garantir isolamento arquitetural desde o inicio;
- manter testes unitarios simples e deterministas.

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
- Evitar efeitos colaterais e estado global.

