<#
.SYNOPSIS
Reconstroi todas as imagens locais e executa o rollout do portal no Kubernetes WSL.

.DESCRIPTION
Compila e testa o scheduler-api, reconstroi as imagens scheduler-api e obs-web,
importa ambas no containerd, aplica o overlay e reinicia os dois deployments.
O PostgreSQL so sera atualizado se o manifesto aplicado exigir uma mudanca.

.EXAMPLE
.\rollout-all.ps1

.EXAMPLE
.\rollout-all.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 300
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

    Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/scheduler-api:local' -BuildContext "$wslRepositoryRoot/obs-api/scheduler-api"
    Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/obs-web:local' -BuildContext "$wslRepositoryRoot/obs-web"

    Apply-KubernetesOverlay -Distribution $WslDistribution -OverlayPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'scheduler-api'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'obs-web'

    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'statefulset/scheduler-postgres' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/scheduler-api' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/obs-web' -TimeoutSeconds $TimeoutSeconds
    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout completo concluido com sucesso." -ForegroundColor Green
}
catch {
    Write-Error $_
    exit 1
}
