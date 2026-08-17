# Baixa e extrai OpenSpec UI (kanban) para tools/openspec-ui/bin/
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$UiDir = Join-Path $Root 'tools/openspec-ui'
$BinDir = Join-Path $UiDir 'bin'
$Exe = Join-Path $BinDir 'openspec-ui.exe'

if (Test-Path $Exe) {
  Write-Host "OpenSpec UI ja instalado: $Exe"
  exit 0
}

New-Item -ItemType Directory -Force -Path $UiDir | Out-Null
$Zip = Join-Path $UiDir 'openspec-ui-windows.zip'
$Url = 'https://github.com/ToruAI/openspec-ui/releases/download/v0.1.0/openspec-ui-v0.1.0-windows-x86_64.zip'

Write-Host "Baixando OpenSpec UI..."
Invoke-WebRequest -Uri $Url -OutFile $Zip
Expand-Archive -Path $Zip -DestinationPath $BinDir -Force
Remove-Item $Zip -Force
Write-Host "Instalado em $Exe"
