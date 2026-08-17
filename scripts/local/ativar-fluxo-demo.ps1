# Ativa fluxo de teste no tenant demo-atende (sem configurar WhatsApp — use a UI em Configuracoes).
param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$TenantSlug = "demo-atende",
  [string]$AdminEmail = "admin@demo.com",
  [string]$AdminPassword = "Test1234!",
  [string]$FlowJsonPath = ".\scripts\local\flows\fluxo-provedora-internet-completo.json",
  [string]$FlowName = "NetFacil — Internet E2E"
)

$ErrorActionPreference = "Stop"

if (-not [System.IO.Path]::IsPathRooted($FlowJsonPath)) {
  $FlowJsonPath = Join-Path (Get-Location) $FlowJsonPath
}

function Invoke-Api($Method, $Path, $Body, $Token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $p = @{ Method = $Method; Uri = "$BaseUrl$Path"; Headers = $headers; ErrorAction = "Stop" }
  if ($Body) { $p["Body"] = ($Body | ConvertTo-Json -Depth 25 -Compress) }
  return Invoke-RestMethod @p
}

Write-Host "=== Ativar fluxo demo ($TenantSlug) ===" -ForegroundColor Cyan

$login = Invoke-Api POST "/auth/login" @{
  email      = $AdminEmail
  password   = $AdminPassword
  tenantSlug = $TenantSlug
} $null
$token = $login.accessToken
$tenantId = $login.claims.tenantId
Write-Host "[OK] Login tenantId=$tenantId" -ForegroundColor Green

$list = Invoke-Api GET "/flows?limit=100" $null $token
foreach ($item in $list.data) {
  if ($item.status -eq "active") {
    Invoke-Api POST "/flows/$($item.id)/deactivate" $null $token | Out-Null
    Write-Host "[OK] Desativado: $($item.name)" -ForegroundColor DarkGray
  }
}

$partial = Get-Content $FlowJsonPath -Raw | ConvertFrom-Json
$created = Invoke-Api POST "/flows" @{
  name        = $FlowName
  description = "ISP E2E: message, option, input, transfer, end + handoff Chatwoot"
} $token
$flowId = $created.flow.id

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
  $val.validation.issues | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
  exit 1
}
Invoke-Api POST "/flows/$flowId/publish" $null $token | Out-Null
Invoke-Api POST "/flows/$flowId/activate" $null $token | Out-Null

Write-Host "[OK] Fluxo ativo: $flowId" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo: Configuracoes -> Ativar integracao WhatsApp -> Conectar QR" -ForegroundColor Yellow
