# RN-XXX — [Nome da Regra]

> **Status:** `Ativa` | `Revisão` | `Depreciada`
> **Domínio:** [Ex: Pagamentos / Autenticação / Pedidos]
> **Criada em:** YYYY-MM-DD | **Atualizada em:** YYYY-MM-DD

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

> *Por que essa regra existe? Qual problema ela resolve?*

[2-4 frases sobre o cenário de negócio.]

---

## A Regra

**[Afirmação direta e sem ambiguidade. Ex: "O usuário só pode ter um endereço principal ativo por vez."]**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| [Caso normal] | [O que acontece] |
| [Exceção 1] | [O que acontece] |
| [Exceção 2] | [O que acontece] |

---

## Exemplos

**✅ Válido:**
> [Exemplo concreto que respeita a regra]

**❌ Inválido:**
> [Exemplo concreto que viola a regra]

---

## Impactos Técnicos

- **Validação:** [Onde deve ser validado — backend / frontend / banco]
- **Mensagem de erro:** `"[Texto exato ao usuário]"`
- **Afeta:** [Módulos, telas ou APIs impactadas]

---

## Rastreabilidade

- **Solicitado por:** [Stakeholder ou área]
- **RNs relacionadas:** [RN-XXX, RN-YYY]
- **Sprints que implementaram:** [sprint-XX]
- **Changelog:** [Link para entrada do changelog onde foi implementada]
