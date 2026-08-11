param(
  [string]$Username = 'admin',
  [string]$Password = '1234',
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project

$resolvedPort = $Port
if ($resolvedPort -le 0) { $resolvedPort = 8080 }
if ($Port -le 0 -and (Test-Path '.env')) {
  $portLine = Get-Content '.env' | Where-Object { $_ -match '^APP_PORT=' } | Select-Object -First 1
  if ($portLine) { $resolvedPort = [int]($portLine -replace '^APP_PORT=', '') }
}
$baseUrl = "http://localhost:$resolvedPort/api"

$health = Invoke-RestMethod -Uri "$baseUrl/health"
if ($health.status -ne 'ok') { throw 'El endpoint de salud no respondió correctamente.' }

$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
$session = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
$headers = @{ Authorization = "Bearer $($session.accessToken)" }

$clients = Invoke-RestMethod -Uri "$baseUrl/clients?pageSize=1" -Headers $headers
$loans = Invoke-RestMethod -Uri "$baseUrl/loans?pageSize=1" -Headers $headers
$payments = Invoke-RestMethod -Uri "$baseUrl/payments?pageSize=1" -Headers $headers

$previewBody = @{
  disbursedAmount = 800000
  installmentCount = 15
  interestRate = 0.25
} | ConvertTo-Json
$preview = Invoke-RestMethod -Uri "$baseUrl/loans/preview" -Method Post -ContentType 'application/json' -Headers $headers -Body $previewBody
if ([Math]::Abs([double]$preview.dailyInstallment - 66666.67) -gt 0.01) { throw 'Fallo el calculo de cuota esperado.' }
if ($preview.total -ne 1000000) { throw 'Falló el cálculo de interés fijo esperado.' }

$belowMinimum = $previewBody | ConvertFrom-Json
$belowMinimum.interestRate = 0.19
$blocked = $false
try {
  Invoke-RestMethod -Uri "$baseUrl/loans/preview" -Method Post -ContentType 'application/json' -Headers $headers -Body ($belowMinimum | ConvertTo-Json) | Out-Null
} catch {
  $blocked = [int]$_.Exception.Response.StatusCode -eq 400
}
if (-not $blocked) { throw 'La API no bloqueó un interés inferior al 20 %.' }

Write-Host "Prueba completa: $($clients.total) clientes, $($loans.total) préstamos y $($payments.total) pagos." -ForegroundColor Green
