<#
.SYNOPSIS
Atalho opcional do workspace para chamar os builds autonomos dos componentes.
#>
[CmdletBinding()]
param([switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$components = @('platform-service', 'scheduler-service', 'workflow-service', 'identity-access-service')
$previousJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'Process')
try {
    foreach ($component in $components) {
        if ($component -eq 'workflow-service' -and $env:WORKFLOW_JAVA_HOME) {
            $env:JAVA_HOME = $env:WORKFLOW_JAVA_HOME
        }
        else { [Environment]::SetEnvironmentVariable('JAVA_HOME', $previousJavaHome, 'Process') }
        & (Join-Path $workspaceRoot "services/$component/scripts/build/build.ps1") -SkipTests:$SkipTests
    }
    & (Join-Path $workspaceRoot 'apps/portal-web/scripts/build/build.ps1')
}
finally { [Environment]::SetEnvironmentVariable('JAVA_HOME', $previousJavaHome, 'Process') }
Write-Host 'Todos os componentes foram validados.' -ForegroundColor Green
