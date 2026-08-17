# Gera QR code fresco da Evolution API e salva como PNG.
# Uso: .\scripts\local\evolution-qr.ps1 -EvolutionApiKey "SUA_APIKEY"

param(
  [string]$EvolutionApiUrl = "http://localhost:8080",
  [string]$InstanceName = "atende-facil-e2e",
  [Parameter(Mandatory = $true)]
  [string]$EvolutionApiKey,
  [string]$OutputPath = "",
  [switch]$LogoutFirst
)

$ErrorActionPreference = "Stop"

if (-not $OutputPath) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  $OutputPath = Join-Path $repoRoot "docs\guides\evolution-qr-atende-facil-e2e.png"
}

function Get-ConnectionState {
  $r = Invoke-RestMethod -Method GET -Uri "$EvolutionApiUrl/instance/connectionState/$InstanceName" `
    -Headers @{ apikey = $EvolutionApiKey } -ErrorAction Stop
  return $r.instance.state
}

Write-Host "=== Evolution QR - $InstanceName ===" -ForegroundColor Cyan

try {
  $state = Get-ConnectionState
  Write-Host "Estado atual: $state" -ForegroundColor DarkGray
} catch {
  Write-Host "[AVISO] Nao foi possivel ler connectionState: $($_.Exception.Message)" -ForegroundColor Yellow
  $state = "unknown"
}

if ($LogoutFirst -or $state -eq "connecting") {
  Write-Host "Tentando logout da instancia (estado travado ou -LogoutFirst)..." -ForegroundColor Yellow
  try {
    Invoke-RestMethod -Method DELETE -Uri "$EvolutionApiUrl/instance/logout/$InstanceName" `
      -Headers @{ apikey = $EvolutionApiKey } -ErrorAction Stop | Out-Null
    Start-Sleep -Seconds 2
    Write-Host "[OK] Logout executado" -ForegroundColor Green
  } catch {
    Write-Host "[AVISO] Logout falhou (pode ser normal se ja desconectado): $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host "Gerando QR..." -ForegroundColor Cyan
$connectUri = "$EvolutionApiUrl/instance/connect/$InstanceName"
$jsonPath = Join-Path $env:TEMP "evolution-connect-$(Get-Random).json"

curl.exe -s -m 20 -X GET $connectUri -H "apikey: $EvolutionApiKey" -o $jsonPath
if (-not (Test-Path $jsonPath)) {
  Write-Host "[ERRO] Resposta vazia da Evolution." -ForegroundColor Red
  exit 1
}

$raw = Get-Content $jsonPath -Raw
Remove-Item $jsonPath -Force -ErrorAction SilentlyContinue

if ($raw.Length -lt 50) {
  Write-Host "[ERRO] Resposta inesperada: $raw" -ForegroundColor Red
  exit 1
}

$response = $raw | ConvertFrom-Json
if (-not $response.base64) {
  Write-Host "[ERRO] Campo base64 ausente na resposta." -ForegroundColor Red
  Write-Host $raw.Substring(0, [Math]::Min(500, $raw.Length))
  exit 1
}

$b64 = $response.base64 -replace '^data:image/png;base64,', ''
$bytes = [Convert]::FromBase64String($b64)
[System.IO.File]::WriteAllBytes($OutputPath, $bytes)

$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
Write-Host ""
Write-Host "[OK] QR salvo: $OutputPath" -ForegroundColor Green
Write-Host "     Gerado em: $timestamp (expira em ~60 segundos)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Escaneie agora no WhatsApp: Aparelhos conectados - Conectar aparelho" -ForegroundColor Cyan
Write-Host ""
Write-Host "Confirme conexao com connectionState na Evolution API" -ForegroundColor DarkGray

try {
  Start-Process $OutputPath | Out-Null
} catch {
  Write-Host ('Abra manualmente: ' + $OutputPath) -ForegroundColor DarkGray
}
