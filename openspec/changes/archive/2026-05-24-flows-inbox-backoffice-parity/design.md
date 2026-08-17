## Context

O backoffice billing (`outstanding-payments-table.tsx`) usa:

1. Coluna principal `flex h-full flex-col gap-4` sem `max-w-*` centralizado.
2. Filtros em barra `shrink-0` com `Select`/`Popover` e ícones Lucide.
3. `isLoading` apenas na primeira carga; `isFetching` aplica `opacity-60` sem skeleton.
4. Tabela em `min-h-0 flex-1 overflow-auto` + `min-w-[900px]` + header sticky.
5. Ações em `DropdownMenu` (`MoreVertical`) com ícones coloridos nos itens.

O atende-fácil em fluxos ainda usa botões pill para filtro (largura variável) e `max-w-5xl`, causando shift quando a scrollbar aparece/desaparece. O inbox usa `Select` `item-aligned` dentro de coluna estreita com scroll — comportamento bugado do Radix (viewport parcial, ordem visual invertida ao rolar).

## Goals / Non-Goals

**Goals:**

- Paridade visual/comportamental com billing do backoffice nas áreas citadas.
- Zero flicker perceptível ao trocar filtro de status em fluxos.
- Largura estável do painel central (sem jump por scrollbar).
- Filtro inbox funcional com 4 opções visíveis e ordem correta.
- Settings no footer via `UserMenu` dropdown.

**Non-Goals:**

- React Query / nuqs (manter fetch manual por ora).
- Paginação server-side em fluxos.
- Tema "sistema" (manter light/dark; radio com 2 opções).

## Decisions

### D1 — Fluxos: toolbar Select + layout billing

**Decisão:** Substituir botões pill por:

```tsx
<Select value={statusFilter || "all"} onValueChange={...}>
  <SelectTrigger className="w-[160px] gap-2">
    <ListFilter className="size-4" />
    <SelectValue />
  </SelectTrigger>
  <SelectContent position="popper" sideOffset={4}>...</SelectContent>
</Select>
```

Container da página: `flex h-full flex-col gap-4` com `AppShell fullHeight`.

### D2 — Estabilidade de largura

**Decisão:** `scrollbar-gutter: stable` no `main` do shell; remover `mx-auto max-w-5xl` de fluxos; tabela `min-w-[720px]`.

### D3 — Inbox: DropdownMenu em vez de Select

**Decisão:** `DropdownMenu` + `DropdownMenuRadioGroup` para filtro de status — evita bug de viewport do Select em aside estreito.

### D4 — UserMenu backoffice

**Decisão:** Portar padrão `user-menu.tsx` do backoffice: trigger `Settings` + nome do tenant; menu `side="top"` com tema (radio) e logout.

## Risks / Trade-offs

- **[Risk]** DropdownMenu no inbox pode precisar `z-[200]` — já coberto por `@source` Tailwind.
- **[Risk]** `fullHeight` em fluxos exige conteúdo preencher altura — usar `min-h-0 flex-1` na área da tabela.

## Testes Manuais de Entrega (Passo a Passo Executável)

**Pré-requisitos:** `bun run dev`, login `admin@demo.com` / `Test1234!` / `demo-atende`.

1. **Fluxos — filtro sem flicker** — `/flows`: clicar Todos → Rascunho → Publicado → Ativo → Arquivado; tabela não some; apenas opacidade breve; largura do painel central não salta.
2. **Fluxos — ícones** — menu `⋮` nas ações com ícones Publicar/Ativar/Arquivar; filtro com ícone `ListFilter`.
3. **Inbox — dropdown** — `/inbox`: abrir filtro de status; 4 opções na ordem Todos, Aguardando, Em atendimento, Bot; sem scroll bugado.
4. **Settings** — sidebar footer: botão Settings + tenant; menu abre para cima com tema e Sair.
5. **Build** — `npm run build -w web` e `npm run lint -w web` passam.

**Critério de aprovação:** todos os passos 1–5 sem regressão visual.
