<#
.SYNOPSIS
Compila e testa somente este servico usando seu Maven Wrapper.
#>
[CmdletBinding()]
param([switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$componentRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$wrapperName = 'mvnw'
if ($env:OS -eq 'Windows_NT') { $wrapperName = 'mvnw.cmd' }
$mavenArguments = @('--batch-mode', 'clean', 'verify')
if ($SkipTests) { $mavenArguments = @('--batch-mode', 'clean', 'package', '-Dmaven.test.skip=true') }
Push-Location $componentRoot
try {
    if ($env:OS -eq 'Windows_NT') { & (Join-Path $componentRoot $wrapperName) @mavenArguments }
    else { & sh (Join-Path $componentRoot $wrapperName) @mavenArguments }
    if ($LASTEXITCODE -ne 0) { throw 'O build Maven falhou.' }
    if (-not (Test-Path -LiteralPath (Join-Path $componentRoot 'target/app.jar'))) { throw 'O build nao gerou target/app.jar.' }
}
finally { Pop-Location }
