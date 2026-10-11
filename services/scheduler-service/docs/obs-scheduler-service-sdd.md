# OBS Scheduler Service — SDD e plano de qualidade

> **Status:** implementação funcional; melhoria de qualidade em andamento  
> **Artefato:** `scheduler-service`  
> **Pacote base:** `com.porto.ciops.coa.obs.scheduler`  
> **Runtime:** Java 25 + Spring Boot 4.1.x + Quartz 2.5.x  
> **Última atualização:** 2026-10-05

## 1. Objetivo

O `scheduler-service` administra rotinas Quartz, triggers, calendários, histórico e logs de execução. A rodada de melhoria de outubro de 2026 teve como objetivos:

- eliminar bugs e vulnerabilidades indicados pelo SonarQube;
- tornar consultas SQL parametrizadas e previsíveis;
- tornar a execução HTTP segura, observável e testável;
- preservar compatibilidade com jobs Quartz já persistidos;
- corrigir limites transacionais entre casos de uso Spring;
- disponibilizar paginação, filtros e ordenação dos logs de execução;
- elevar a cobertura do código novo para pelo menos 80%;
- chegar a zero issues no projeto, sem esconder problemas reais por exclusões genéricas.

## 2. Estado entregue

Principais decisões e melhorias já implementadas:

- operações em lote foram movidas para um bean Spring próprio, evitando autoinvocação transacional;
- casos de uso públicos definem as fronteiras de transação e fazem rollback de `SchedulerException`;
- consultas de logs utilizam SQL estático e `NamedParameterJdbcTemplate`;
- a execução HTTP possui allowlist de hosts, limite de resposta, retries controlados e TLS inseguro com duplo opt-in;
- segredos e payloads sensíveis não são registrados nos logs de execução;
- logs possuem pesquisa, nível, período, ordenação, paginação e agrupamento por execução;
- o estado da thread de execução é tratado de forma atômica e interrupções são preservadas;
- o parser de `SimpleTrigger` é determinístico e não depende de uma expressão regular sujeita a ReDoS;
- as classes de compatibilidade Quartz preservam os nomes binários `ManagedJobs$...` usados por definições persistidas;
- JaCoCo e Sonar Maven estão versionados no `pom.xml` e o artefato final é `target/app.jar`.

## 3. Última linha de base confirmada

A análise final processada nesta rodada apresentou:

| Indicador | Valor |
| --- | ---: |
| Testes | 42 aprovados, 0 falhas |
| Cobertura de código novo | 79,6% |
| Cobertura geral | 70,4% |
| Cobertura de linhas | 75,6% |
| Cobertura de branches | 59,0% |
| Duplicação no código novo | 0,0% |
| Issues no código novo | 0 |
| Bugs | 0 |
| Vulnerabilidades | 0 |
| Code smells totais | 11 |

O projeto iniciou a rodada com 2.463 issues, sendo 36 bugs, 23 vulnerabilidades e 2.404 code smells, além de não publicar cobertura. A redução obtida foi, portanto, material; o trabalho restante está concentrado em cobertura de branches e decomposição estrutural.

O Sonar confirmou `new_violations = 0`. O Quality Gate permanece vermelho exclusivamente porque a cobertura do código novo ainda está 0,4 ponto percentual abaixo da meta de 80%.

## 4. Critérios de conclusão

Há dois marcos distintos:

### 4.1 Quality Gate do código novo

- `new_coverage >= 80%`;
- `new_violations = 0`;
- `new_duplicated_lines_density <= 3%`;
- build e todos os testes aprovados.

### 4.2 Projeto sem issues

- zero bugs;
- zero vulnerabilidades;
- zero code smells ativos;
- nenhuma exclusão ampla de segurança ou correção;
- exceções inevitáveis de framework somente podem ser aceitas de forma localizada, com justificativa técnica e aprovação no Quality Profile.

## 5. Cobertura necessária para ultrapassar 80%

O gap confirmado é de 0,4 ponto percentual. Não se deve aumentar a cobertura com testes artificiais de getters; os próximos testes devem exercer comportamento e branches relevantes.

Prioridade recomendada:

1. Criar testes do parser de `SimpleTrigger` para unidade desconhecida, mais de um separador, cláusula `REPEAT` incompleta e separador sem conteúdo. Esses casos cobrem os branches adicionados pelo parser determinístico.
2. Criar teste de consulta de execução ativa em cluster com linhas em `qrtz_fired_triggers`, cobrindo:
   - `sched_time` nulo e preenchido;
   - grupo de recuperação do Quartz;
   - interrupção solicitada;
   - duas linhas da mesma rotina, mantendo a execução mais recente.
