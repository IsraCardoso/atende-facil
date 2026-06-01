# Cadastra instância WhatsApp (Evolution) no Postgres do atende-facil.
# Uso: .\scripts\local\register-whatsapp-instance.ps1 -TenantId "<uuid>" -EvolutionApiKey "<apikey-da-instancia>"
param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,

  [string]$InstanceId = "11111111-1111-1111-1111-111111111111",

  [string]$EvolutionApiUrl = "http://localhost:8080",

  [Parameter(Mandatory = $true)]
  [string]$EvolutionApiKey,

  [string]$InstanceName = "atende-facil-e2e",

  [string]$PostgresContainer = "spec-driven-postgres",

  [string]$Database = "spec_driven_dev"
)

$ErrorActionPreference = "Stop"

$configJson = (@{
  instanceName = $InstanceName
  apiUrl       = $EvolutionApiUrl
  apiKey       = $EvolutionApiKey
} | ConvertTo-Json -Compress)

$sql = @"
INSERT INTO whatsapp_instances (id, tenant_id, provider, config, active)
VALUES (
  '$InstanceId',
  '$TenantId',
  'evolution',
  '$configJson'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE
SET tenant_id = EXCLUDED.tenant_id, config = EXCLUDED.config, active = true, updated_at = now();
"@

$sql | docker exec -i $PostgresContainer psql -U postgres -d $Database -v ON_ERROR_STOP=1 | Out-Host

$webhookUrl = "http://host.docker.internal:3000/webhook/$TenantId/whatsapp/$InstanceId"

Write-Host ""
Write-Host "Instancia registrada no banco." -ForegroundColor Green
Write-Host "Instance ID : $InstanceId"
Write-Host "Webhook URL : $webhookUrl"
Write-Host ""
Write-Host "Webhook na Evolution: rode setup-teste-real-local.ps1 (configura automaticamente) ou POST $EvolutionApiUrl/webhook/set/$InstanceName com corpo { webhook: { enabled, url, events } }." -ForegroundColor Yellow
