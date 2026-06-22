# RN-029 — WhatsApp self-service gerenciado pela plataforma

> **Status:** `Ativa`
> **Domínio:** Mensageria e Integração WhatsApp
> **Criada em:** 2026-05-24 | **Atualizada em:** 2026-05-24

---

## Contexto

Tenants precisam conectar o WhatsApp sem scripts manuais nem acesso ao banco/Evolution API. A plataforma Atende Fácil gerencia a Evolution API em produção (credenciais globais, provisionamento de instância e webhook). O tenant administra apenas o pareamento via QR e visualiza o status da conexão.

---

## A Regra

**O tenant MUST configurar, conectar e monitorar a integração WhatsApp exclusivamente pela UI de Configurações, usando instâncias Evolution provisionadas e operadas pela plataforma; credenciais da Evolution (`apiUrl`, `apiKey`) NUNCA são solicitadas nem expostas ao frontend.**

---

## Condições e Exceções

| Situação | Comportamento esperado |
|---|---|
| Tenant ativa integração Evolution | Plataforma cria/atualiza instância na Evolution, persiste `instanceName` em `whatsapp_instances` e configura webhook |
| Tenant solicita status | API consulta Evolution via port de conexão e retorna enum canônico (`connected`, `disconnected`, `connecting`, `error`) |
| Tenant inicia pareamento | API retorna QR base64 com expiração; UI faz polling enquanto `connecting` |
| Tenant desconecta | API chama logout na Evolution; status volta a `disconnected` |
| Resposta HTTP de listagem/edição | Config mascarada — sem `apiKey` completo |
| `tenant_id` no body | Ignorado — sempre extraído do JWT |
| Provedor sem QR na v1 (Z-API, Uazapi) | UI desabilitada ou retorna `WHATSAPP_PAIRING_NOT_SUPPORTED` |
| Evolution indisponível no ambiente | HTTP 503 com mensagem clara; settings não quebra |

---

## Exemplos

**Válido:**
> Admin acessa `/settings`, clica "Ativar integração" (Evolution), depois "Conectar WhatsApp", escaneia o QR e vê badge "Conectado".

**Inválido:**
> Tenant informa `EVOLUTION_API_KEY` no formulário web ou recebe a chave completa em `GET /integrations/whatsapp/instances`.

---

## Impactos Técnicos

- Ports: `WhatsAppConnectionPort`, `WhatsAppInstanceProvisionerPort`
- Use cases: list, upsert, status, pair, disconnect
- Rotas: `/integrations/whatsapp/*` com rate limit (10/min em status/pair)
- Env: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `PUBLIC_API_URL`
- UI: compound `WhatsAppIntegration` em `settings.tsx`

---

## Rastreabilidade

- **OpenSpec:** `tenant-whatsapp-integration-self-service`
- **Relacionadas:** RN-011, RN-002, RN-025
- **Implementada em:** change `tenant-whatsapp-integration-self-service`