3. Se o gate ainda ficar abaixo de 80%, complementar `HttpRequestJobExecutorTests` com:
   - retry por `IOException` e falha na última tentativa;
   - autenticação Basic, Bearer e API key em header;
   - configuração ausente e JSON persistido inválido;
   - resposta acima de `maxResponseBytes`.

Os itens 1 e 2 devem ser suficientes para superar o pequeno gap sem inflar a suíte.

## 6. Issues estruturais restantes

Após eliminar os apontamentos novos, a linha de base ainda contém os seguintes débitos anteriores.

### 6.1 `SchedulerJobQueryService`

- `java:S2143`: uso de `java.util.Date` na fronteira imposta pelo Quartz;
- `java:S1448`: classe com mais de 35 métodos;
- `pmd:CyclomaticComplexity`: complexidade agregada da classe.

Refatoração proposta:

- extrair `SchedulerJobReadService` para leitura de jobs e triggers;
- extrair `ExecutionHistoryQueryService` para histórico e contadores;
- extrair `ExecutionLogQueryService` para pesquisa paginada de logs;
- extrair um adapter Quartz para conversão de `Date` em `Instant` e leitura de execuções ativas.

### 6.2 `SchedulerJobService`

- `pmd:CyclomaticComplexity` na classe e no fluxo de atualização de trigger;
- `pmd:LooseCoupling` para `JobDataMap`, que é um tipo concreto exigido pela API Quartz.

Refatoração proposta:

- separar comandos de job e comandos de trigger em serviços de aplicação diferentes;
- extrair a reconciliação de trigger para um colaborador dedicado;
- encapsular `JobDataMap` no adapter Quartz. Se a API continuar exigindo o tipo concreto, registrar uma exceção localizada no Quality Profile, sem exclusão global.

### 6.3 `HttpRequestJobExecutor`

- `pmd:AvoidInstantiatingObjectsInLoops` no enriquecimento de falhas TLS durante retry;
- `pmd:NPathComplexity` na montagem do request;
- `java:S1941` na leitura da resposta OAuth.

Refatoração proposta:

- extrair `HttpRequestFactory` para headers, cookies, autenticação e body;
- extrair `HttpRetryExecutor` para a máquina de estados de retry;
- extrair a validação e desserialização da resposta OAuth para um método coeso.

### 6.4 `HttpRequestConfigurationValidator`

- `pmd:CyclomaticComplexity` agregada, embora os métodos individuais tenham baixa complexidade.

Refatoração proposta:

- dividir validações por responsabilidade: destino, autenticação, body, retry e TLS;
- manter o componente atual apenas como orquestrador das regras.

### 6.5 Compatibilidade de datas Quartz

- `java:S2143` também aparece em `SchedulerTriggerFactory`, pois Quartz ainda recebe `java.util.Date` em calendários.

Manter `java.time` no domínio e limitar `Date.from(...)` ao adapter Quartz. Se o analyzer continuar apontando a fronteira inevitável, documentar e aceitar somente essa linha.

## 7. Pendência da ferramenta de análise

O scanner conclui e publica o relatório, porém o plugin FindSecBugs 4.7.0 lança `NullPointerException` no detector `CorsRegistryCORSDetector` ao analisar `CorsConfiguration`. Isso é uma incompatibilidade do detector com o bytecode/framework atual e pode deixar a análise específica de CORS incompleta.

Próxima ação operacional:

1. atualizar o plugin Sonar FindBugs/FindSecBugs para uma versão compatível com SonarQube Community Build 26.9 e Java 25;
2. reexecutar a análise;
3. validar CORS também com teste de integração e regra nativa equivalente;
4. desabilitar apenas o detector defeituoso somente se a atualização não estiver disponível e houver cobertura equivalente.

## 8. Sequência para retomada

1. executar os testes adicionais da seção 5;
2. executar `mvn clean verify`;
3. executar o SonarQube com o token fornecido por variável de ambiente ou prompt seguro;
4. confirmar `new_coverage >= 80%` e `new_violations = 0`;
5. decompor as classes da seção 6 em mudanças pequenas, sempre com testes antes de cada nova análise;
6. atualizar esta linha de base após cada grupo de refatorações.

Comando de validação, sem persistir credenciais:

```powershell
$secureToken = Read-Host -AsSecureString "Sonar token"
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
  $env:SONAR_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
  mvn clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar `
    -Dsonar.projectKey=scheduler-service `
    -Dsonar.projectName=scheduler-service `
    -Dsonar.host.url=http://localhost:9000 `
    -Dsonar.token=$env:SONAR_TOKEN
}
finally {
  Remove-Item Env:SONAR_TOKEN -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
}
```

O token nunca deve ser salvo no `pom.xml`, em scripts versionados ou na documentação.
