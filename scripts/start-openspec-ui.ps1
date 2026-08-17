# Inicia o kanban OpenSpec UI apontando para openspec-ui.json na raiz do repo
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Exe = Join-Path $Root 'tools/openspec-ui/bin/openspec-ui.exe'
$Config = Join-Path $Root 'openspec-ui.json'

if (-not (Test-Path $Exe)) {
  & (Join-Path $Root 'scripts/setup-openspec-ui.ps1')
}

Write-Host "OpenSpec UI: http://localhost:3333"
& $Exe --config $Config
