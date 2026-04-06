---
name: text-to-business-rule
description: Converte descrição em texto livre para documento de Regra de Negócio no padrão do projeto. Use quando o usuário pedir para criar, estruturar, revisar ou refinar uma RN em docs/business-rules.
---

# Texto para Regra de Negócio

## Objetivo

Transformar uma descrição de negócio em uma RN clara, rastreável e sem ambiguidade.

## Workflow obrigatório

1. Ler o template `docs/business-rules/_template.md`.
2. Identificar o próximo ID de RN disponível (`RN-XXX`).
3. Analisar o texto de entrada e validar escopo.
4. Se houver ambiguidade, listar perguntas e aguardar resposta.
5. Se houver mais de uma regra no texto, sugerir divisão em RNs irmãs.
6. Gerar a RN completa no padrão do template.
7. Salvar em `docs/business-rules/RN-XXX-nome-curto.md`.

## Regras de qualidade da RN

- Regra principal em afirmação única, direta e testável.
- Condições e exceções com comportamento esperado objetivo.
- Exemplos válido/inválido concretos.
- Impactos técnicos com validação, mensagem e módulos afetados.
- Rastreabilidade com sprint, changelog e RNs relacionadas.

## Regras de tamanho

- Manter a RN enxuta, idealmente em uma página.
- Se crescer demais, quebrar por cenário/domínio em RNs irmãs.
- Evitar concentrar decisões independentes em uma única RN.

## Checklist final

- [ ] `Contexto` explica o porquê da regra
- [ ] `A Regra` está sem ambiguidade
- [ ] `Condições e Exceções` cobre casos normais e exceções
- [ ] `Exemplos` mostram aplicação prática
- [ ] `Impactos Técnicos` está acionável
- [ ] `Rastreabilidade` está preenchida

## Prompt-base sugerido

```text
Use a skill text-to-business-rule.
Descrição da regra: [texto livre]
Domínio: [domínio]
Próximo ID sugerido: [RN-XXX]
```
