<#
.SYNOPSIS
Compila e testa todos os componentes implantaveis do produto.

.DESCRIPTION
Executa Maven verify nos quatro servicos Java e npm ci, typecheck e build no
portal React Router SSR. Cada servico Java deve gerar target/app.jar.

.EXAMPLE
.\build-all.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repositoryRoot = $PSScriptRoot
$commonScript = Join-Path $repositoryRoot 'deploy\kubernetes\observabilidade-portal\rollout-common.ps1'
. $commonScript

Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'platform-service'
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'scheduler-service'
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'workflow-service'
Build-JavaServiceArtifact -RepositoryRoot $repositoryRoot -ServiceName 'identity-access-service'
Build-PortalWebArtifact -RepositoryRoot $repositoryRoot

Write-Host ""
Write-Host "Build completo concluido com sucesso." -ForegroundColor Green
