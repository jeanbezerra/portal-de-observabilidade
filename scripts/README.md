# Atalhos do workspace

Cada componente mantém seus scripts em `scripts/` e seus YAMLs em `deployment/` dentro da própria pasta. Os scripts dos componentes funcionam sem este diretório da raiz, preparando a separação em repositórios.

## Build de todos os componentes

Este atalho opcional chama `scripts/build/build.ps1` de cada projeto:

```powershell
.\scripts\build\build-all.ps1
.\scripts\build\build-all.ps1 -SkipTests
```

Requer as ferramentas de desenvolvimento instaladas no host: Node.js/NPM, JDK 25 para Platform, Scheduler e Identity Access, e JDK 21 para Workflow. Use `WORKFLOW_JAVA_HOME` para selecionar JDK 21 ao usar o atalho. Para a execução com containers, os Dockerfiles já escolhem o JDK de cada componente.

## Comandos por componente

Execute dentro da raiz do projeto escolhido:

```powershell
# Build no host.
.\scripts\build\build.ps1

# Compose local: docker, podman ou nerdctl.
.\scripts\deploy\local.ps1 -Engine docker

# Kubernetes com contexto explícito.
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.example.com/equipe/componente:1.0.0
```

Os parâmetros e pré-requisitos estão nos guias de [Platform](../services/platform-service/deployment/README.md), [Scheduler](../services/scheduler-service/deployment/README.md), [Workflow](../services/workflow-service/deployment/README.md), [Identity Access](../services/identity-access-service/deployment/README.md) e [Portal web](../apps/portal-web/deployment/README.md).
