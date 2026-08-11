$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
docker compose up -d --build
Write-Host 'Sistema disponible en http://localhost:8080' -ForegroundColor Green

