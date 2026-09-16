# Portal de Observabilidade

Portal interno da Porto Seguros para dimensionar, registrar e acompanhar solicitações de serviços de observabilidade. Esta primeira versão implementa o orçamento Dynatrace para hosts, Kubernetes, RUM, serverless, logs e monitoramento sintético.

## Executar localmente

Consulte o [setup completo do ambiente](../dev-setup/README.md) caso ainda não tenha o Node.js, o npm ou as extensões recomendadas do Visual Studio Code.

```shell
npm install
npm run dev
```

O ambiente de desenvolvimento fica disponível em `http://localhost:5173`.

## Validar e executar o build

```shell
npm run typecheck
npm run build
npm start
```

O servidor do build usa `http://localhost:3000` por padrão.

## Rotas

- `/`: visão geral das soluções de observabilidade.
- `/orcamentos`: catálogo e orçamentos enviados.
- `/orcamentos/novo/dynatrace`: fluxo completo da solicitação Dynatrace.
- `/administracao/usuarios`: administração de usuários.
- `/administracao/grupos`: administração de grupos.
- `/administracao/roles`: administração de roles.
- `/administracao/permissoes`: administração de permissões.
- `/administracao/provedores-idp`: administração de provedores de identidade.

## Escopo do protótipo

- O cálculo usa valores internos demonstrativos, não a tabela comercial oficial do Dynatrace.
- A identificação registra solicitante e gestor, vertical de negócio, produto, squad opcional, categoria Porto SDM, tipo de solicitação, nome e estágio do sistema e, em adições, o orçamento anterior aprovado.
- Ao concluir os dados do solicitante, o portal prepara um identificador `ORC-...`, confirmado no envio, e gera a taxonomia de rastreabilidade para OneAgent, Kubernetes, serverless e OpenTelemetry.
- O envio congela o manifesto de tags, baixa o comprovante em PDF e mantém o registro no `localStorage` do navegador.
- Revisão técnica, aprovação, autenticação e armazenamento corporativo ainda dependem de integração com backend e BPMN.
- Datadog e StackOpen aparecem no catálogo como soluções futuras, sem fluxo de solicitação ativo.

## Interface

A aplicação usa React Router Framework Mode com SSR, Fluent UI React v9, tokens semânticos, Griffel, ícones oficiais do Fluent e a marca oficial da Porto Seguros. Os estilos Fluent são extraídos no servidor e reutilizados durante a hidratação do cliente.

## Padrões técnicos

- [Tags e rastreabilidade do Dynatrace](docs/padrao-tags-dynatrace.md)
