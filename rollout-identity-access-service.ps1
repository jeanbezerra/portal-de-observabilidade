<#
.SYNOPSIS
Reconstroi o identity-access-service e executa seu rollout local no Kubernetes WSL.
#>
[CmdletBinding()]
param(
    [string]$WslDistribution = 'Ubuntu-26.04',
    [string]$Namespace = 'observabilidade-portal',
    [ValidateRange(30, 1800)]
    [int]$TimeoutSeconds = 300,
    [switch]$SkipBuild,
    [switch]$SkipImageBuild
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = $PSScriptRoot
. (Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1')

try {
    Assert-RolloutPrerequisites -Distribution $WslDistribution
    $wslRepositoryRoot = Get-WslRepositoryPath -Distribution $WslDistribution -RepositoryRoot $repositoryRoot
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/namespace.yaml"
    Assert-PortalDatabaseSecret -Distribution $WslDistribution -Namespace $Namespace

    if (-not $SkipBuild) {
        Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'identity-access-service'
    }
    if (-not $SkipImageBuild) {
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/identity-access-service:local' -BuildContext "$wslRepositoryRoot/services/identity-access-service"
    }

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/postgres.yaml"
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'statefulset/scheduler-postgres' -TimeoutSeconds $TimeoutSeconds
    Ensure-PostgresDatabases -Distribution $WslDistribution -Namespace $Namespace -Databases @('identity_access')
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/identity-redis.yaml"
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/identity-access-service.yaml"
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'identity-redis'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'identity-access-service'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/identity-redis' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/identity-access-service' -TimeoutSeconds $TimeoutSeconds
    Test-PortalIntegrations -Distribution $WslDistribution -Namespace $Namespace
    Write-Host "Rollout do identity-access-service concluido com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
