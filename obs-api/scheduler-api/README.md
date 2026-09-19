# Scheduler API

API administrativa do Quartz Scheduler, construída com Spring MVC, JDBC e PostgreSQL.

## Ambiente local

O arquivo `application.properties` representa o ambiente local e usa, por padrão:

- API: `http://localhost:8081`
- Swagger UI: `http://localhost:8081/`
- OpenAPI JSON: `http://localhost:8081/api-docs`
- PostgreSQL: `jdbc:postgresql://localhost:5432/obs_scheduler`
- Usuário e senha: `obs_scheduler`

Os valores podem ser substituídos pelas variáveis `SERVER_PORT`, `DB_URL`,
`DB_USERNAME`, `DB_PASSWORD`, `DB_POOL_MAX_SIZE`, `DB_POOL_MIN_IDLE` e
`QUARTZ_THREAD_COUNT`.

Depois de disponibilizar o banco local, execute:

```powershell
.\mvnw.cmd spring-boot:run
```

O Flyway cria as tabelas persistentes do Quartz na primeira inicialização.

## Produção

Ative o perfil `prod` e informe obrigatoriamente `DB_URL`, `DB_USERNAME` e
`DB_PASSWORD`. Nesse perfil, o Swagger UI e o documento OpenAPI ficam
desabilitados.

## Validação

```powershell
.\mvnw.cmd verify
```

Os testes usam JDBC com um banco H2 descartável em modo de compatibilidade com
PostgreSQL e executam a mesma migration usada pela aplicação.
