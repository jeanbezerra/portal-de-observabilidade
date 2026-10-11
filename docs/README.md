# Documentação do projeto

## Arquitetura

- [Visão geral da arquitetura](arquitetura-tecnica/README.md)
- [Visão dos serviços](arquitetura-tecnica/visao-de-servicos.md)
- [Identidade e acesso](arquitetura-tecnica/identidade-e-acesso.md)
- [Especificação do Identity Access Service](../services/identity-access-service/docs/obs-identity-access-service-sdd.md)
- [Especificação do Scheduler Service](../services/scheduler-service/docs/obs-scheduler-service-sdd.md)

## Operação

- [Acesso ao PostgreSQL local](operacao/acesso-postgresql.md)
- [Execução local e deployment em cluster](operacao/deployment.md)
- [Comandos de build, deploy e testes](../scripts/README.md)

## Desenvolvimento e componentes

- [Preparação do ambiente](../dev-setup/README.md)
- [Convenções das aplicações frontend](../apps/README.md)
- [Portal web](../apps/portal-web/README.md)
- [Tags e rastreabilidade Dynatrace](../apps/portal-web/docs/padrao-tags-dynatrace.md)
- [Scheduler Service](../services/scheduler-service/README.md)
- [Platform Service](../services/platform-service/README.md)
- [Workflow Service](../services/workflow-service/README.md)
- [Identity Access Service](../services/identity-access-service/README.md)

Documentação compartilhada fica neste diretório. Guias e especificações de um componente permanecem junto ao seu código; onboarding fica em `dev-setup/` e cada componente mantém seus manifestos e guia de implantação em `deployment/`.
