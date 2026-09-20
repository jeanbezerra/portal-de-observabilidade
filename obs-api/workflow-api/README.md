# workflow-api

Exemplo executável de processos corporativos com Apache KIE Kogito **10.2.0**, Spring Boot **3.5.10**, Spring Framework **6.2.x** e Java **21**. Esta API usa Spring Boot 3, diferentemente das outras APIs do workspace que já usam Boot 4: o BOM publicado do Kogito 10.2.0 ainda utiliza Boot 3.5.10. O Maven compila para Java 21; para executar, instale um JDK 21 ou superior.

Projeto criado no diretório já existente pelo archetype oficial:

```powershell
mvn -B archetype:generate '-DarchetypeGroupId=org.kie.kogito' '-DarchetypeArtifactId=kogito-spring-boot-archetype' '-DarchetypeVersion=10.2.0' '-DgroupId=com.porto.ciops.coa' '-DartifactId=workflow-api' '-Dversion=0.0.1-SNAPSHOT' '-Dpackage=com.porto.ciops.coa.workflow.api' '-Dstarters=processes' '-DinteractiveMode=false'
```

## Como executar

É necessário PostgreSQL acessível em `localhost:5432`, com usuário/senha `postgres/postgres`. Por padrão o exemplo usa o banco `postgres`; em ambiente compartilhado ou de produção, configure **um banco e um usuário próprios** via `DB_URL`, `DB_USERNAME` e `DB_PASSWORD`. Na primeira inicialização o Kogito cria suas tabelas por migrations próprias do Flyway. O pool Hikari mantém mínimo **2** e máximo **5** conexões.

No PowerShell, dentro de `obs-api/workflow-api`:

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run
```

O teste automatizado usa H2 em memória com perfil `test`; **a aplicação normal usa PostgreSQL**. Também é possível executar o pacote gerado com `java -jar target/workflow-api-0.0.1-SNAPSHOT.jar`.

Configurações opcionais (antes de iniciar):

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/postgres'
$env:DB_USERNAME = 'postgres'
$env:DB_PASSWORD = 'postgres'
$env:DB_POOL_MIN_IDLE = '2'
$env:DB_POOL_MAX_SIZE = '5'
$env:SERVER_PORT = '8082'
```

O serviço escuta em `127.0.0.1:8082` por padrão. `SERVER_ADDRESS` permite alterar o endereço somente após adicionar autenticação e controles de acesso apropriados.

| Recurso | Endereço |
| --- | --- |
| Swagger UI | <http://localhost:8082/> |
| OpenAPI JSON | <http://localhost:8082/api-docs> |
| Saúde | <http://localhost:8082/actuator/health> |
| Schema do processo | <http://localhost:8082/approvalRequests/schema> |
| Consulta GraphQL (Data Index) | `POST http://localhost:8082/graphql` |

## Entendendo o processo

O arquivo [`approvalRequests.bpmn2`](src/main/resources/approvalRequests.bpmn2) define:

```text
Solicitação → tarefa: primeira alçada → decisão
                                      ├─ reprovada → fim
                                      └─ aprovada → tarefa: segunda alçada → fim
```

As duas tarefas são oferecidas ao grupo de exemplo `approvers`. Quando a primeira tarefa é assumida pela API de tarefas humanas, o Kogito grava o usuário em `firstApprover` e o exclui da segunda tarefa. O índice de processos, a auditoria e o agendador de jobs estão integrados à própria aplicação (arquitetura compacta), sem exigir Kafka nem serviços Kogito separados para este exemplo.

Experimente no PowerShell, com a aplicação em execução:

```powershell
$base = 'http://localhost:8082'
$request = @{ requestId = 'REL-001'; title = 'Liberar acesso temporário'; requester = 'jean' } | ConvertTo-Json
$process = Invoke-RestMethod -Uri "$base/approvalRequests" -Method Post -ContentType 'application/json' -Body $request
$process.id

$firstTask = Invoke-RestMethod -Uri "$base/usertasks/instance?user=ana&group=approvers" |
    Where-Object { $_.processInfo.processInstanceId -eq $process.id -and $_.taskName -eq 'firstLineApproval' } |
    Select-Object -First 1
$firstTask.id

$firstUrl = "$base/usertasks/instance/$($firstTask.id)/transition?user=ana&group=approvers"
$claim = @{ transitionId = 'claim'; data = @{} } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri $firstUrl -Method Post -ContentType 'application/json' -Body $claim
$approve = @{ transitionId = 'complete'; data = @{ approved = $true; comment = 'Risco revisado' } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri $firstUrl -Method Post -ContentType 'application/json' -Body $approve

Invoke-RestMethod -Uri "$base/approvalRequests/$($process.id)"

$secondTask = Invoke-RestMethod -Uri "$base/usertasks/instance?user=bruno&group=approvers" |
    Where-Object { $_.processInfo.processInstanceId -eq $process.id -and $_.taskName -eq 'secondLineApproval' } |
    Select-Object -First 1
$secondTask.excludedUsers  # contém 'ana'

$secondUrl = "$base/usertasks/instance/$($secondTask.id)/transition?user=bruno&group=approvers"
Invoke-RestMethod -Uri $secondUrl -Method Post -ContentType 'application/json' -Body $claim
$finish = @{ transitionId = 'complete'; data = @{ approved = $true; comment = 'Liberado' } } | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri $secondUrl -Method Post -ContentType 'application/json' -Body $finish
```

Experimente enviar `approved = $false` na primeira alçada: o processo termina sem criar a segunda tarefa. Enquanto a instância está ativa, `GET /approvalRequests/{id}` mostra os dados atuais; ao terminar, ela sai dessa listagem e o histórico fica no Data Index/Audit.

**Atenção — demonstração, não configuração de produção.** `user` e `group` são parâmetros de *impersonação*, não autenticação. Além disso, as rotas de tarefas geradas diretamente sob `/approvalRequests/{id}/...` podem executar transições sem preencher `firstApprover` e, portanto, **não garantem a regra de quatro olhos**; use neste exemplo as rotas `/usertasks/instance/.../transition` mostradas acima. Antes de disponibilizar a API externamente, integre identidade real, restrinja rotas geradas e impeça alterações arbitrárias de variáveis internas do processo. O teste automatizado cobre os dois caminhos de aprovação, a rejeição na primeira alçada e o fluxo HTTP da API de tarefas humanas.

Observação de compatibilidade: o Flyway incluído no Kogito 10.2.0 emite um aviso ao encontrar PostgreSQL 18.x (ele informa suporte testado até 17). A aplicação iniciou, executou migrations e retomou uma tarefa humana após reinício neste PostgreSQL local 18.6; homologue essa combinação antes de usar em produção.
