# Acesso aos bancos locais

Cada serviço Java mantém um PostgreSQL exclusivo no seu Compose. Inicie o serviço com `scripts/deploy/local.ps1` dentro da pasta do projeto antes de conectar um cliente.

| Serviço | Host | Porta padrão | Banco |
| --- | --- | --- | --- |
| Platform | `localhost` | `54320` | `platform` |
| Scheduler | `localhost` | `54321` | `scheduler` |
| Workflow | `localhost` | `54322` | `workflow` |
| Identity Access | `localhost` | `54323` | `identity_access` |

O usuário, a senha gerada e a porta configurada ficam em `deployment/local/.env` do respectivo projeto. Use esses valores no cliente de banco; SSL fica desabilitado para esse acesso local de desenvolvimento.

Também é possível consultar pelo terminal do container, por exemplo na raiz do Scheduler:

```console
docker compose --project-name scheduler-service --env-file deployment/local/.env --file deployment/local/compose.yaml exec postgres psql --username=app --dbname=scheduler
```

Troque o runtime, projeto, banco e usuário conforme o componente e seu `.env`.

O volume nomeado é mantido quando `local.ps1 -Action down` encerra os containers. Alterar a senha no `.env` não altera a senha de um banco já inicializado: o ambiente precisa continuar usando a credencial persistida ou alterá-la no PostgreSQL.

No cluster Kubernetes, os serviços usam as conexões informadas nos Secrets do ambiente. O acesso ao banco depende da infraestrutura escolhida pela equipe; consulte o [guia de deployment](deployment.md).

Os antigos dados do PostgreSQL no WSL não são removidos nem copiados para esses bancos. Reutilizá-los exige exportação e restauração planejadas.
