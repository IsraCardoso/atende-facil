# Container (`packages/container`)

Container de injecao de dependencia manual, tipado e sem biblioteca externa.

Suporte atual:

- registro de dependencias `singleton`;
- registro de dependencias `transient`;
- resolucao tipada;
- lazy instantiation;
- teste unitario cobrindo comportamento base.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run build --filter=container` (na raiz) | Build/typecheck |
| `bun run test --filter=container` (na raiz) | Testes unitarios |
| `bun run lint --filter=container` (na raiz) | Lint/format check |

---

## Diretrizes de uso

- Registrar dependencias no bootstrap da aplicacao.
- Nao instanciar dependencias de forma espalhada (`new` fora da composicao principal).
- Preferir interfaces/contratos semanticos nas dependencias injetadas.

