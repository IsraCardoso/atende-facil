## 1. Fluxos — paridade billing

- [x] 1.1 Layout `flex h-full flex-col gap-4` + `AppShell fullHeight`; remover `max-w-5xl`
- [x] 1.2 Filtro status: `Select` com `ListFilter` e largura fixa `w-[160px]`
- [x] 1.3 Tabela: `min-h-0 flex-1 overflow-auto`, `min-w-[720px]`, header sticky, colunas com largura fixa
- [x] 1.4 Loading: `initialLoading` só 1ª carga; `isFetching` com opacity; empty só após fetch
- [x] 1.5 Ações: `FlowActionsMenu` com `MoreVertical` + ícones nos itens

## 2. Inbox — filtro corrigido

- [x] 2.1 Substituir `Select` por `DropdownMenu` + `RadioGroup` no filtro de status
- [x] 2.2 `isFetching` sem limpar lista durante troca de filtro
- [x] 2.3 `SelectContent position="popper"` removido (não usa mais Select)

## 3. Shell — UserMenu backoffice

- [x] 3.1 Portar `UserMenu` com ícone `Settings` no footer
- [x] 3.2 Dropdown `side="top"` com tema (radio) e logout
- [x] 3.3 `scrollbar-gutter: stable` no `main` do shell
- [x] 3.4 Remover Configurações da `sidebar-nav`; link em UserMenu

## 4. Validação

- [ ] 4.1 Executar checklist do `design.md` — aguardando usuário
- [x] 4.2 `npm run lint -w web` + `npm run build -w web`
