<#
.SYNOPSIS
Reconstroi a imagem local do obs-web e executa seu rollout no Kubernetes WSL.

.EXAMPLE
.\rollout-obs-web.ps1

.EXAMPLE
.\rollout-obs-web.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 240
#>
[CmdletBinding()]
param(
    [string]$WslDistribution = 'Ubuntu-26.04',
    [string]$Namespace = 'observabilidade-portal',
    [ValidateRange(30, 1800)]
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$commonScript = Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1'
. $commonScript

try {
    Assert-RolloutPrerequisites -Distribution $WslDistribution -Namespace $Namespace
    $wslRepositoryRoot = Get-WslRepositoryPath -Distribution $WslDistribution -RepositoryRoot $repositoryRoot

    $image = 'localhost/observabilidade-portal/obs-web:local'
    Build-AndImportLocalImage -Distribution $WslDistribution -Image $image -BuildContext "$wslRepositoryRoot/obs-web"

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/obs-web.yaml"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'obs-web'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/obs-web' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout do obs-web concluido com sucesso." -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
