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
        [string]$Distribution
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
}

function Assert-PortalDatabaseSecret {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-RolloutStep "Validando a credencial do PostgreSQL local"
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

function Build-JavaServiceArtifact {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryRoot,

        [Parameter(Mandatory)]
        [ValidateSet('platform-service', 'scheduler-service', 'workflow-service', 'identity-access-service')]
        [string]$ServiceName,

        [switch]$SkipTests
    )

    $serviceDirectory = Join-Path $RepositoryRoot "services\$ServiceName"
    $mavenWrapper = Join-Path $serviceDirectory 'mvnw.cmd'
    if (-not (Test-Path -LiteralPath $mavenWrapper)) {
        throw "Maven Wrapper nao encontrado em $mavenWrapper."
    }

    $mavenArguments = @('-q', 'clean', 'verify')
    if ($SkipTests) {
        $mavenArguments = @('-q', 'clean', 'package', '-Dmaven.test.skip=true')
        Write-RolloutStep "Compilando $ServiceName sem executar ou compilar testes"
    }
    else {
        Write-RolloutStep "Compilando e testando $ServiceName"
    }

    Push-Location $serviceDirectory
    try {
        & $mavenWrapper @mavenArguments
        if ($LASTEXITCODE -ne 0) {
            throw "O build do $ServiceName falhou com codigo $LASTEXITCODE."
        }

        $artifact = Join-Path $serviceDirectory 'target\app.jar'
        if (-not (Test-Path -LiteralPath $artifact)) {
            throw "O build do $ServiceName nao gerou target\app.jar."
        }
    }
    finally {
        Pop-Location
    }
}

function Build-PortalWebArtifact {
    param(
        [Parameter(Mandatory)]
        [string]$RepositoryRoot
    )

    $portalDirectory = Join-Path $RepositoryRoot 'apps\portal-web'
    if (-not (Test-Path -LiteralPath (Join-Path $portalDirectory 'package-lock.json'))) {
        throw "package-lock.json nao encontrado em $portalDirectory."
    }

    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw 'npm.cmd nao esta disponivel no PATH.'
    }

    Write-RolloutStep "Instalando e validando portal-web"
    Push-Location $portalDirectory
    try {
        & $npm.Source ci
        if ($LASTEXITCODE -ne 0) {
            throw "A instalacao do portal-web falhou com codigo $LASTEXITCODE."
        }

        & $npm.Source run typecheck
        if ($LASTEXITCODE -ne 0) {
            throw "O typecheck do portal-web falhou com codigo $LASTEXITCODE."
        }

        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) {
            throw "O build do portal-web falhou com codigo $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Ensure-PostgresDatabases {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace,

        [Parameter(Mandatory)]
        [ValidatePattern('^[a-z_][a-z0-9_]*$')]
        [string[]]$Databases
    )

    Write-RolloutStep "Garantindo bancos logicos: $($Databases -join ', ')"
    $databaseUser = Get-WslCommandOutput -Distribution $Distribution -Arguments @(
        'kubectl',
        'exec',
        'statefulset/scheduler-postgres',
        '--namespace',
        $Namespace,
        '--container',
        'postgres',
        '--',
        'printenv',
        'POSTGRES_USER'
    )

    $maintenanceDatabase = Get-WslCommandOutput -Distribution $Distribution -Arguments @(
        'kubectl',
        'exec',
        'statefulset/scheduler-postgres',
        '--namespace',
        $Namespace,
        '--container',
        'postgres',
        '--',
        'printenv',
        'POSTGRES_DB'
    )

    $databaseOutput = Get-WslCommandOutput -Distribution $Distribution -Arguments @(
        'kubectl',
        'exec',
        'statefulset/scheduler-postgres',
        '--namespace',
        $Namespace,
        '--container',
        'postgres',
        '--',
        'psql',
        '-X',
        "--username=$databaseUser",
        "--dbname=$maintenanceDatabase",
        '--set=ON_ERROR_STOP=1',
        '--tuples-only',
        '--no-align',
        '--command=SELECT datname FROM pg_database'
    )
    $existingDatabases = @(
        $databaseOutput -split '\r?\n' |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ }
    )

    foreach ($database in $Databases) {
        if ($existingDatabases -contains $database) {
            Write-Host "database/$database unchanged"
            continue
        }

        Invoke-WslCommand -Distribution $Distribution -Arguments @(
            'kubectl',
            'exec',
            'statefulset/scheduler-postgres',
            '--namespace',
            $Namespace,
            '--container',
            'postgres',
            '--',
            'createdb',
            "--username=$databaseUser",
            "--maintenance-db=$maintenanceDatabase",
            $database
        )
        $existingDatabases += $database
        Write-Host "database/$database created"
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
        'deployment,statefulset,pod,service',
        '--namespace',
        $Namespace,
        '--output',
        'wide'
    )
}

function Test-PortalIntegrations {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-RolloutStep "Testando integracoes HTTP e DNS entre os componentes"
    $smokeTest = @'
const targets = [
  ['portal-web', 'http://127.0.0.1:3000/'],
  ['scheduler-service', 'http://scheduler-service:8081/api/v1/scheduler'],
  ['platform-service', 'http://platform-service:8080/actuator/health/readiness'],
  ['platform-openapi', 'http://platform-service:8080/api-docs'],
  ['workflow-service', 'http://workflow-service:8082/actuator/health/readiness'],
  ['workflow-schema', 'http://workflow-service:8082/approvalRequests/schema'],
  ['identity-access-service', 'http://identity-access-service:8083/actuator/health/readiness'],
  ['identity-provider-discovery', 'http://identity-access-service:8083/api/v1/auth/providers'],
];

(async () => {
  let failed = false;
  for (const [name, url] of targets) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(name + ': HTTP ' + response.status);
      failed ||= !response.ok;
    } catch (error) {
      failed = true;
      console.error(name + ': ' + error.message);
    }
  }
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
'@

    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'exec',
        'deployment/portal-web',
        '--namespace',
        $Namespace,
        '--',
        'node',
        '--input-type=commonjs',
        '--eval',
        $smokeTest
    )
}

function Remove-LegacyPortalResources {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-RolloutStep "Removendo workloads legados substituidos"
    Invoke-WslCommand -Distribution $Distribution -Arguments @(
        'kubectl',
        'delete',
        'deployment/obs-web',
        'service/obs-web',
        'deployment/scheduler-api',
        'service/scheduler-api',
        '--namespace',
        $Namespace,
        '--ignore-not-found=true'
    )
}

function Show-RolloutDiagnostics {
    param(
        [Parameter(Mandatory)]
        [string]$Distribution,

        [Parameter(Mandatory)]
        [string]$Namespace
    )

    Write-Warning "O rollout falhou. Coletando estado e eventos recentes do namespace $Namespace."
    & wsl.exe -d $Distribution -u root -- kubectl get deployment,statefulset,pod,service --namespace $Namespace --output wide
    & wsl.exe -d $Distribution -u root -- kubectl get events --namespace $Namespace --sort-by=.lastTimestamp
}
