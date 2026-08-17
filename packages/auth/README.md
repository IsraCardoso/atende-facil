# Auth (`packages/auth`)

Pacote reservado para evolucao de autenticacao e autorizacao.

Nesta sprint ele permanece intencionalmente minimalista, servindo como ponto de extensao para:

- sessions;
- RBAC;
- middlewares e helpers de autenticacao.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run build --filter=auth` (na raiz) | Build/typecheck |
| `bun run test --filter=auth` (na raiz) | Testes unitarios |
| `bun run lint --filter=auth` (na raiz) | Lint/format check |

---

## Diretrizes

- Nao introduzir regra de negocio aqui sem RN/sprint correspondente.
- Tipar contratos de auth de forma semantica (ex.: `SessionId`, `UserId`, `Role`).
- Evitar vazamento de detalhes de provider externo para outros modulos.

