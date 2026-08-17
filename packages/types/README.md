# Types (`packages/types`)

Pacote de tipos compartilhados do monorepo.

Foco principal: **tipagem forte e especifica**, evitando primitivos sem contexto.

---

## O que este pacote entrega

- tipos semanticos compartilhados (`TenantId`, `CorrelationId`, `Email`);
- funcoes de criacao/validacao para tipos sensiveis (`createEmail`, etc.);
- contrato central para reduzir ambiguidade entre apps e packages.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run build --filter=types` (na raiz) | Build/typecheck |
| `bun run test --filter=types` (na raiz) | Testes unitarios |
| `bun run lint --filter=types` (na raiz) | Lint/format check |

---

## Diretrizes

- Sempre adicionar validacao ao criar novo tipo semantico.
- Nao expor `string` generica quando o conceito exigir restricao de dominio.
- Preferir normalizacao no construtor (ex.: e-mail em lowercase).

