# DEC-XXX — [Título da Decisão]

> **Status:** `Aprovada` | `Em discussão` | `Substituída por DEC-YYY`
> **Data:** YYYY-MM-DD | **Sprint:** sprint-XX

---

## Contexto

> *Qual problema ou situação levou a esta decisão? Qual era a pressão ou restrição?*

[Descreva a situação que forçou a decisão. Seja específico.]

---

## Decisão

> *O que foi decidido, de forma direta.*

**[Frase clara da decisão. Ex: "Usaremos PostgreSQL como banco principal, sem ORM — queries cruas com o driver `pg`."]**

---

## Alternativas consideradas

| Alternativa | Por que foi descartada |
|---|---|
| [Opção A] | [Motivo] |
| [Opção B] | [Motivo] |

---

## Consequências

**Positivas:**
- [O que fica mais fácil ou melhor com esta decisão]

**Negativas / Trade-offs:**
- [O que fica mais difícil, lento ou limitado]
- [Débito ou restrição que esta decisão impõe]

---

## Contexto para a IA

> *Instruções diretas sobre como a IA deve se comportar dado esta decisão.*

- [Ex: "Nunca usar Sequelize ou qualquer ORM. Sempre usar queries SQL diretas com `pg`."]
- [Ex: "Toda nova tabela deve ter migration em `db/migrations/`. Nunca alterar schema diretamente."]
