## ADDED Requirements

### Requirement: Ciclo de vida completo da integração Evolution in-app (legacy: RN-029)
O Atende Fácil MUST permitir que o tenant administre toda a integração WhatsApp Evolution exclusivamente pela UI de Configurações, sem scripts externos: ligar integração (provisionar), autenticar aparelho (QR), desconectar sessão e desligar integração (deprovisionar).

#### Scenario: Ligar integração (ativar)
- **WHEN** admin clica "Ativar integração" com plataforma Evolution configurada
- **THEN** API provisiona instância na Evolution, registra webhook, persiste `whatsapp_instances` e UI exibe card com CTA "Conectar WhatsApp"

#### Scenario: Autenticar WhatsApp (parear QR)
- **WHEN** admin clica "Conectar WhatsApp" em instância desconectada
- **THEN** dialog exibe QR base64, polling atualiza status até `connected`, e badge "Conectado" aparece sem sair do produto

#### Scenario: Desconectar sessão (logout)
- **WHEN** admin clica "Desconectar" com WhatsApp conectado
- **THEN** API chama logout na Evolution, status volta a `disconnected`, instância permanece configurada e CTA "Conectar WhatsApp" reaparece

#### Scenario: Desligar integração (desativar)
- **WHEN** admin confirma "Desativar integração"
- **THEN** API remove instância na Evolution, apaga registro do tenant e UI retorna ao empty state "Ativar integração"

#### Scenario: Plataforma Evolution indisponível
- **WHEN** variáveis de ambiente Evolution ausentes
- **THEN** ligar integração retorna `503 WHATSAPP_PLATFORM_UNAVAILABLE` e UI exibe orientação antes ou após a tentativa

### Requirement: Provisionamento Evolution depende de plataforma configurada
`POST /integrations/whatsapp/instances` com `provider: evolution` MUST provisionar instância na Evolution e registrar webhook somente quando a plataforma estiver configurada; em falha de provisionamento MUST NOT deixar instância primária inconsistente (provision antes de commit final ou rollback).

#### Scenario: Ativação com plataforma OK
- **WHEN** env vars corretas e Evolution responde
- **THEN** retorna `201` com instância mascarada e `webhookUrl` baseada em `PUBLIC_API_URL` alcançável pela Evolution

#### Scenario: Falha de provisionamento
- **WHEN** Evolution retorna erro na criação ou webhook
- **THEN** retorna `502 EVOLUTION_PROVISION_FAILED` sem instância primária órfã no banco

### Requirement: Desativação de integração WhatsApp
A API MUST expor `POST /integrations/whatsapp/instances/:id/deactivate` (admin/manager) que deprovisiona instância Evolution e remove o registro do tenant.

#### Scenario: Desativação com sucesso
- **WHEN** admin autenticado desativa instância Evolution existente
- **THEN** retorna `200` com `{ success: true }`, instância removida da Evolution (idempotente se já ausente) e não aparece mais em `GET /instances`

#### Scenario: Instância não encontrada
- **WHEN** `instanceId` não pertence ao tenant
- **THEN** retorna `404 WHATSAPP_NOT_FOUND`

#### Scenario: Evolution indisponível na desativação
- **WHEN** Evolution não responde mas registro existe no banco
- **THEN** API registra falha, remove registro do banco após best-effort de logout/delete, retorna erro parcial documentado ou `200` com warning conforme design (preferência: completar remoção DB para não bloquear tenant)

### Requirement: UI orienta plataforma e ciclo de vida
A página de integração MUST distinguir visualmente: Ativar integração (ligar), Conectar WhatsApp (autenticar), Desconectar (sessão) e Desativar integração (desligar); MUST exibir aviso quando `platform.available` for `false`.

#### Scenario: Plataforma indisponível
- **WHEN** operational-summary retorna `platform.available: false`
- **THEN** Alert warning lista variáveis a verificar

#### Scenario: Confirmação de desativação
- **WHEN** usuário clica "Desativar integração"
- **THEN** dialog de confirmação explica que pareamento e webhook serão removidos
