# RN-011 — WhatsApp provider agnóstico

> **Status:** `Ativa`
> **Domínio:** Mensageria e Integração WhatsApp
> **Criada em:** 2026-04-06 | **Atualizada em:** 2026-04-06

---

## Diretriz de tamanho e escopo

- Manter a RN enxuta e objetiva, idealmente cabendo em uma única página.
- Se a regra ficar extensa, quebrar em RNs irmãs por cenário/domínio para preservar clareza.
- Evitar reunir múltiplas decisões independentes na mesma RN.

---

## Contexto

O sistema precisa enviar e receber mensagens WhatsApp sem se acoplar a um único provedor. Diferentes tenants/instâncias podem usar provedores distintos (Evolution API, Z-API, Uazapi, Meta Cloud API). Sem abstração, cada troca de provedor exigiria reescrita de use cases e controllers.

---

## A Regra

**Toda comunicação com provedores de WhatsApp deve ocorrer por meio de contratos canônicos (inbound/outbound/status) e adapters isolados por provedor. Use cases consomem apenas ports de domínio; a resolução do adapter correto ocorre via ProviderFactory com base na configuração da instância (tenant/instância), sem `if/else` de provedor em código de negócio.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Mensagem inbound de qualquer provider | Normalizada para `CanonicalInboundMessage` antes de chegar ao use case |
| Envio de mensagem | Via `WhatsAppSenderPort` — use case não sabe qual provider está ativo |
| Troca de provider de uma instância | Apenas a coluna `provider` e `config` (JSONB) mudam — nenhum use case é alterado |
| Provider desconhecido na factory | Erro de compilação via switch exaustivo |
| Validação de assinatura/token | Cada adapter implementa verificação própria; webhook rejeitado se inválido |

---

## Exemplos

**Válido:**
> `ProcessIncomingMessageUseCase` recebe `CanonicalInboundMessage` e chama `WhatsAppSenderPort.sendText()` — não sabe se é Evolution ou Meta.

**Inválido:**
> Controller verifica `if (provider === 'evolution')` para decidir como normalizar o payload.

---

## Impactos Técnicos

- **Validação:** tipagem estrita em contratos canônicos, switch exaustivo na factory.
- **Mensagem de erro:** `"Provider não suportado ou instância inválida."`
- **Afeta:** `apps/api` (domain/ports, infrastructure/whatsapp, interface/http).

---

## Rastreabilidade

- **Solicitado por:** Produto + Engenharia
- **RNs relacionadas:** [RN-007](./RN-007-ports-adapters-services-cache-logs.md), [RN-012](./RN-012-webhook-idempotencia-lock-sessao.md), [RN-013](./RN-013-integracao-chatwoot-handoff-humano.md)
- **Sprints que implementaram:** [sprint-04](../sprints/sprint-04.md)
- **Changelog:** [CHANGELOG (seção Não lançado)](../changelog/CHANGELOG.md)
