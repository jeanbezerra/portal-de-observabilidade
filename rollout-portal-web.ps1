<#
.SYNOPSIS
Reconstroi a imagem local do portal-web e executa seu rollout no Kubernetes WSL.

.EXAMPLE
.\rollout-portal-web.ps1

.EXAMPLE
.\rollout-portal-web.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 240
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
    Assert-RolloutPrerequisites -Distribution $WslDistribution
    $wslRepositoryRoot = Get-WslRepositoryPath -Distribution $WslDistribution -RepositoryRoot $repositoryRoot
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/namespace.yaml"

    Build-PortalWebArtifact -RepositoryRoot $repositoryRoot

    $image = 'localhost/observabilidade-portal/portal-web:local'
    Build-AndImportLocalImage -Distribution $WslDistribution -Image $image -BuildContext "$wslRepositoryRoot/apps/portal-web"

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/portal-web.yaml"
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/http-route.yaml"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'portal-web'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/portal-web' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout do portal-web concluido com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
