# Sobe Chatwoot local, configura inbox API + webhook e atualiza .env do Atende Facil.
# Requer: Docker, Postgres/Valkey (infra principal), API :3000 disponivel para webhook.
#
# Uso:
#   .\scripts\local\setup-chatwoot-local.ps1
#   .\scripts\local\setup-chatwoot-local.ps1 -ChatwootEmail "admin@chatwoot.local" -ChatwootPassword "Chatwoot123!"

param(
  [string]$ChatwootUrl = "http://localhost:3001",
  [string]$ApiBaseUrl = "http://host.docker.internal:3000",
  [string]$ChatwootEmail = "admin@chatwoot.local",
  [string]$ChatwootPassword = "Chatwoot123!",
  [string]$AccountName = "Atende Facil Local",
  [string]$InboxName = "Atende Facil WhatsApp API",
  [string]$EnvFile = ".env",
  [string]$ComposeDir = "infra"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $repoRoot

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

Write-Step "Chatwoot local - setup E2E"

Write-Step "1/6 Banco chatwoot no Postgres"
$dbExists = docker exec spec-driven-postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='chatwoot'" 2>$null
if ($dbExists -ne "1") {
  docker exec spec-driven-postgres psql -U postgres -c "CREATE DATABASE chatwoot;" | Out-Null
  Write-Ok "Database chatwoot criado"
} else {
  Write-Ok "Database chatwoot ja existe"
}

Write-Step "2/6 Subir containers Chatwoot (:3001)"
docker compose -f "$ComposeDir/docker-compose.yml" -f "$ComposeDir/docker-compose.chatwoot.yml" up -d chatwoot chatwoot-sidekiq

Write-Step "3/6 Preparar schema Chatwoot (primeira execucao)"
docker exec spec-driven-chatwoot test -f /app/tmp/chatwoot-db-prepared 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  docker exec spec-driven-chatwoot bundle exec rails db:chatwoot_prepare
  docker exec spec-driven-chatwoot sh -c 'mkdir -p /app/tmp; touch /app/tmp/chatwoot-db-prepared'
  Write-Ok "Schema Chatwoot preparado"
} else {
  Write-Ok "Schema Chatwoot ja preparado"
}

Write-Step "4/6 Aguardar Chatwoot responder"
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    Invoke-WebRequest -Uri "$ChatwootUrl/api" -UseBasicParsing -TimeoutSec 5 | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 5
  }
}
if (-not $ready) { throw "Chatwoot nao respondeu em $ChatwootUrl apos 5 minutos" }
Write-Ok "Chatwoot online"

Write-Step "5/6 Conta + token de API"

$accountId = "1"
$token = $null

