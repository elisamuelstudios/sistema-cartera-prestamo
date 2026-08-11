param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
Set-Location $project

$containerId = (docker compose ps -q db).Trim()
if (-not $containerId) { throw 'PostgreSQL no está iniciado. Ejecuta primero scripts\iniciar.ps1.' }

Write-Warning 'La restauración reemplazará la información actual de la base de datos.'
$confirmation = Read-Host 'Escribe RESTAURAR para continuar'
if ($confirmation -cne 'RESTAURAR') { Write-Host 'Restauración cancelada.'; exit 0 }

docker cp $resolvedBackup "${containerId}:/tmp/cartera_restore.sql"
try {
  docker compose exec -T db sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/cartera_restore.sql'
  Write-Host 'Base de datos restaurada correctamente.' -ForegroundColor Green
} finally {
  docker compose exec -T db rm -f /tmp/cartera_restore.sql | Out-Null
}
