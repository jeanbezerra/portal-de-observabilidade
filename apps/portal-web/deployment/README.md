# Execução e deployment de portal-web

Todos os caminhos deste guia partem da raiz deste componente. Scripts e YAMLs são locais ao projeto e acompanham seu futuro repositório Git.

## Escolha o ambiente

| Ambiente | Comando | Pré-requisitos |
| --- | --- | --- |
| Containers locais | `scripts/deploy/local.ps1` | Docker, Podman ou Rancher Desktop com Compose. |
| Cluster Kubernetes | `scripts/deploy/rollout.ps1` | kubectl, kubeconfig do cluster e imagem acessível no registro. |

Os YAMLs estão em `deployment/local/` e `deployment/kubernetes/`. Não há dependência de arquivos dos diretórios pais.

## 1. Containers locais

No Windows, abra PowerShell na raiz do projeto. No Linux ou macOS, use PowerShell 7 (`pwsh`) ou a CLI Compose. O Dockerfile compila a aplicação dentro do container e dispensa ferramentas de build instaladas no host.

Escolha uma destas opções:

```powershell
.\scripts\deploy\local.ps1 -Engine docker
.\scripts\deploy\local.ps1 -Engine podman
.\scripts\deploy\local.ps1 -Engine nerdctl
```

No Rancher Desktop, use `docker` com Moby/dockerd ou `nerdctl` com containerd. O Podman precisa estar iniciado e ter um provedor Compose instalado, como `podman-compose` ou Docker Compose.

Na primeira execução, o script cria `deployment/local/.env`. O arquivo é ignorado pelo Git. Edite as variáveis quando necessário e execute o comando novamente.

O Compose inicia somente o portal. Inicie o Scheduler separadamente para utilizar agendamentos.

A aplicação fica em **http://localhost:3000**. A primeira execução baixa imagens e dependências e pode levar alguns minutos.

```powershell
.\scripts\deploy\local.ps1 -Engine docker -Action status
.\scripts\deploy\local.ps1 -Engine docker -Action logs
.\scripts\deploy\local.ps1 -Engine docker -Action down
```

Substitua o engine pelo escolhido. `down` encerra os containers e mantém os volumes do banco. `-Action config` valida o Compose, `-SkipBuild` reutiliza imagens existentes e `-SkipTests` omite testes Java no build.

Também é possível usar a CLI diretamente, depois que o `.env` tiver sido criado:

```console
docker compose --project-name portal-web --env-file deployment/local/.env --file deployment/local/compose.yaml up --build -d
```

Troque `docker` por `podman` ou `nerdctl` conforme o runtime. Nos serviços Java, o usuário e senha do banco estão no `.env`. Essas variáveis inicializam volumes novos; alterar o `.env` não muda a senha de um banco já inicializado.

No portal, `SCHEDULER_PUBLIC_URL` no `.env` define a URL do Scheduler usada pelo navegador durante o build.

## 2. Cluster específico

### Selecionar o ambiente

O kubeconfig deve estar configurado e o namespace deve existir:

```powershell
kubectl config get-contexts
$clusterContext = 'meu-contexto-do-kubeconfig'
$namespace = 'observabilidade'
kubectl --context $clusterContext get namespace $namespace
```

Se o namespace não existir, solicite sua criação à equipe responsável ou crie-o quando tiver permissão. O script passa `--context` e `--namespace` em todas as chamadas e não troca o contexto atual do terminal.

### Construir e publicar

Entre no registro com o runtime escolhido, por exemplo `docker login registry.example.com`. Substitua registro, equipe e versão:

```powershell
$image = 'registry.example.com/equipe/portal-web:1.0.0'
.\scripts\deploy\rollout.ps1 -Context $clusterContext -Namespace $namespace -Image $image -BuildAndPush -Engine docker -SchedulerServiceUrl https://scheduler.example.com
```

O comando constrói a imagem, publica no registro, aplica somente os YAMLs deste componente e aguarda seu Deployment. Se o pipeline já publicou a imagem:

```powershell
.\scripts\deploy\rollout.ps1 -Context $clusterContext -Namespace $namespace -Image $image
```

A URL do Scheduler é incorporada ao JavaScript durante o build. Use `-SchedulerServiceUrl` com a URL HTTPS pública da API; o navegador não consegue acessar nomes internos como `scheduler-service:8081`. Alterar uma variável do container depois do build não troca essa URL.

Sem URL informada, o portal usa `/api/v1` na mesma origem; nesse caso, o gateway do ambiente precisa encaminhar essas rotas ao Scheduler. Com a API em outra origem, configure o CORS do Scheduler para aceitar a URL do portal.

Para registro privado, configure o Secret de pull no namespace e passe `-ImagePullSecret nome-do-secret`. Use tags diferentes a cada release ou um digest `@sha256:...`.

### Conferir os YAMLs

```powershell
# Renderiza o YAML final sem acessar o cluster.
.\scripts\deploy\rollout.ps1 -Context $clusterContext -Namespace $namespace -Image $image -RenderOnly

# Valida na API do cluster sem persistir recursos.
.\scripts\deploy\rollout.ps1 -Context $clusterContext -Namespace $namespace -Image $image -DryRun
```

Os templates em `kubernetes/` usam `__IMAGE__` e `__NAMESPACE__`, preenchidos pelo script. Para GitOps, salve a saída de `-RenderOnly` na configuração do ambiente. Esse modo e `-DryRun` não podem ser combinados com `-BuildAndPush`.

### Acessar a aplicação

O Service é interno. Para acesso temporário:

```powershell
kubectl --context $clusterContext --namespace $namespace port-forward service/portal-web 3000:3000
```

Para uma URL permanente, adapte `kubernetes/ingress.yaml.example` ao ingress controller, domínio e TLS da equipe e aplique-o no mesmo contexto e namespace. O exemplo não é aplicado automaticamente.

## Build no host

O comando abaixo valida somente este componente. Requer Node.js e NPM.

```powershell
.\scripts\build\build.ps1
```

## Referências

- [Inicialização de dependências no Compose](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose com Podman](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [Engines do Rancher Desktop](https://docs.rancherdesktop.io/ui/preferences/container-engine/general/)
- [kubectl](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/)
