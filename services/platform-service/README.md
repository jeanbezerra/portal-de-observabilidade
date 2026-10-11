# Platform Service

Serviço Java/Spring Boot da plataforma. Suas dependências ficam em `pom.xml` e a configuração da aplicação fica em `src/main/resources/application.properties`.

## Desenvolvimento e validação

Execute na raiz deste serviço:

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd verify
```

## Execução e deployment

Este componente possui scripts e manifestos próprios. Consulte o [guia de deployment](deployment/README.md) para executar em containers locais ou publicar em um cluster Kubernetes específico.

```powershell
.\scripts\deploy\local.ps1 -Engine docker
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.example.com/equipe/platform-service:1.0.0
```
