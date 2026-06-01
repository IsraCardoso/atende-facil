# Verifica dados coletados em sessions.data apos teste E2E.
# Uso: .\scripts\local\verify-session-data.ps1 -TenantId "<uuid>"

param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,

  [string]$PostgresContainer = "spec-driven-postgres",
  [string]$Database = "spec_driven_dev",
  [int]$Limit = 5,
  [string]$Phone = ""
)

$ErrorActionPreference = "Stop"

$phoneFilter = ""
if ($Phone) {
  $phoneFilter = "AND phone = '$Phone'"
}

$sql = @"
SELECT phone, mode, current_node_id, data::text, updated_at
FROM sessions
WHERE tenant_id = '$TenantId'
$phoneFilter
ORDER BY updated_at DESC
LIMIT $Limit;
"@

Write-Host "=== Sessions - tenant $TenantId ===" -ForegroundColor Cyan
$delimiter = [char]9
$output = & docker exec -i $PostgresContainer psql -U postgres -d $Database -t -A "-F$delimiter" -c $sql.Trim()
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ERRO] Falha ao consultar Postgres: $output" -ForegroundColor Red
  exit 1
}

$lines = @($output | Where-Object { $_ -and $_.Trim() -ne "" })
if ($lines.Count -eq 0) {
  Write-Host "[AVISO] Nenhuma sessao encontrada." -ForegroundColor Yellow
  exit 0
}

$billingFields = @("cpf", "contractNumber")
$techFields = @("customerName", "addressOrCep", "issueDescription")
$humanFields = @("customerName", "subject")

foreach ($line in $lines) {
  $parts = $line -split "`t", 5
  if ($parts.Count -lt 4) { continue }

  $phoneVal = $parts[0]
  $modeVal = $parts[1]
  $nodeVal = $parts[2]
  $dataRaw = $parts[3]
  $updatedVal = if ($parts.Count -ge 5) { $parts[4] } else { "" }

  Write-Host ""
  Write-Host "Phone    : $phoneVal" -ForegroundColor White
  Write-Host "Mode     : $modeVal"
  Write-Host "Node     : $(if ($nodeVal) { $nodeVal } else { '(null)' })"
  Write-Host "Updated  : $updatedVal"
  Write-Host "Data     : $dataRaw"

  try {
    $data = $dataRaw | ConvertFrom-Json
    $keys = @($data.PSObject.Properties.Name)

    if ($billingFields | ForEach-Object { $keys -contains $_ } | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count) {
      $billingOk = ($billingFields | ForEach-Object { $keys -contains $_ } | Where-Object { $_ }).Count -eq $billingFields.Count
      if ($billingOk) {
        Write-Host "  [OK] Caminho A (fatura): cpf + contractNumber presentes" -ForegroundColor Green
      }
    }

    $hasTech = ($techFields | ForEach-Object { $keys -contains $_ } | Where-Object { $_ }).Count -eq $techFields.Count
    if ($hasTech) {
      Write-Host "  [OK] Caminho B (suporte tecnico): customerName + addressOrCep + issueDescription" -ForegroundColor Green
    }

    $hasHuman = ($keys -contains "customerName") -and ($keys -contains "subject") -and -not ($keys -contains "issueDescription")
    if ($hasHuman) {
      Write-Host "  [OK] Caminho C (atendente): customerName + subject" -ForegroundColor Green
    }

    if ($modeVal -eq "waiting_human") {
      Write-Host "  [OK] Modo waiting_human (hand-off concluido)" -ForegroundColor Green
    }
  } catch {
    Write-Host "  [AVISO] JSON invalido em data" -ForegroundColor Yellow
  }
}

Write-Host ""
