<#
.SYNOPSIS
Publica somente este componente no contexto Kubernetes informado.
.EXAMPLE
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.exemplo.com/identity-access-service:1.0.0
.EXAMPLE
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.exemplo.com/identity-access-service:1.0.0 -RenderOnly
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Context,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]([-a-z0-9]*[a-z0-9])?$')]
    [ValidateLength(1, 63)]
    [string]$Namespace,
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9./:_@-]+$')]
    [string]$Image,
    [ValidateSet('docker', 'podman', 'nerdctl')]
    [string]$Engine = 'docker',
    [ValidatePattern('^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$')]
    [string]$ImagePullSecret,
    [ValidateRange(30, 1800)]
    [int]$TimeoutSeconds = 600,
    [switch]$BuildAndPush,
    [switch]$SkipTests,
    [switch]$DryRun,
    [switch]$RenderOnly
)
$ErrorActionPreference = 'Stop'
$componentRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if ($Image -notmatch '/.+(:[a-zA-Z0-9_][a-zA-Z0-9_.-]*|@sha256:[a-fA-F0-9]{64})$') {
    throw 'Informe uma imagem com registro e tag versionada ou digest, por exemplo registry.exemplo.com/equipe/identity-access-service:1.0.0.'
}
if (($RenderOnly -or $DryRun) -and $BuildAndPush) {
    throw 'RenderOnly e DryRun nao podem ser combinados com BuildAndPush.'
}
$manifestFiles = @('configmap.yaml', 'service.yaml', 'hpa.yaml', 'deployment.yaml')
$manifest = ($manifestFiles | ForEach-Object {
    [IO.File]::ReadAllText((Join-Path $componentRoot "deployment/kubernetes/$_")).Trim()
}) -join "`n---`n"
$manifest = $manifest.Replace('__IMAGE__', $Image).Replace('__NAMESPACE__', $Namespace)
if ($ImagePullSecret) {
    $manifest = $manifest.Replace('imagePullSecrets: []', "imagePullSecrets:`n      - name: $ImagePullSecret")
}
if ($RenderOnly) { Write-Output $manifest; return }
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) { throw 'Instale kubectl e configure seu kubeconfig.' }
function Invoke-ComponentKubectl {
    param([string[]]$Arguments)
    & kubectl --context $Context --namespace $Namespace @Arguments
    if ($LASTEXITCODE -ne 0) { throw "kubectl falhou com codigo $LASTEXITCODE no contexto $Context." }
}
# Toda chamada usa o contexto explicito; o contexto atual do desenvolvedor nao e alterado.
Invoke-ComponentKubectl -Arguments @('get', 'namespace', $Namespace, '--output=name')
Invoke-ComponentKubectl -Arguments @('get', 'secret', 'identity-access-service-runtime', '--output=name')
if ($ImagePullSecret) { Invoke-ComponentKubectl -Arguments @('get', 'secret', $ImagePullSecret, '--output=name') }
if ($BuildAndPush) {
    if (-not (Get-Command $Engine -ErrorAction SilentlyContinue)) { throw "Instale $Engine para construir e publicar a imagem." }
    $buildArguments = @('build', '--tag', $Image, '--build-arg', "SKIP_TESTS=$($SkipTests.IsPresent.ToString().ToLowerInvariant())", $componentRoot)
    & $Engine @buildArguments
    if ($LASTEXITCODE -ne 0) { throw 'A construcao da imagem falhou.' }
    & $Engine push $Image
    if ($LASTEXITCODE -ne 0) { throw 'A publicacao da imagem no registro falhou.' }
}
$applyArguments = @('--context', $Context, '--namespace', $Namespace, 'apply', '--filename', '-')
if ($DryRun) { $applyArguments += '--dry-run=server' }
$manifest | & kubectl @applyArguments
if ($LASTEXITCODE -ne 0) { throw 'A aplicacao dos manifestos falhou.' }
if (-not $DryRun) {
    Invoke-ComponentKubectl -Arguments @('rollout', 'status', 'deployment/identity-access-service', "--timeout=$($TimeoutSeconds)s")
}
