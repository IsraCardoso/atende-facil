# Sprint 08 — Editor Visual de Fluxos (React Flow)

> **Periodo:** 07/04 ate 14/04 | **Status:** `Concluída`

---

# GESTAO

## Objetivo da Sprint

> *O admin do tenant consegue criar e editar fluxos visualmente, arrastando nos e conectando-os, com validacao em tempo real, save manual e simulacao local.*

Entregar o editor visual de fluxos usando React Flow, com custom nodes para cada tipo (message, option, input, transfer, end), serializacao bidirecional, auto-save em localStorage, save manual via API, validacao client-side, simulacao local e undo/redo.

---

## Entregaveis

| # | Entregavel | Criterio de conclusao |
|---|---|---|
| 1 | Pagina de listagem de flows | Admin ve lista paginada, cria novo, abre editor |
| 2 | Editor visual com React Flow | Canvas com drag-and-drop de nos |
| 3 | Custom nodes visuais (5 tipos) | Message, Option, Input, Transfer, End |
| 4 | Sidebar de edicao de propriedades | Editar texto, opcoes, fieldKey ao clicar no |
| 5 | Serializacao bidirecional | React Flow <-> JSON backend funcional |
| 6 | Save manual via API + auto-save localStorage | Dados nao se perdem |
| 7 | Validacao client-side com feedback visual | Nos com erro destacados |
| 8 | Simulacao local | Importa packages/flow no browser |
| 9 | Undo/redo | Ctrl+Z/Ctrl+Y funcional |

---

## Regras de Negocio desta Sprint

- [RN-022 — Editor visual de fluxos](../business-rules/RN-022-editor-visual-fluxos.md)
- [RN-023 — Simulacao local de fluxos](../business-rules/RN-023-simulacao-local-fluxos.md)

---

## Fora do Escopo

- Versionamento com diff visual
- Importacao/exportacao de flows (JSON file)
- Colaboracao em tempo real
- Temas customizaveis para o editor

---

## Metricas de Sucesso

- [ ] Editor abre e renderiza flow existente do backend
- [ ] Drag-and-drop de novos nos funciona
- [ ] Conexoes entre nos respeitam regras de tipo
- [ ] Save persiste corretamente no backend
- [ ] Validacao mostra erros visuais nos nos problematicos
- [ ] Simulacao executa flow passo a passo

---

# ENGENHARIA

> **Instrucao para a IA:** Leia o Plano de Execucao antes de comecar. Execute um set por vez.

---

## Plano de Execucao

```
Rodada 1: [SET-A: Setup + Listagem + Rotas]
Rodada 2: [SET-B: Editor + Custom Nodes + Serializacao]
Rodada 3: [SET-C: Save + Validacao + Undo/Redo]
Rodada 4: [SET-D: Simulacao + Fechamento]
```

| Set | Tasks | Depende de | Paralelo com |
|---|---|---|---|
| SET-A | T01, T02, T03 | — | — |
| SET-B | T04, T05, T06, T07 | SET-A | — |
| SET-C | T08, T09, T10 | SET-B | — |
| SET-D | T11, T12, T13 | SET-C | — |

---

## SET-A — Setup + Listagem + Rotas

> Escopo estimado: ~300 linhas | Complexidade: Media
> Racional: Fundacao do frontend — rotas, API service, pagina de listagem.

---

### T01 — Instalar React Flow e configurar rotas

**Contexto:** React Flow precisa ser instalado. Novas rotas /flows e /flows/:id/edit.

**O que fazer:**
- [ ] Instalar `@xyflow/react` no workspace web
- [ ] Adicionar rotas `/flows` e `/flows/:id/edit` em main.tsx
- [ ] CSS do React Flow importado

**Criterios de Aceite:**
- [ ] React Flow instalado e importavel
- [ ] Rotas respondem sem erro

---

### T02 — Flow API Service

**Contexto:** Frontend precisa consumir API de flows.

**O que fazer:**
- [ ] Criar `apps/web/src/services/flow-api.ts`
- [ ] Implementar: listFlows, getFlow, createFlow, updateFlow, deleteFlow, publishFlow, activateFlow, deactivateFlow, archiveFlow, validateFlow

