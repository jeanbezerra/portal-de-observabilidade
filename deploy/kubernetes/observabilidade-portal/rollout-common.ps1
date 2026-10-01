Set-StrictMode -Version Latest

function Write-RolloutStep {
    param(
        [Parameter(Mandatory)]
        [string]$Message
    )

    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-WslCommand {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & wsl.exe -d $Distribution -u root -- @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "O comando no WSL falhou com codigo $($LASTEXITCODE): $($Arguments -join ' ')"
    }
}

function Get-WslCommandOutput {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $output = & wsl.exe -d $Distribution -u root -- @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "O comando no WSL falhou com codigo $($LASTEXITCODE): $($Arguments -join ' ')"
    }

    return (($output | Out-String).Trim())
}

function Get-WslRepositoryPath {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$RepositoryRoot
    )

    $normalizedPath = [System.IO.Path]::GetFullPath($RepositoryRoot).Replace('\', '/')
    return Get-WslCommandOutput -Distribution $Distribution -Arguments @(
        'wslpath',
        '-a',
        $normalizedPath
    )
}

function Assert-RolloutPrerequisites {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
        throw 'O wsl.exe nao esta disponivel. Instale ou habilite o WSL antes do rollout.'
    }

    Write-RolloutStep "Validando WSL, ferramentas e cluster"
    Invoke-WslCommand -Distribution $Distribution -Arguments @('buildah', '--version')
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'ctr',
        '--namespace',
        'k8s.io',
        'version'
    )
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'wait',
        '--for=condition=Ready',
        'node',
        '--all',
        '--timeout=30s'
    )
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'get',
        'namespace',
        $Namespace
    )
}

function Assert-SchedulerDatabaseSecret {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-RolloutStep "Validando a credencial do Scheduler"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'get',
        'secret',
        'scheduler-database',
        '--namespace',
        $Namespace
    )
}

function Build-AndImportLocalImage {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Image,

        [Parameter(Mandatory)]
        [string]$BuildContext
    )

    Write-RolloutStep "Construindo $Image"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'buildah',
        'bud',
        '--tag',
        $Image,
        $BuildContext
    )

    $archive = Get-WslCommandOutput -Distribution $Distribution -Arguments @(
        'mktemp',
        '/tmp/observabilidade-rollout.XXXXXX.tar'
    )

    try {
        Write-RolloutStep "Importando $Image no containerd do Kubernetes"
        Invoke-WslCommand -Distribution $Distribution -Arguments @(
            'buildah',
            'push',
            $Image,
            "docker-archive:$($archive):$Image"
        )
        Invoke-WslCommand -Distribution $Distribution -Arguments @(
            'ctr',
            '--namespace',
            'k8s.io',
            'images',
            'import',
            $archive
        )
        Invoke-WslCommand -Distribution $Distribution -Arguments @(
            'ctr',
            '--namespace',
            'k8s.io',
            'images',
            'inspect',
            $Image
        )
    }
    finally {
        & wsl.exe -d $Distribution -u root -- rm -f -- $archive
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Nao foi possivel remover o arquivo temporario $archive."
        }
    }
}

function Build-SchedulerApiArtifact {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryRoot
    )

    $schedulerDirectory = Join-Path $RepositoryRoot 'obs-api\scheduler-api'
    $mavenWrapper = Join-Path $schedulerDirectory 'mvnw.cmd'
    if (-not (Test-Path -LiteralPath $mavenWrapper)) {
        throw "Maven Wrapper nao encontrado em $mavenWrapper."
    }

    Write-RolloutStep "Compilando e testando scheduler-api"
    Push-Location $schedulerDirectory
    try {
        & $mavenWrapper -q verify
        if ($LASTEXITCODE -ne 0) {
            throw "O build do scheduler-api falhou com codigo $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Apply-KubernetesManifest {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$ManifestPath
    )

    Write-RolloutStep "Aplicando manifesto Kubernetes"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'apply',
        '--filename',
        $ManifestPath
    )
}

function Apply-KubernetesOverlay {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$OverlayPath
    )

    Write-RolloutStep "Aplicando overlay Kubernetes"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'apply',
        '--kustomize',
        $OverlayPath
    )
}

function Restart-KubernetesDeployment {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace,

        [Parameter(Mandatory)]
        [string]$Deployment
    )

    Write-RolloutStep "Reiniciando deployment/$Deployment"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'rollout',
        'restart',
        "deployment/$Deployment",
        '--namespace',
        $Namespace
    )
}

function Wait-KubernetesRollout {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace,

        [Parameter(Mandatory)]
        [string]$Resource,

        [Parameter(Mandatory)]
        [int]$TimeoutSeconds
    )

    Write-RolloutStep "Aguardando $Resource"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'rollout',
        'status',
        $Resource,
        '--namespace',
        $Namespace,
        "--timeout=$($TimeoutSeconds)s"
    )
}

function Show-PortalWorkloads {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-RolloutStep "Estado final dos workloads"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'get',
        'deployment,statefulset,pod',
        '--namespace',
        $Namespace,
        '--output',
        'wide'
    )
}
