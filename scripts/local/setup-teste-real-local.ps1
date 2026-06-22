# Prepara tenant, flow e instancia WhatsApp para teste REAL local.
# Requer: API :3000, Postgres, Evolution :8080, DEV_MOCK_WHATSAPP_SEND=false
#
# Uso basico:
#   .\scripts\local\setup-teste-real-local.ps1 -EvolutionInstanceApiKey "SUA_APIKEY"
#
# E2E NetFacil:
#   .\scripts\local\setup-teste-real-local.ps1 -FreshTenant -TenantPrefix netfacil-e2e `
#     -FlowJsonPath ".\scripts\local\flows\fluxo-provedora-netfacil.json" `
#     -FlowName "NetFacil — Atendimento ISP" `
#     -EvolutionInstanceApiKey "SUA_APIKEY"

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$TenantSlug = "demo-atende",
  [string]$AdminEmail = "admin@demo.com",
  [string]$AdminPassword = "Test1234!",
  [Parameter(Mandatory = $true)]
  [string]$EvolutionInstanceApiKey,
  [string]$EvolutionInstanceName = "atende-facil-e2e",
  [string]$EvolutionApiUrl = "http://localhost:8080",
  [string]$InstanceId = "11111111-1111-1111-1111-111111111111",
  [string]$FlowJsonPath = "",
  [string]$FlowName = "Atendimento Real Local",
  [string]$FlowDescription = "Bot + transferencia humana",
  [string]$TenantPrefix = "demo",
  [switch]$FreshTenant
)

$ErrorActionPreference = "Stop"

if (-not $FlowJsonPath) {
  $FlowJsonPath = Join-Path $PSScriptRoot "flows\fluxo-atendimento-completo.json"
} elseif (-not [System.IO.Path]::IsPathRooted($FlowJsonPath)) {
  $FlowJsonPath = Join-Path (Get-Location) $FlowJsonPath
}

if (-not (Test-Path $FlowJsonPath)) {
  Write-Host "[ERRO] Flow JSON nao encontrado: $FlowJsonPath" -ForegroundColor Red
  exit 1
}

function Invoke-Api($Method, $Path, $Body, $Token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $p = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers; ErrorAction = "Stop" }
  if ($Body) { $p["Body"] = ($Body | ConvertTo-Json -Depth 25 -Compress) }
  return Invoke-RestMethod @p
}

Write-Host "=== Setup teste REAL local ===" -ForegroundColor Cyan
Write-Host "Flow: $FlowJsonPath" -ForegroundColor DarkGray

