# Arquitetura técnica

Esta pasta reúne as visões de arquitetura, decisões e contratos técnicos do
Portal de Observabilidade.

## Documentos

- [Visão de serviços do produto](./visao-de-servicos.md): limites de
  responsabilidade, protocolos e colaboração entre `portal-web`,
  `identity-access-service`, `platform-service`, `scheduler-service` e `workflow-service`.
- [Identidade, autenticação e autorização](./identidade-e-acesso.md): arquitetura
  alvo baseada no `identity-access-service`, federação OpenID Connect, BFF no
  React Router SSR, sessões no Redis e autorização centralizada.
