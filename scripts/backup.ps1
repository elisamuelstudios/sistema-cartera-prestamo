$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$backupDirectory = Join-Path $project 'backups'
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$output = Join-Path $backupDirectory "cartera_$stamp.sql"
Set-Location $project
docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' | Set-Content -Encoding utf8 $output
Write-Host "Backup creado: $output" -ForegroundColor Green
