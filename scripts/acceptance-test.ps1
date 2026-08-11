param(
  [Parameter(Mandatory = $true)][int]$Port,
  [string]$Username = 'admin',
  [string]$Password = '1234',
  [string]$NewPassword = ''
)

$ErrorActionPreference = 'Stop'
if ($Port -eq 8080) { throw 'Esta prueba crea datos. Use exclusivamente un puerto de pruebas aislado.' }
$baseUrl = "http://localhost:$Port/api"

function Invoke-Api {
  param([string]$Path, [string]$Method = 'Get', [object]$Body = $null)
  $arguments = @{ Uri = "$baseUrl/$Path"; Method = $Method; Headers = $script:headers }
  if ($null -ne $Body) {
    $arguments.ContentType = 'application/json'
    $arguments.Body = $Body | ConvertTo-Json -Depth 8
  }
  Invoke-RestMethod @arguments
}

$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body (@{
  username = $Username
  password = $Password
} | ConvertTo-Json)
$script:headers = @{ Authorization = "Bearer $($login.accessToken)" }

if ($NewPassword) {
  Invoke-Api -Path 'auth/change-password' -Method Post -Body @{
    currentPassword = $Password
    newPassword = $NewPassword
  } | Out-Null
}

$clients = @()
for ($page = 1; $page -le 10; $page++) {
  $batch = Invoke-Api -Path "clients?page=$page&pageSize=100&status=Activo"
  $clients += @($batch.items)
  if ($clients.Count -ge [int]$batch.total) { break }
}
$loans = Invoke-Api -Path 'loans?page=1&pageSize=100'
$occupied = @{}
foreach ($loan in @($loans.items)) { $occupied[$loan.clientId] = $true }
$client = $clients | Where-Object { -not $occupied.ContainsKey($_.id) } | Select-Object -First 1
if (-not $client) { throw 'No hay un cliente libre para la prueba de prestamo.' }

$routes = @(Invoke-Api -Path 'routes?active=true')
$route = if ($client.route) { $client.route } else { $routes | Select-Object -First 1 }
if (-not $route) { throw 'No hay una ruta activa para la prueba.' }

$today = Get-Date -Format 'yyyy-MM-dd'
$loanBody = @{
  clientId = $client.id
  requestedAmount = 800000
  disbursedAmount = 800000
  loanDate = $today
  installmentCount = 15
  frequency = 'Diario'
  interestRate = 0.25
  interestType = 'Fijo'
  administrativeFee = 0
  insurance = 0
  additionalCosts = 0
  advisor = 'NO_DEBE_GUARDARSE'
  routeId = $route.id
  chargeMode = 'Financiados'
  observations = 'Prueba automatizada aislada'
}

$created = Invoke-Api -Path 'loans' -Method Post -Body $loanBody
if ($created.advisor -ne $Username) { throw 'El asesor no corresponde al usuario autenticado.' }
if ([Math]::Abs([double]$created.dailyInstallment - 66666.67) -gt 0.01) { throw 'La cuota calculada no es correcta.' }
if (-not $created.createdAt) { throw 'El prestamo no devolvio fecha y hora de registro.' }

$refinanced = Invoke-Api -Path "loans/$($created.id)/refinance" -Method Post -Body $loanBody
if ($refinanced.number -notlike 'RF-*') { throw 'La refinanciacion no genero codigo RF.' }
if ($refinanced.advisor -ne $Username) { throw 'El asesor de la refinanciacion no corresponde al usuario autenticado.' }

$payment = Invoke-Api -Path 'payments' -Method Post -Body @{
  loanId = $refinanced.id
  paymentDate = $today
  amount = 50000
  method = 'Efectivo'
  responsible = $Username
  observations = 'Prueba automatizada aislada'
}
if ([double]$payment.amount -ne 50000) { throw 'El valor pagado fue modificado inesperadamente.' }
if (-not $payment.createdAt) { throw 'El pago no devolvio fecha y hora de registro.' }
$scheduledTotal = [double](($refinanced.installments | Measure-Object -Property amount -Sum).Sum)
if ([Math]::Abs([double]$payment.pendingBalance - ($scheduledTotal - 50000)) -gt 0.01) { throw 'El saldo pendiente del primer pago no es correcto.' }

$secondPayment = Invoke-Api -Path 'payments' -Method Post -Body @{
  loanId = $refinanced.id
  paymentDate = $today
  amount = 10000
  method = 'Efectivo'
  responsible = $Username
  observations = 'Segunda prueba para saldo historico'
}
$paymentRows = Invoke-Api -Path "payments?search=$($refinanced.number)&page=1&pageSize=25"
$firstRow = @($paymentRows.items) | Where-Object { $_.id -eq $payment.id } | Select-Object -First 1
$secondRow = @($paymentRows.items) | Where-Object { $_.id -eq $secondPayment.id } | Select-Object -First 1
if (-not $firstRow -or -not $secondRow) { throw 'La tabla de pagos no devolvio los dos abonos de prueba.' }
if ([Math]::Abs([double]$firstRow.pendingBalance - ($scheduledTotal - 50000)) -gt 0.01) { throw 'El saldo historico del primer pago cambio incorrectamente.' }
if ([Math]::Abs([double]$secondRow.pendingBalance - ($scheduledTotal - 60000)) -gt 0.01) { throw 'El saldo pendiente del segundo pago no es correcto.' }

$collectableClients = Invoke-Api -Path "clients?search=$($client.code)&page=1&pageSize=15&status=Activo&collectable=true"
if (-not (@($collectableClients.items) | Where-Object { $_.id -eq $client.id })) { throw 'El selector de pagos no devolvio al cliente con prestamo cobrable.' }
$clientLoans = Invoke-Api -Path "loans?clientId=$($client.id)&page=1&pageSize=100"
if (@($clientLoans.items) | Where-Object { $_.clientId -ne $client.id }) { throw 'El filtro de prestamos devolvio registros de otro cliente.' }

$summary = Invoke-Api -Path "cash-closures/summary?routeId=$($route.id)&date=$today"
$requiredSummaryFields = @(
  'invoicesIn', 'invoicesOut', 'salesPayments', 'cancelledPayments',
  'refinancedLoans', 'refinancedAmount', 'expectedAmount', 'receivedAmount',
  'effectiveness', 'gota', 'gotaPercentage', 'ratingPercentage', 'initialCash'
)
foreach ($field in $requiredSummaryFields) {
  if ($summary.PSObject.Properties.Name -notcontains $field) { throw "Falta el campo $field en cierre de caja." }
}

[pscustomobject]@{
  ClientsLoaded = $clients.Count
  Loan = $created.number
  Installment = $created.dailyInstallment
  Advisor = $created.advisor
  Refinance = $refinanced.number
  Payment = $payment.amount
  FirstPendingBalance = $firstRow.pendingBalance
  SecondPendingBalance = $secondRow.pendingBalance
  CollectableClients = $collectableClients.total
  CashSummaryFields = $requiredSummaryFields.Count
} | Format-List