$health = Invoke-Api GET "/health" $null $null
Write-Host "[OK] API: $($health.status)" -ForegroundColor Green
try {
  Invoke-RestMethod -Method GET -Uri "$EvolutionApiUrl/instance/fetchInstances" `
    -Headers @{ apikey = $EvolutionInstanceApiKey } -ErrorAction Stop | Out-Null
  Write-Host "[OK] Evolution API respondeu" -ForegroundColor Green
} catch {
  Write-Host "[ERRO] Evolution em $EvolutionApiUrl nao acessivel ou apikey invalida." -ForegroundColor Red
  exit 1
}

if ($FreshTenant) {
  $slug = "$TenantPrefix-$(Get-Random -Maximum 99999)"
  Invoke-Api POST "/auth/register-tenant" @{
    tenantName       = "Tenant $slug"
    tenantSlug       = $slug
    adminDisplayName = "Admin"
    adminEmail       = "admin+$slug@test.local"
    adminPassword    = $AdminPassword
  } $null | Out-Null
  $TenantSlug = $slug
  $AdminEmail = "admin+$slug@test.local"
  Write-Host "[OK] Novo tenant: $TenantSlug" -ForegroundColor Green
} else {
  try {
    Invoke-Api POST "/auth/register-tenant" @{
      tenantName       = "Demo Atende"
      tenantSlug       = $TenantSlug
      adminDisplayName = "Admin"
      adminEmail       = $AdminEmail
      adminPassword    = $AdminPassword
    } $null | Out-Null
  } catch { }
}

$login = Invoke-Api POST "/auth/login" @{
  email        = $AdminEmail
  password     = $AdminPassword
  tenantSlug   = $TenantSlug
} $null
$token = $login.accessToken
$tenantId = $login.claims.tenantId
Write-Host "[OK] Login tenantId=$tenantId" -ForegroundColor Green

$list = Invoke-Api GET "/flows?limit=100" $null $token
foreach ($item in $list.data) {
  if ($item.status -eq "active") {
    Invoke-Api POST "/flows/$($item.id)/deactivate" $null $token | Out-Null
    Write-Host "[OK] Desativado flow $($item.name)" -ForegroundColor DarkGray
  }
}

$created = Invoke-Api POST "/flows" @{
  name        = $FlowName
  description = $FlowDescription
} $token
$flowId = $created.flow.id
$partial = Get-Content $FlowJsonPath -Raw | ConvertFrom-Json
$definition = @{
  id          = $flowId
  tenantId    = $tenantId
  startNodeId = $partial.startNodeId
  nodes       = $partial.nodes
  edges       = @($partial.edges)
}
Invoke-Api PUT "/flows/$flowId" @{ definition = $definition } $token | Out-Null
$val = Invoke-Api POST "/flows/$flowId/validate" $null $token
if (-not $val.validation.isValid) {
  Write-Host "[ERRO] Flow invalido:" -ForegroundColor Red
  $val.validation.issues | ForEach-Object { Write-Host "  - $($_.code): $($_.message)" }
  exit 1
}
Invoke-Api POST "/flows/$flowId/publish" $null $token | Out-Null
Invoke-Api POST "/flows/$flowId/activate" $null $token | Out-Null
Write-Host "[OK] Flow ativo: $flowId ($FlowName)" -ForegroundColor Green

& (Join-Path $PSScriptRoot "register-whatsapp-instance.ps1") `
  -TenantId $tenantId -InstanceId $InstanceId `
  -EvolutionApiKey $EvolutionInstanceApiKey `
  -EvolutionApiUrl $EvolutionApiUrl -InstanceName $EvolutionInstanceName

$webhookUrl = "http://host.docker.internal:3000/webhook/$tenantId/whatsapp/$InstanceId"
try {
  $webhookBody = @{
    webhook = @{
      enabled         = $true
      url             = $webhookUrl
      webhookByEvents = $false
      webhookBase64   = $false
      events          = @("MESSAGES_UPSERT")
      headers         = @{
        apikey       = $EvolutionInstanceApiKey
        "Content-Type" = "application/json"
      }
    }
  } | ConvertTo-Json -Depth 5 -Compress
  Invoke-RestMethod -Method POST -Uri "$EvolutionApiUrl/webhook/set/$EvolutionInstanceName" `
    -Headers @{ apikey = $EvolutionInstanceApiKey; "Content-Type" = "application/json" } `
    -Body $webhookBody | Out-Null
  Write-Host "[OK] Webhook Evolution configurado" -ForegroundColor Green
} catch {
  Write-Host "[AVISO] Falha ao configurar webhook na Evolution." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Credenciais (nao commitar) ===" -ForegroundColor Cyan
Write-Host "Login   : http://localhost:5173/login"
Write-Host "Tenant  : $TenantSlug"
Write-Host "Email   : $AdminEmail"
Write-Host "Senha   : $AdminPassword"
Write-Host "TenantId: $tenantId"
Write-Host "FlowId  : $flowId"
Write-Host ""
Write-Host "Proximo: .\scripts\local\evolution-qr.ps1 -EvolutionApiKey `"$EvolutionInstanceApiKey`"" -ForegroundColor Yellow
Write-Host "Guia: docs/guides/desenvolvimento-local.md"
