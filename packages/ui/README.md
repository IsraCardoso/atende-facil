# UI (`packages/ui`)

Base do design system compartilhado.

Nesta sprint, o pacote contem tokens iniciais e infraestrutura para evolucao de componentes reutilizaveis.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run build --filter=ui` (na raiz) | Build/typecheck |
| `bun run test --filter=ui` (na raiz) | Testes unitarios |
| `bun run lint --filter=ui` (na raiz) | Lint/format check |

---

## Diretrizes

- Centralizar tokens e componentes compartilhados.
- Evitar dependencias de negocio neste pacote.
- Priorizar API de componentes clara e tipada.

