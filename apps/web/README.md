# Web (`apps/web`)

Frontend React do monorepo. Nesta sprint, o objetivo e fornecer baseline tecnico com:

- bootstrap React;
- estrutura inicial de pastas (`pages`, `components`, `hooks`, `services`);
- testes unitarios minimos;
- conformidade com TypeScript strict e Biome.

---

## Scripts

| Script | Descricao |
|---|---|
| `bun run dev --filter=web` (na raiz) | Dev mode do web |
| `bun run build --filter=web` (na raiz) | Build/typecheck |
| `bun run test --filter=web` (na raiz) | Testes unitarios |
| `bun run lint --filter=web` (na raiz) | Lint/format check |

---

## Estrutura

```text
src/
  main.tsx
  main.test.ts
  pages/
  components/
  hooks/
  services/
```

---

## Diretrizes

- Manter componentes com responsabilidade unica.
- Tipar props de forma explicita.
- Nao introduzir regras de negocio de dominio no frontend.

