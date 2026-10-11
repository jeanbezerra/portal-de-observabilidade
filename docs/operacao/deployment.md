# Execução local e deployment por componente

Cada componente é uma unidade independente: possui Dockerfile, scripts, YAMLs, configurações de exemplo e documentação próprios. Não existe deployment obrigatório da solução inteira. A pasta raiz apenas reúne os projetos enquanto cada um não ganha seu repositório Git.

## Convenção

```text
<componente>/
├── Dockerfile
├── README.md
├── deployment/
│   ├── README.md
│   ├── local/compose.yaml
│   └── kubernetes/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── configmap.yaml
│       └── ingress.yaml.example
└── scripts/
    ├── build/build.ps1
    └── deploy/
        ├── local.ps1
        └── rollout.ps1
```

## Caminho 1: containers locais

1. Inicie Docker Desktop, Podman ou Rancher Desktop.
2. Abra o PowerShell na pasta do componente.
3. Execute `./scripts/deploy/local.ps1 -Engine docker`, `-Engine podman` ou `-Engine nerdctl`.
4. Acompanhe com `-Action status` e `-Action logs`; encerre com `-Action down`.

No Rancher Desktop, `docker` corresponde ao engine Moby/dockerd e `nerdctl` ao containerd. O Podman utiliza um provedor Compose instalado. Consulte as documentações de [Rancher Desktop](https://docs.rancherdesktop.io/ui/preferences/container-engine/general/) e [Podman Compose](https://docs.podman.io/en/latest/markdown/podman-compose.1.html).

O script cria `.env` a partir do exemplo e gera uma senha para o banco local. O Compose compila a aplicação dentro do container, inicia as dependências e publica as portas apenas em `127.0.0.1`.

| Componente | Aplicação | PostgreSQL local | Guia |
| --- | --- | --- | --- |
| Platform | `http://localhost:8080` | `localhost:54320` | [Platform](../../services/platform-service/deployment/README.md) |
| Scheduler | `http://localhost:8081` | `localhost:54321` | [Scheduler](../../services/scheduler-service/deployment/README.md) |
| Workflow | `http://localhost:8082` | `localhost:54322` | [Workflow](../../services/workflow-service/deployment/README.md) |
| Identity Access | `http://localhost:8083` | `localhost:54323` | [Identity Access](../../services/identity-access-service/deployment/README.md) |
| Portal web | `http://localhost:3000` | — | [Portal](../../apps/portal-web/deployment/README.md) |

Cada serviço Java possui banco e volume exclusivos; Identity Access também possui Redis local. Para demonstrar a gestão de agendamentos, inicie o Scheduler e depois o portal. Os demais serviços podem ser iniciados conforme a funcionalidade demonstrada.

No local, a URL do Scheduler usada pelo navegador é `SCHEDULER_PUBLIC_URL` no `.env` do portal. Ela é incorporada durante o build. CORS do Scheduler deve aceitar a origem do portal.

Chamadas HTTP feitas por rotinas são executadas dentro do container do Scheduler: `localhost` nesse contexto aponta para o próprio container. Configure uma URL alcançável a partir dele e inclua o host em `HTTP_EXECUTOR_ALLOWED_HOSTS`; a URL que funciona no navegador pode não funcionar dentro do container.

## Caminho 2: cluster Kubernetes específico

1. Configure o kubeconfig e identifique o contexto com `kubectl config get-contexts`.
2. Escolha um namespace existente, prepare as conexões de banco/Redis e carregue o Secret de cada serviço conforme seu guia.
3. Ajuste `deployment/kubernetes/configmap.yaml` para o ambiente.
4. Informe a imagem do registro e execute o rollout do componente:

```powershell
.\scripts\deploy\rollout.ps1 -Context meu-contexto -Namespace observabilidade -Image registry.example.com/equipe/scheduler-service:1.0.0
```

Use `-BuildAndPush -Engine docker` para construir e publicar antes de aplicar os YAMLs, ou deixe o pipeline publicar e informe a imagem resultante. Use `-ImagePullSecret` quando o registro exigir autenticação do cluster.

`-RenderOnly` gera o YAML final sem acessar o cluster; `-DryRun` valida na API sem persistir. Contexto, namespace e imagem são obrigatórios, e nenhuma chamada depende do contexto atual do terminal. Os manifestos usam ConfigMaps para configuração e Secrets para credenciais.

Os Services são internos. Use `kubectl --context ... --namespace ... port-forward` para acesso temporário ou adapte o exemplo de Ingress ao domínio, controller e TLS da equipe. No portal, `-SchedulerServiceUrl` informa a URL pública da API durante o build da imagem. O navegador não acessa DNS interno do Kubernetes.

## Separação futura dos repositórios

Copie a pasta completa de cada componente, incluindo arquivos ocultos, `deployment/`, `scripts/` e documentação. Os scripts calculam apenas a raiz do próprio projeto; não referenciam `apps/`, `services/`, bibliotecas externas ou manifestos de projetos vizinhos.

Os antigos scripts específicos do WSL e a pasta global `deploy/` foram removidos do projeto. Isso não remove workloads, volumes nem dados existentes no cluster WSL. Os bancos Compose são novos; para reutilizar dados antigos, faça exportação e restauração planejadas. Esta alteração não migra dados automaticamente.
