<#
.SYNOPSIS
Instala, valida os tipos e compila somente o portal web.
#>
[CmdletBinding()]
param([string]$SchedulerServiceUrl = '')
$ErrorActionPreference = 'Stop'
$componentRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$npmCommand = 'npm'
if ($env:OS -eq 'Windows_NT') { $npmCommand = 'npm.cmd' }
$previousUrl = [Environment]::GetEnvironmentVariable('VITE_SCHEDULER_SERVICE_URL', 'Process')
Push-Location $componentRoot
try {
    $env:VITE_SCHEDULER_SERVICE_URL = $SchedulerServiceUrl
    & $npmCommand ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou.' }
    & $npmCommand run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'A verificacao de tipos falhou.' }
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) { throw 'O build do portal falhou.' }
}
finally {
    Pop-Location
    [Environment]::SetEnvironmentVariable('VITE_SCHEDULER_SERVICE_URL', $previousUrl, 'Process')
}
