# Scheduler API

API administrativa do Quartz Scheduler, construída com Spring MVC, JDBC e PostgreSQL.

## Ambiente local

O arquivo `application.properties` representa o ambiente local e usa, por padrão:

- API: `http://localhost:8081`
- Swagger UI: `http://localhost:8081/`
- OpenAPI JSON: `http://localhost:8081/api-docs`
- PostgreSQL: `jdbc:postgresql://localhost:5432/postgres`
- Usuário e senha: `postgres`
- Pool de conexões: mínimo `2` e máximo `5`

Os valores podem ser substituídos pelas variáveis `SERVER_PORT`, `DB_URL`,
`DB_USERNAME`, `DB_PASSWORD`, `DB_POOL_MAX_SIZE`, `DB_POOL_MIN_IDLE`,
`QUARTZ_THREAD_COUNT` e `CORS_ALLOWED_ORIGINS`. Esta última aceita uma lista
separada por vírgulas e, no ambiente local, permite `http://localhost:5173` e
`http://localhost:3000`.

Depois de disponibilizar o banco local, execute:

```powershell
.\mvnw.cmd spring-boot:run
```

O Flyway cria as tabelas persistentes do Quartz na primeira inicialização.

## Recursos administrativos

A API expõe sob `/api/v1`:

- estado da instância em `/scheduler`;
- datas corporativas em `/calendars`;
- fusos horários em `/time-zones`;
- grupos e catálogo de tipos em `/job-groups` e `/job-types`;
- JobDetails, triggers e ações operacionais em `/jobs`;
- histórico auditável em `/executions`.

Jobs cujas classes estão no classpath são registrados diretamente no Quartz.
Tipos apenas catalogados pelo portal usam o executor administrativo da API até
que sua implementação seja implantada, preservando no contrato o nome lógico da
classe. O histórico de início, término, recuperação, falha e solicitação de
interrupção fica nas tabelas próprias criadas pela migration `V2`.

`DailyTimeIntervalTrigger` segue o fuso padrão da JVM, pois esse tipo de trigger
do Quartz não oferece configuração de fuso por instância. Em ambientes que o
utilizam, configure `-Duser.timezone` com o mesmo fuso selecionado no portal.

## Arquitetura

O código é organizado por funcionalidade e cada feature expõe somente as camadas
que possui:

- `administration`: API e serviço de aplicação para calendários, fusos, grupos e tipos;
- `jobs`: API, serviços separados de comando e consulta e adapters Quartz;
- `scheduler`: API fina e serviço de aplicação para o estado operacional;
- `configuration` e `support`: configuração global e tradução de erros HTTP.

Controllers cuidam do protocolo HTTP, serviços coordenam os casos de uso e os
detalhes de execução do Quartz permanecem em `infrastructure`. A implementação
usa services pragmáticos, pois os casos de uso atuais são transacionais e não
justificam uma camada de domínio ou uma classe por use case.

Os contratos imutáveis de entrada e saída ficam em `application/model`, com um
record público por arquivo. Eles não são entidades de persistência e, por isso,
não existe uma camada `entity` ou mapeadores adicionais sem necessidade concreta.

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
