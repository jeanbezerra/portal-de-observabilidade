<#
.SYNOPSIS
Reconstroi a imagem local do platform-service e executa seu rollout.
#>
[CmdletBinding()]
param(
    [string]$WslDistribution = 'Ubuntu-26.04',
    [string]$Namespace = 'observabilidade-portal',
    [ValidateRange(30, 1800)]
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = $PSScriptRoot
$commonScript = Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1'
. $commonScript

try {
    Assert-RolloutPrerequisites -Distribution $WslDistribution
    $wslRepositoryRoot = Get-WslRepositoryPath -Distribution $WslDistribution -RepositoryRoot $repositoryRoot
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/namespace.yaml"
    Assert-PortalDatabaseSecret -Distribution $WslDistribution -Namespace $Namespace

    Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'platform-service'
    Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/platform-service:local' -BuildContext "$wslRepositoryRoot/services/platform-service"

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/postgres.yaml"
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'statefulset/scheduler-postgres' -TimeoutSeconds $TimeoutSeconds
    Ensure-PostgresDatabases -Distribution $WslDistribution -Namespace $Namespace -Databases @('platform')
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/platform-service.yaml"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'platform-service'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/platform-service' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout do platform-service concluido com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
