<#
.SYNOPSIS
Reconstroi a imagem local do scheduler-api e executa seu rollout no Kubernetes WSL.

.DESCRIPTION
Compila e testa o scheduler-api, reconstroi e importa sua imagem no containerd,
aplica o manifesto Kubernetes e reinicia o deployment.

.EXAMPLE
.\rollout-scheduler-api.ps1

.EXAMPLE
.\rollout-scheduler-api.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 300
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
    Assert-RolloutPrerequisites -Distribution $WslDistribution -Namespace $Namespace
    Assert-SchedulerDatabaseSecret -Distribution $WslDistribution -Namespace $Namespace
    $wslRepositoryRoot = Get-WslRepositoryPath -Distribution $WslDistribution -RepositoryRoot $repositoryRoot

    Build-SchedulerApiArtifact -RepositoryRoot $repositoryRoot

    $image = 'localhost/observabilidade-portal/scheduler-api:local'
    Build-AndImportLocalImage -Distribution $WslDistribution -Image $image -BuildContext "$wslRepositoryRoot/obs-api/scheduler-api"

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/scheduler-api.yaml"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'scheduler-api'
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/scheduler-api' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout do scheduler-api concluido com sucesso." -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
