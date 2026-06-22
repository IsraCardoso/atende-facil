## 0. Reabertura e diagnóstico

- [x] 0.1 Reverter tasks 6.1–6.3 em `openspec/changes/ui-ux-renovation/tasks.md` (validação prematura)
- [x] 0.2 Documentar bugs reproduzidos: inbox sidebar, agendamento vazio, falta portal Chatwoot

## 1. Inbox layout (admin-shell + web-pages-ux)

- [x] 1.1 Remover `ConversationList` do prop `sidebar` do `AppShell` em `inbox.tsx`
- [x] 1.2 Criar layout split-view em `main`: coluna lista + área chat/empty (responsivo mobile)
- [x] 1.3 Garantir nav global sem sobreposição de filtros/conversas

## 2. Portal Chatwoot sem conversa (API + web)

- [x] 2.1 `chatwoot-access-service.generatePortalUrl()` + testes unitários
- [x] 2.2 Rota `GET /integrations/chatwoot/portal` autenticada
- [x] 2.3 Empty state inbox: botão “Abrir Chatwoot” consumindo endpoint
- [x] 2.4 Mensagem clara quando Chatwoot não configurado

## 3. Agendamentos — modal e feedback

- [x] 3.1 Garantir Dialog visível (z-index/portal) ao clicar “Novo agendamento”
- [x] 3.2 Empty state no modal quando `publishedFlows.length === 0` + link `/flows`
- [ ] 3.3 Testar criar agendamento após publicar um fluxo

## 4. Polish visual

- [x] 4.1 `flows.tsx`: ícones + `align-middle` na tabela
- [x] 4.2 `PageHeader` responsivo + `Select` popper portal (settings/conversation-list)
- [x] 4.3 Botões primários de criação como ícone + tooltip (`IconTooltipButton`)

## 5. Validação obrigatória (ui-delivery-gates)

- [ ] 5.1 Executar checklist completo do `design.md` (6 cenários) — aguardando usuário
- [x] 5.2 `bun run lint` + `bun run build --filter=web`
- [ ] 5.3 Só marcar `ui-ux-renovation` 6.x após aprovação do usuário
- [ ] 5.4 `/opsx-changelog` após apply