try {
  $signInBody = @{ email = $ChatwootEmail; password = $ChatwootPassword } | ConvertTo-Json
  $signIn = Invoke-WebRequest -Method POST -Uri "$ChatwootUrl/auth/sign_in" `
    -Headers @{ "Content-Type" = "application/json" } -Body $signInBody -ErrorAction Stop
  $token = $signIn.Headers["access-token"]
  Write-Ok "Login Chatwoot: $ChatwootEmail"
} catch {
  Write-Warn "Login falhou - criando admin via Rails (primeira execucao)"
  docker exec spec-driven-chatwoot bundle exec rails runner @"
email='$ChatwootEmail'; password='$ChatwootPassword'; name='Admin Local'; accountName='$AccountName';
unless User.find_by(email: email)
  user = User.new(name: name, email: email, password: password, password_confirmation: password)
  user.skip_confirmation!
  user.save!
  account = Account.create!(name: accountName)
  AccountUser.create!(account: account, user: user, role: :administrator)
end
u = User.find_by!(email: email)
t = AccessToken.find_by(owner: u) || AccessToken.create!(owner: u)
puts t.token
"@ | ForEach-Object { $_.TrimEnd() }
  $token = (docker exec spec-driven-chatwoot bundle exec rails runner "u=User.find_by(email:'$ChatwootEmail'); t=AccessToken.find_by(owner:u)||AccessToken.create!(owner:u); puts t.token" 2>$null | Select-Object -Last 1).Trim()
  Write-Ok "Admin + token PAT criados"
}

if (-not $token) {
  $token = (docker exec spec-driven-chatwoot bundle exec rails runner "u=User.find_by(email:'$ChatwootEmail'); t=AccessToken.find_by(owner:u)||AccessToken.create!(owner:u); puts t.token" 2>$null | Select-Object -Last 1).Trim()
}

if (-not $token) { throw "Nao foi possivel obter api_access_token do Chatwoot" }

Write-Step "Platform App (login unico / SSO)"
$platformToken = (docker exec spec-driven-chatwoot bundle exec rails runner @"
app = PlatformApp.find_by(name: 'atende-facil') || PlatformApp.create!(name: 'atende-facil')
puts app.access_token.token
"@ 2>$null | Select-Object -Last 1).Trim()
if ($platformToken) {
  Write-Ok "Platform token disponivel (CHATWOOT_PLATFORM_TOKEN)"
} else {
  Write-Warn "Nao foi possivel mintar o Platform token - SSO ficara desabilitado (deep link continua funcionando)"
}

$apiHeaders = @{
  "Content-Type"     = "application/json"
  "api_access_token" = $token
}

$inboxes = Invoke-RestMethod -Uri "$ChatwootUrl/api/v1/accounts/$accountId/inboxes" -Headers $apiHeaders
$inbox = $inboxes.payload | Where-Object { $_.channel_type -eq "Channel::Api" } | Select-Object -First 1

if (-not $inbox) {
  $created = Invoke-RestMethod -Method POST -Uri "$ChatwootUrl/api/v1/accounts/$accountId/inboxes" `
    -Headers $apiHeaders -Body (@{
      name    = $InboxName
      channel = @{ type = "api"; webhook_url = "" }
    } | ConvertTo-Json -Depth 5)
  $inboxId = $created.id
  Write-Ok "Inbox API criada: id=$inboxId"
} else {
  $inboxId = $inbox.id
  Write-Ok "Inbox API existente: id=$inboxId ($($inbox.name))"
}

$webhookToken = [guid]::NewGuid().ToString()
$webhookUrl = "$ApiBaseUrl/webhook/chatwoot?token=$webhookToken"

Write-Step "6/6 Webhook + .env"
try {
  Invoke-RestMethod -Method POST -Uri "$ChatwootUrl/api/v1/accounts/$accountId/webhooks" `
    -Headers $apiHeaders -Body (@{
      url           = $webhookUrl
      subscriptions = @("message_created", "conversation_status_changed")
    } | ConvertTo-Json) | Out-Null
  Write-Ok "Webhook registrado: $webhookUrl"
} catch {
  Write-Warn "Webhook pode ja existir - configure manualmente no painel Chatwoot (Integrations / Webhooks)"
  Write-Host "  URL: $webhookUrl" -ForegroundColor DarkGray
}

$envPath = Join-Path $repoRoot $EnvFile
$content = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { "" }

$envUpdates = @{
  CHATWOOT_API_URL       = $ChatwootUrl
  CHATWOOT_APP_URL       = $ChatwootUrl
  CHATWOOT_API_TOKEN     = $token
  CHATWOOT_ACCOUNT_ID    = $accountId
  CHATWOOT_INBOX_ID      = $inboxId
  CHATWOOT_WEBHOOK_TOKEN = $webhookToken
}
if ($platformToken) {
  $envUpdates.CHATWOOT_PLATFORM_TOKEN = $platformToken
}

foreach ($entry in $envUpdates.GetEnumerator()) {
  $name = $entry.Key
  $value = $entry.Value
  if ($content -match "(?m)^$name=") {
    $content = $content -replace "(?m)^$name=.*$", "$name=$value"
  } else {
    $content = "$($content.TrimEnd())`n$name=$value"
  }
}

Set-Content -Path $envPath -Value $content.TrimEnd() -Encoding UTF8
Write-Ok "Atualizado $EnvFile"

Write-Host ""
Write-Host "Chatwoot pronto para E2E humano" -ForegroundColor Green
Write-Host "Painel Chatwoot: $ChatwootUrl"
Write-Host "Login:           $ChatwootEmail / $ChatwootPassword"
Write-Host "Inbox ID:        $inboxId"
Write-Host ""
Write-Host "Proximo passo: REINICIE a API (bun run dev) e dispare novo hand-off no WhatsApp."
Write-Host "Conversas antigas com ID mock precisam de novo fluxo transfer no celular."
Write-Host ""
