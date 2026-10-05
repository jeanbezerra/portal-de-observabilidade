<#
.SYNOPSIS
Reconstroi a imagem local do scheduler-service e executa seu rollout no Kubernetes WSL.

.DESCRIPTION
Compila e testa o scheduler-service, reconstroi e importa sua imagem no containerd,
aplica o manifesto Kubernetes e reinicia o deployment.

.EXAMPLE
.\rollout-scheduler-service.ps1

.EXAMPLE
.\rollout-scheduler-service.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 300
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

    Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'scheduler-service'

    $image = 'localhost/observabilidade-portal/scheduler-service:local'
    Build-AndImportLocalImage -Distribution $WslDistribution -Image $image -BuildContext "$wslRepositoryRoot/services/scheduler-service"

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/postgres.yaml"
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'statefulset/scheduler-postgres' -TimeoutSeconds $TimeoutSeconds
    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/scheduler-service.yaml"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'scheduler-service'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/scheduler-service' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout do scheduler-service concluido com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
