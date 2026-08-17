## 1. PageHeader

- [x] 1.1 Adicionar prop `toolbar?: ReactNode` com `mt-4 flex flex-wrap items-center gap-3`
- [x] 1.2 Ajustar linha título+ações: `gap-3`, `sm:items-center`
- [x] 1.3 Garantir que páginas sem `toolbar` não ganham espaço extra

## 2. Páginas admin

- [x] 2.1 `flows.tsx`: mover filtro para `PageHeader.toolbar`; wrapper `gap-6`
- [x] 2.2 `settings.tsx`: validar wrapper `space-y-6` alinhado ao padrão
- [x] 2.3 `schedules.tsx`: validar consistência com padrão (ajuste mínimo se necessário)

## 3. Validação

- [x] 3.1 Checklist manual do `design.md` (light + dark)
- [x] 3.2 `npm run lint -w web` + `npm run build -w web`
- [x] 3.3 Marcar tasks pendentes de `flows-page-layout-spacing` como absorvidas ou arquivar change antiga
