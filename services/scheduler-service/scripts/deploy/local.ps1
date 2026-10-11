<#
.SYNOPSIS
Executa este componente e suas dependencias locais com Compose.
.EXAMPLE
.\scripts\deploy\local.ps1 -Engine docker
.EXAMPLE
.\scripts\deploy\local.ps1 -Engine podman -Action down
#>
[CmdletBinding()]
param(
    [ValidateSet('docker', 'podman', 'nerdctl')]
    [string]$Engine = 'docker',
    [ValidateSet('up', 'down', 'logs', 'status', 'config')]
    [string]$Action = 'up',
    [switch]$SkipTests,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$componentRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$composeFile = Join-Path $componentRoot 'deployment/local/compose.yaml'
$envFile = Join-Path $componentRoot 'deployment/local/.env'
if (-not (Get-Command $Engine -ErrorAction SilentlyContinue)) {
    throw "Instale $Engine e habilite seu comando compose antes de continuar."
}
if (-not (Test-Path -LiteralPath $envFile)) {
    $example = [IO.File]::ReadAllText((Join-Path $componentRoot 'deployment/local/.env.example'))
    $example = $example.Replace('__GENERATE_PASSWORD__', [guid]::NewGuid().ToString('N'))
    [IO.File]::WriteAllText($envFile, $example, (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Configuracao local criada em deployment/local/.env.'
}
$composeArguments = @('compose', '--project-name', 'scheduler-service', '--env-file', $envFile, '--file', $composeFile)
$previousSkipTests = [Environment]::GetEnvironmentVariable('SKIP_TESTS', 'Process')
try {
    if ($SkipTests) { $env:SKIP_TESTS = 'true' }
    switch ($Action) {
        'up' {
            if ($SkipBuild) { $composeArguments += @('up', '--detach', '--no-build') }
            else { $composeArguments += @('up', '--detach', '--build') }
        }
        'down' { $composeArguments += @('down') }
        'logs' { $composeArguments += @('logs', '--tail', '100', '--follow') }
        'status' { $composeArguments += @('ps') }
        'config' { $composeArguments += @('config', '--quiet') }
    }
    & $Engine @composeArguments
    if ($LASTEXITCODE -ne 0) { throw "Compose falhou com codigo $LASTEXITCODE." }
}
finally {
    [Environment]::SetEnvironmentVariable('SKIP_TESTS', $previousSkipTests, 'Process')
}