**Criterios de Aceite:**
- [ ] Todas as chamadas API tipadas
- [ ] Usa createApiClient existente

---

### T03 — Pagina de listagem de flows

**Contexto:** Admin precisa ver seus flows e gerencia-los.

**O que fazer:**
- [ ] Criar `apps/web/src/pages/flows.tsx`
- [ ] Listagem com nome, status, versao, data
- [ ] Botoes: Novo, Editar, Publicar, Ativar, Arquivar
- [ ] Badge de status com cores

**Criterios de Aceite:**
- [ ] Lista carrega do backend
- [ ] Acoes de lifecycle funcionam
- [ ] Link para editor

---

## SET-B — Editor + Custom Nodes + Serializacao

> Escopo estimado: ~500 linhas | Complexidade: Alta
> Racional: Core do editor visual — canvas, nos customizados, conversao de dados.

---

### T04 — FlowEditorPage com React Flow canvas

**Contexto:** Pagina principal do editor com canvas React Flow.

**O que fazer:**
- [ ] Criar `apps/web/src/pages/flow-editor.tsx`
- [ ] Canvas React Flow com zoom, pan, minimap
- [ ] Toolbar basica (nome do flow, botao voltar)
- [ ] Carregar flow do backend ao montar

**Criterios de Aceite:**
- [ ] Canvas renderiza nos e edges
- [ ] Zoom e pan funcionais

---

### T05 — Custom node components

**Contexto:** Cada tipo de no precisa de visual e handles distintos.

**O que fazer:**
- [ ] Criar `apps/web/src/components/flow-editor/nodes/` com MessageNode, OptionNode, InputNode, TransferNode, EndNode
- [ ] Handles de entrada e saida por tipo
- [ ] Visual com icones e cores por tipo
- [ ] Registrar nodeTypes no React Flow

**Criterios de Aceite:**
- [ ] 5 tipos de no renderizam corretamente
- [ ] Handles permitem conexoes

---

### T06 — Serializacao bidirecional

**Contexto:** React Flow usa formato diferente do backend. Precisa converter.

**O que fazer:**
- [ ] Criar `apps/web/src/utils/flow-serializer.ts`
- [ ] `backendToReactFlow(definition)` — converte JSON do backend para nodes/edges do React Flow
- [ ] `reactFlowToBackend(nodes, edges)` — converte de volta

**Criterios de Aceite:**
- [ ] Roundtrip sem perda de dados
- [ ] Posicoes dos nos preservadas

---

### T07 — Sidebar de edicao de propriedades

**Contexto:** Ao clicar num no, abrir sidebar para editar propriedades.

**O que fazer:**
- [ ] Criar `apps/web/src/components/flow-editor/node-property-panel.tsx`
- [ ] Campos dinamicos por tipo de no
- [ ] Editar texto, prompt, opcoes, fieldKey
- [ ] Adicionar/remover opcoes em OptionNode

**Criterios de Aceite:**
- [ ] Sidebar abre ao selecionar no
- [ ] Alteracoes refletem no canvas

---

## SET-C — Save + Validacao + Undo/Redo

> Escopo estimado: ~400 linhas | Complexidade: Media-Alta
> Racional: Persistencia, feedback de erros, UX essencial.

---

### T08 — Save manual + auto-save localStorage

**Contexto:** Dados do editor nao podem se perder. Save manual + backup local.

**O que fazer:**
- [ ] Auto-save em localStorage a cada alteracao (debounce 2s)
- [ ] Botao Save que envia PUT /flows/:id ao backend
- [ ] Indicador visual de unsaved changes
- [ ] Recuperar do localStorage ao reabrir

**Criterios de Aceite:**
- [ ] Fechar e reabrir nao perde dados
- [ ] Save manual persiste no backend

---

### T09 — Validacao client-side com feedback visual

**Contexto:** Erros devem ser visiveis antes de publicar.

