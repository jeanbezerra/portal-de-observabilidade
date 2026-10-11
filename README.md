# Portal de Observabilidade

Portal interno da Porto Seguros para solicitações de observabilidade, orçamentos e administração de rotinas agendadas. O frontend e os quatro serviços Java possuem build e deployment próprios, preparados para ganhar repositórios separados.

## Estrutura do projeto

```text
portal-de-observabilidade/
├── apps/                    # aplicações frontend
│   └── portal-web/          # portal React, assets e documentação específica
│       ├── deployment/      # Compose local e manifestos Kubernetes
│       └── scripts/         # build e deploy independentes
├── services/                # serviços backend independentes
│   ├── identity-access-service/
│   ├── platform-service/
│   ├── scheduler-service/
│   └── workflow-service/
│       ├── deployment/      # mesma convenção em todos os serviços
│       └── scripts/
├── scripts/build/           # atalho opcional para validar todos os componentes
├── dev-setup/               # preparação do ambiente e guias de desenvolvimento
│   └── codex/skills/        # skills locais de apoio ao desenvolvimento
├── docs/                    # arquitetura e procedimentos operacionais
│   ├── arquitetura-tecnica/
│   └── operacao/
└── .vscode/                 # configuração compartilhada do editor
```

Cada componente mantém suas dependências, configuração, Dockerfile e testes em sua própria pasta. Os Maven Wrappers ficam nos respectivos serviços; o `package.json` e o lockfile NPM ficam em `apps/portal-web`.

## Desenvolvimento

Prepare o ambiente conforme o [guia de desenvolvimento](dev-setup/README.md). Para iniciar o portal, execute na raiz:

```powershell
cd apps/portal-web
npm ci
npm run dev
```

Consulte o [README do portal](apps/portal-web/README.md) para rotas e integração com o Scheduler. Os guias dos serviços são [Platform](services/platform-service/README.md), [Scheduler](services/scheduler-service/README.md), [Workflow](services/workflow-service/README.md) e [Identity Access](services/identity-access-service/README.md).

## Executar um componente

Entre na pasta do componente, por exemplo `services/scheduler-service`, e escolha o ambiente:

```powershell
# Containers locais; use docker, podman ou nerdctl conforme o runtime.
.\scripts\deploy\local.ps1 -Engine docker

# Kubernetes; informe o contexto do kubeconfig e uma imagem publicada.
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.example.com/equipe/scheduler-service:1.0.0
```

O fluxo local compila dentro do container e inicia as dependências do componente. O fluxo Kubernetes usa um contexto explícito, banco e credenciais do ambiente de destino. Consulte o [guia de execução e deployment](docs/operacao/deployment.md) para ensinar esses dois caminhos à equipe.

Cada componente funciona sem os diretórios da raiz deste repositório. As pastas `apps/` e `services/` apenas agrupam os projetos enquanto a separação no Git não ocorre; copie a pasta inteira do componente, incluindo `deployment/`, `scripts/`, documentação e arquivos ocultos, ao criar seu futuro repositório.

O único atalho global opcional é `scripts/build/build-all.ps1`, que chama os builds locais dos componentes. Ele não é necessário para executar ou publicar um projeto.

## Documentação

- [Índice técnico e operacional](docs/README.md)
- [Arquitetura técnica](docs/arquitetura-tecnica/README.md)
- [Execução local e deployment em cluster](docs/operacao/deployment.md)
- [Acesso ao PostgreSQL local](docs/operacao/acesso-postgresql.md)

## Onde adicionar arquivos

- Código, testes, migrations e assets pertencem ao componente em `apps/` ou `services/`.
- Scripts pertencem a `<componente>/scripts/<finalidade>/`; `local.ps1` executa Compose e `rollout.ps1` publica em Kubernetes.
- YAMLs pertencem a `<componente>/deployment/`, separados em `local/` e `kubernetes/`. Scripts de componentes não acessam arquivos dos diretórios pais.
- Procedimentos operacionais compartilhados ficam em `docs/operacao/`; cada componente mantém seu guia de deployment e sua especificação técnica.
- Arquitetura compartilhada fica em `docs/arquitetura-tecnica/`; instruções de preparação do ambiente ficam em `dev-setup/`.
- Dependências, builds, credenciais e arquivos temporários não devem ser versionados.
