<#
.SYNOPSIS
Reconstroi todas as imagens locais e executa o rollout do portal no Kubernetes WSL.

.DESCRIPTION
Compila e testa os quatro servicos Java e o portal, reconstroi as cinco imagens,
importa-as no containerd, prepara os bancos logicos, aplica o overlay, aguarda
todos os workloads e executa smoke tests de integracao a partir do portal-web.

.EXAMPLE
.\rollout-all.ps1

.EXAMPLE
.\rollout-all.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 600
#>
[CmdletBinding()]
param(
    [string]$WslDistribution = 'Ubuntu-26.04',
    [string]$Namespace = 'observabilidade-portal',
    [ValidateRange(30, 1800)]
    [int]$TimeoutSeconds = 600,
    [switch]$SkipBuild,
    [switch]$SkipImageBuild,
    [switch]$SkipSmokeTests,
    [switch]$CleanupLegacyResources
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

    if (-not $SkipBuild) {
        & (Join-Path $repositoryRoot 'build-all.ps1')
    }

    if (-not $SkipImageBuild) {
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/platform-service:local' -BuildContext "$wslRepositoryRoot/services/platform-service"
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/scheduler-service:local' -BuildContext "$wslRepositoryRoot/services/scheduler-service"
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/workflow-service:local' -BuildContext "$wslRepositoryRoot/services/workflow-service"
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/identity-access-service:local' -BuildContext "$wslRepositoryRoot/services/identity-access-service"
        Build-AndImportLocalImage -Distribution $WslDistribution -Image 'localhost/observabilidade-portal/portal-web:local' -BuildContext "$wslRepositoryRoot/apps/portal-web"
    }

    Apply-KubernetesManifest -Distribution $WslDistribution -ManifestPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal/postgres.yaml"
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'statefulset/scheduler-postgres' -TimeoutSeconds $TimeoutSeconds
    Ensure-PostgresDatabases -Distribution $WslDistribution -Namespace $Namespace -Databases @('platform', 'workflow', 'identity_access')

    Apply-KubernetesOverlay -Distribution $WslDistribution -OverlayPath "$wslRepositoryRoot/deploy/kubernetes/observabilidade-portal"

    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'platform-service'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'scheduler-service'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'workflow-service'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'identity-access-service'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'identity-redis'
    Restart-KubernetesDeployment -Distribution $WslDistribution -Namespace $Namespace -Deployment 'portal-web'

    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/platform-service' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/scheduler-service' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/workflow-service' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/identity-redis' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/identity-access-service' -TimeoutSeconds $TimeoutSeconds
    Wait-KubernetesRollout -Distribution $WslDistribution -Namespace $Namespace -Resource 'deployment/portal-web' -TimeoutSeconds $TimeoutSeconds

    if (-not $SkipSmokeTests) {
        Test-PortalIntegrations -Distribution $WslDistribution -Namespace $Namespace
    }

    if ($CleanupLegacyResources) {
        Remove-LegacyPortalResources -Distribution $WslDistribution -Namespace $Namespace
    }

    Show-PortalWorkloads -Distribution $WslDistribution -Namespace $Namespace

    Write-Host ""
    Write-Host "Rollout completo concluido com sucesso." -ForegroundColor Green
}
catch {
    Show-RolloutDiagnostics -Distribution $WslDistribution -Namespace $Namespace
    Write-Error $_
    exit 1
}
