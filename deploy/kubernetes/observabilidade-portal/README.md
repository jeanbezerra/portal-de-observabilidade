# Deployment local no Kubernetes WSL

Este overlay publica a solução no namespace `observabilidade-portal` usando o Gateway
`gateway-system/wsl-gateway` existente no cluster.

## Scripts automatizados

Execute na raiz do repositório:

```powershell
# Compila e testa todos os componentes sem fazer deploy.
.\build-all.ps1

# Recompila e publica apenas um componente.
.\rollout-platform-service.ps1
.\rollout-scheduler-service.ps1
.\rollout-workflow-service.ps1
.\rollout-identity-access-service.ps1
.\rollout-portal-web.ps1

# Constrói, publica, aguarda e testa a solução completa.
.\rollout-all.ps1

# Repete os smoke tests sem reconstruir imagens.
.\test-integrations.ps1
```

Os scripts usam por padrão a distribuição WSL `Ubuntu-26.04`, o namespace
`observabilidade-portal` e imagens locais. Os valores podem ser alterados por parâmetro:

```powershell
.\rollout-all.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 600
```

O rollout completo valida quatro serviços Java e o portal, gera e importa cinco imagens,
prepara os bancos lógicos `platform`, `workflow` e `identity_access`, aplica o overlay,
reinicia os deployments e executa smoke tests HTTP internos. Use `-SkipBuild`,
`-SkipImageBuild` ou `-SkipSmokeTests` somente quando os artefatos correspondentes já
tiverem sido validados ou importados.

## Imagens locais

Os workloads usam `imagePullPolicy: Never` e as tags:

- `localhost/observabilidade-portal/portal-web:local`
- `localhost/observabilidade-portal/platform-service:local`
- `localhost/observabilidade-portal/scheduler-service:local`
- `localhost/observabilidade-portal/workflow-service:local`
- `localhost/observabilidade-portal/identity-access-service:local`

Os scripts `rollout-*.ps1` constroem com Buildah, exportam cada imagem para um arquivo
temporário, importam no containerd do Kubernetes e removem o arquivo automaticamente.

## Credencial e bancos locais

O Secret do PostgreSQL não é versionado. Crie-o antes do primeiro deploy:

```shell
kubectl apply -f deploy/kubernetes/observabilidade-portal/namespace.yaml
kubectl create secret generic scheduler-database \
  --namespace observabilidade-portal \
  --from-literal=username=scheduler \
  --from-literal=password='<senha-local-forte>'
```

O ambiente local usa uma instância PostgreSQL com os bancos `scheduler`, `platform`,
`workflow` e `identity_access`. Ambientes superiores devem usar credenciais e políticas
de acesso independentes por serviço.

O `identity-access-service` usa o Deployment `identity-redis` para sessão e cache
reconstruível. O Redis não é fonte de verdade e, por isso, usa `emptyDir` neste ambiente.
Uma NetworkPolicy permite acesso ao Redis somente pelos pods do serviço de identidade.

Credenciais e certificados dos providers são injetados opcionalmente pelo Secret
`identity-access-secrets`; as chaves devem seguir os nomes `OBS_SECRET_*` documentados no README do serviço.

## Aplicação e acompanhamento

```shell
kubectl apply -k deploy/kubernetes/observabilidade-portal
kubectl rollout status statefulset/scheduler-postgres -n observabilidade-portal
kubectl rollout status deployment/identity-redis -n observabilidade-portal
kubectl rollout status deployment/identity-access-service -n observabilidade-portal
kubectl rollout status deployment/platform-service -n observabilidade-portal
kubectl rollout status deployment/scheduler-service -n observabilidade-portal
kubectl rollout status deployment/workflow-service -n observabilidade-portal
kubectl rollout status deployment/portal-web -n observabilidade-portal
```

O serviço de identidade possui HPA com mínimo de 1 e máximo de 3 réplicas, baseado em
70% de utilização de CPU. O cluster precisa ter Metrics Server para realizar o scaling;
sem métricas, o Deployment continua operando com o mínimo configurado.

## Rotas e testes

```powershell
.\test-integrations.ps1
```

O smoke test valida DNS e HTTP internos entre Portal, Scheduler, Platform, Workflow e
Identity Access. Também testa o portal, o Scheduler e a descoberta pública de provedores
pelo Gateway em `http://localhost:30080`.

O Gateway encaminha `/api/v1/auth`, `/api/v1/me`, `/api/v1/providers` e
`/api/v1/authorization` ao `identity-access-service`; o restante de `/api/v1` permanece
no Scheduler. As demais rotas seguem para o frontend.

O PostgreSQL usa um `PersistentVolume` local com política `Retain` em
`/var/lib/observabilidade-portal/postgres` no nó WSL.
