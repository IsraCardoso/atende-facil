# Valida reachability da Evolution API e apikey antes do fluxo self-service na UI.
param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

function Read-DotEnvValue {
  param([string]$Name, [string]$Path)

  if (-not (Test-Path $Path)) {
    return $null
  }

  $line = Get-Content $Path | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return ($line -split "=", 2)[1].Trim().Trim('"')
}

$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repoRoot

$evolutionUrl = Read-DotEnvValue -Name "EVOLUTION_API_URL" -Path $EnvFile
$evolutionKey = Read-DotEnvValue -Name "EVOLUTION_API_KEY" -Path $EnvFile
$publicApiUrl = Read-DotEnvValue -Name "PUBLIC_API_URL" -Path $EnvFile

if (-not $evolutionUrl) {
  Write-Host "FALHA: EVOLUTION_API_URL ausente em $EnvFile" -ForegroundColor Red
  exit 1
}

if (-not $evolutionKey) {
  Write-Host "FALHA: EVOLUTION_API_KEY ausente em $EnvFile" -ForegroundColor Red
  exit 1
}

Write-Host "Evolution URL: $evolutionUrl"
Write-Host "PUBLIC_API_URL: $(if ($publicApiUrl) { $publicApiUrl } else { '(nao definido — API usara fallback)' })"

try {
  $response = Invoke-WebRequest -Uri "$evolutionUrl/" -Headers @{ apikey = $evolutionKey } -Method GET -TimeoutSec 15
  Write-Host "OK: Evolution respondeu HTTP $($response.StatusCode)" -ForegroundColor Green
}
catch {
  Write-Host "FALHA: Evolution nao acessivel em $evolutionUrl" -ForegroundColor Red
  Write-Host $_.Exception.Message
  Write-Host "Dica: execute 'bun run infra:up' e confira se a porta 8081 esta livre." -ForegroundColor Yellow
  exit 1
}

Write-Host "Proximo passo: bun run dev -> Configuracoes -> Ativar integracao -> Conectar WhatsApp (QR)" -ForegroundColor Cyan
