<#
.SYNOPSIS
Compila e testa todos os componentes implantaveis do produto.

.DESCRIPTION
Executa Maven verify nos quatro servicos Java e npm ci, typecheck e build no
portal React Router SSR. Com -SkipTests, empacota os servicos sem compilar nem
executar testes. Cada servico Java deve gerar target/app.jar.

.EXAMPLE
.\build-all.ps1

.EXAMPLE
.\build-all.ps1 -SkipTests
#>
[CmdletBinding()]
param(
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$commonScript = Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1'
. $commonScript

Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'platform-service' -SkipTests:$SkipTests
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'scheduler-service' -SkipTests:$SkipTests
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'workflow-service' -SkipTests:$SkipTests
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'identity-access-service' -SkipTests:$SkipTests
Build-PortalWebArtifact -RepositoryRoot $repositoryRoot

Write-Host ""
Write-Host "Build completo concluido com sucesso." -ForegroundColor Green