**O que fazer:**
- [ ] Botao Validar que chama POST /flows/:id/validate
- [ ] Nos com erro destacados com borda vermelha
- [ ] Lista de issues na sidebar
- [ ] Severity com icones (error/warning)

**Criterios de Aceite:**
- [ ] Nos com erro sao visualmente distintos
- [ ] Issues listadas com detalhes

---

### T10 — Undo/redo

**Contexto:** Essencial para UX de editor.

**O que fazer:**
- [ ] Hook useUndoRedo com historico de estados
- [ ] Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
- [ ] Botoes Undo/Redo na toolbar

**Criterios de Aceite:**
- [ ] Desfazer/refazer alteracoes de nos e edges
- [ ] Atalhos de teclado funcionais

---

## SET-D — Simulacao + Fechamento

> Escopo estimado: ~300 linhas | Complexidade: Media
> Racional: Feature diferencial + qualidade final.

---

### T11 — Simulacao local

**Contexto:** Importar packages/flow no browser para simular o flow sem backend.

**O que fazer:**
- [ ] Criar `apps/web/src/hooks/use-flow-simulation.ts`
- [ ] Botao Simular na toolbar
- [ ] Painel de chat simulado na sidebar
- [ ] Highlight do no atual durante simulacao
- [ ] Reset de simulacao

**Criterios de Aceite:**
- [ ] Simulacao navega pelos nos corretamente
- [ ] Input do usuario processa opcoes/texto

---

### T12 — Sidebar de drag-and-drop de nos

**Contexto:** Precisa arrastar novos nos para o canvas.

**O que fazer:**
- [ ] Criar paleta de nos na sidebar
- [ ] Drag from sidebar to canvas
- [ ] Drop cria no com posicao correta

**Criterios de Aceite:**
- [ ] Arrastar novo no funciona
- [ ] No criado com dados default

---

### T13 — Testes + Build + Fechamento

**Contexto:** Fechar sprint com qualidade.

**O que fazer:**
- [ ] Testes de serializacao (roundtrip)
- [ ] Testes de hook useFlowSimulation
- [ ] Verificar build/test/lint
- [ ] Nav link para /flows no app-shell

**Criterios de Aceite:**
- [ ] Build, test e lint passando
- [ ] Fluxo completo funcional

---

## Testes Manuais de Entrega (Passo a Passo Executavel)

### Cenario 1 — Criar e editar flow visualmente

**Objetivo:** Validar fluxo completo de criacao e edicao.

**Pre-requisitos:**
- [ ] API e frontend rodando
- [ ] Token de autenticacao valido

**Passo a passo:**
1. Navegar para `/flows`
   - **Resultado esperado:** Pagina de listagem carrega
2. Clicar em "Novo Flow"
   - **Resultado esperado:** Flow criado, redireciona para editor
3. Arrastar nos do tipo Message e End para o canvas
   - **Resultado esperado:** Nos aparecem no canvas
4. Conectar nos com edges
   - **Resultado esperado:** Edge criada visualmente
5. Editar texto do Message na sidebar
   - **Resultado esperado:** Texto atualizado no no
6. Clicar Save
   - **Resultado esperado:** Dados persistidos no backend

**Criterio de aprovacao:**
- [ ] Fluxo completo executado com sucesso

### Cenario 2 — Validar e publicar flow

**Objetivo:** Validar feedback de erros e publicacao.

**Pre-requisitos:**
- [ ] Flow criado no cenario 1

**Passo a passo:**
1. Clicar Validar
   - **Resultado esperado:** Resultado de validacao exibido
2. Corrigir erros se houver
   - **Resultado esperado:** Nos com erro destacados
3. Voltar para listagem e clicar Publicar
   - **Resultado esperado:** Status muda para published

**Criterio de aprovacao:**
- [ ] Validacao exibe issues corretamente, publicacao funciona

---

## Checklist Final da Sprint

- [ ] Todos os sets concluidos e aprovados
- [ ] Todos os criterios de aceite validados
- [ ] Secao de testes manuais preenchida e executavel
- [ ] Changelog atualizado
- [ ] Sem debito tecnico nao documentado
- [ ] RNs respeitadas em toda implementacao
