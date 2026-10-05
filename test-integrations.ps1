<#
.SYNOPSIS
Executa smoke tests das integracoes implantadas no Kubernetes local.
#>
[CmdletBinding()]
param(
    [string]$WslDistribution = 'Ubuntu-26.04',
    [string]$Namespace = 'observabilidade-portal',
    [string]$PortalUrl = 'http://localhost:30080',
    [switch]$SkipGateway
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = $PSScriptRoot
$commonScript = Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1'
. $commonScript

try {
    Assert-RolloutPrerequisites -Distribution $WslDistribution
    Test-PortalIntegrations -Distribution $WslDistribution -Namespace $Namespace

    if (-not $SkipGateway) {
        $baseUrl = $PortalUrl.TrimEnd('/')
        Write-RolloutStep "Testando o Gateway em $baseUrl"
        Invoke-WslCommand -Distribution $WslDistribution -Arguments @('curl', '--fail', '--silent', '--show-error', '--output', '/dev/null', "$baseUrl/")
        Invoke-WslCommand -Distribution $WslDistribution -Arguments @('curl', '--fail', '--silent', '--show-error', '--output', '/dev/null', "$baseUrl/api/v1/scheduler")
        Invoke-WslCommand -Distribution $WslDistribution -Arguments @('curl', '--fail', '--silent', '--show-error', '--output', '/dev/null', "$baseUrl/api/v1/auth/providers")
    }

    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace
    Write-Host ""
    Write-Host "Testes de integracao concluidos com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
