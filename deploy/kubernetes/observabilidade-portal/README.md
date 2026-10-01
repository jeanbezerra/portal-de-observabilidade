# Deployment local no Kubernetes WSL

Este overlay publica o portal no namespace `observabilidade-portal` usando o
Gateway `gateway-system/wsl-gateway` já existente no cluster.

## Rollout automatizado

Na raiz do repositório, execute um dos scripts abaixo no PowerShell:

```powershell
# Reconstrói, importa e reinicia somente o frontend.
.\rollout-obs-web.ps1

# Reconstrói o frontend e a Scheduler API e executa o rollout completo.
.\rollout-all.ps1
```

Os scripts usam por padrão a distribuição WSL `Ubuntu-26.04`, o namespace
`observabilidade-portal` e as tags locais descritas abaixo. Os valores podem
ser personalizados por parâmetro:

```powershell
.\rollout-all.ps1 -WslDistribution Ubuntu-26.04 -TimeoutSeconds 300
```

O rollout completo aplica todo o overlay e reinicia os deployments
`scheduler-api` e `obs-web`. O StatefulSet do PostgreSQL é aguardado e só sofre
rollout quando uma mudança no manifesto aplicado exigir isso.

## Imagens locais

As imagens usam as tags abaixo e `imagePullPolicy: Never`:

- `localhost/observabilidade-portal/obs-web:local`
- `localhost/observabilidade-portal/scheduler-api:local`

Elas precisam estar no containerd do nó `kubernetes-wsl` antes da aplicação dos
manifests.

Partindo da raiz do repositório, gere o JAR e as imagens:

```powershell
.\obs-api\scheduler-api\mvnw.cmd -q verify
wsl -d Ubuntu-26.04 -u root -- buildah bud --tag localhost/observabilidade-portal/scheduler-api:local /mnt/c/caminho/do/repositorio/obs-api/scheduler-api
wsl -d Ubuntu-26.04 -u root -- buildah bud --tag localhost/observabilidade-portal/obs-web:local /mnt/c/caminho/do/repositorio/obs-web
```

Exporte as imagens para o containerd do Kubernetes:

```shell
sudo buildah push localhost/observabilidade-portal/scheduler-api:local docker-archive:/tmp/scheduler-api-local.tar:localhost/observabilidade-portal/scheduler-api:local
sudo buildah push localhost/observabilidade-portal/obs-web:local docker-archive:/tmp/obs-web-local.tar:localhost/observabilidade-portal/obs-web:local
sudo ctr --namespace k8s.io images import /tmp/scheduler-api-local.tar
sudo ctr --namespace k8s.io images import /tmp/obs-web-local.tar
sudo rm -f /tmp/scheduler-api-local.tar /tmp/obs-web-local.tar
```

## Credencial do banco

O Secret não é versionado. Crie-o antes do primeiro deploy:

```shell
kubectl create secret generic scheduler-database \
  --namespace observabilidade-portal \
  --from-literal=username=scheduler \
  --from-literal=password='<senha-local-forte>'
```

## Aplicação

```shell
kubectl apply -k deploy/kubernetes/observabilidade-portal
kubectl rollout status statefulset/scheduler-postgres -n observabilidade-portal
kubectl rollout status deployment/scheduler-api -n observabilidade-portal
kubectl rollout status deployment/obs-web -n observabilidade-portal
```

Com o port-forward padrão do cluster ativo, o portal fica disponível em
`http://localhost:30080`. O Gateway encaminha `/api/v1` para a Scheduler API e
as demais rotas para o frontend.

O PostgreSQL usa um `PersistentVolume` local com política `Retain` em
`/var/lib/observabilidade-portal/postgres` no nó WSL.
