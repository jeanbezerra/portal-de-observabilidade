# Portal de Observabilidade

Portal interno da Porto Seguros para dimensionar, registrar e acompanhar solicitações de serviços de observabilidade. Esta primeira versão implementa o orçamento Dynatrace para hosts, Kubernetes, RUM, serverless, logs e monitoramento sintético.

## Executar localmente

Para desenvolver fora do container, instale Node.js e NPM. Para executar sem ferramentas de build no host, use o [guia de deployment](deployment/README.md).

```shell
npm install
npm run dev
```

O ambiente de desenvolvimento fica disponível em `http://localhost:5173`.

O módulo de agendamentos usa `http://localhost:8081` como endereço padrão da
Scheduler Service. Para apontar para outro ambiente, defina antes de iniciar ou
compilar:

```shell
VITE_SCHEDULER_SERVICE_URL=https://scheduler-service.exemplo.interno
```

## Segurança e contas locais

**Administração > Segurança** integra o Identity Access Service: usuários e senhas locais, bloqueios,
grupos e participantes, perfis, permissões, provedores externos opcionais, auditoria, sessões e minha conta.
Os endereços antigos de identidade em `/administracao` redirecionam às páginas equivalentes em `/seguranca`.

Defina `IDENTITY_ACCESS_SERVICE_URL=http://127.0.0.1:8083` no servidor do portal.
Em Kubernetes, o ConfigMap usa `http://identity-access-service:8083`; em Compose,
`http://host.docker.internal:8083`. A variável é lida em execução e não vai para o JavaScript do navegador.
A rota interna `/api/identity/*` encaminha apenas endpoints conhecidos, cookies e CSRF,
rejeita mutações entre origens e limita o tamanho das solicitações.
Sessão, senhas e tokens não são persistidos em `localStorage`.

O login padrão é `/entrar`, por conta local. SAML/LDAP aparecem quando habilitados no serviço.
OIDC não possui adapter de autenticação e não pode ser habilitado pela interface.
Provisione o primeiro administrador conforme o [guia do serviço](../../services/identity-access-service/README.md).
Para retorno SAML POST entre sites, configure HTTPS, cookie seguro e `SESSION_COOKIE_SAME_SITE=none`.
As áreas de orçamento e agendamento conservam seus contratos: esta integração não acrescenta
autenticação aos demais backends.

Execute `npm test`, `npm run typecheck` e `npm run build`. Os testes verificam CSRF, cookies,
isolamento da rota interna, erros e redirecionamentos.
Fluent UI React v9.74.7: componentes estáveis, tokens e tema existentes, conteúdo em português,
tabelas semânticas, campos associados e diálogos com foco de retorno.
Validação visual e com leitor de tela permanece manual quando não há navegador conectado:
nesse caso, a fidelidade é **CONFORME COM EXCEÇÕES**.

## Validar e executar o build

```shell
npm run typecheck
npm test
npm run build
npm start
```

O servidor do build usa `http://localhost:3000` por padrão.

## Rotas

- `/entrar`: autenticação com conta local ou provedor externo habilitado.
- `/seguranca/minha-conta`: perfil, dados da conta, perfis e permissões, alteração de senha local e controle da sessão atual.
- `/health`: saúde do servidor para probes de container, sem autenticação.
- `/`: visão geral das soluções de observabilidade.
- `/orcamentos`: catálogo e orçamentos enviados.
- `/orcamentos/novo/dynatrace`: fluxo completo da solicitação Dynatrace.
- `/administracao/usuarios`: administração de usuários.
- `/administracao/grupos`: administração de grupos.
- `/administracao/roles`: administração de roles.
- `/administracao/permissoes`: administração de permissões.
- `/administracao/provedores-idp`: administração de provedores de identidade.
- `/administracao/agendamentos/calendarios`: cadastro e gestão do calendário corporativo.
- `/administracao/agendamentos/fusos-horarios`: cadastro e gestão dos fusos horários usados pelos sistemas.
- `/administracao/agendamentos/rotinas-agendadas`: gestão das rotinas agendadas.
- `/administracao/agendamentos/rotinas-agendadas/nova`: criação dedicada de uma rotina e de seu trigger inicial.
- `/administracao/agendamentos/historico-execucoes`: histórico das execuções do scheduler.

Os endereços anteriores `/administracao/calendario` e
`/administracao/fusos-horarios` redirecionam para o grupo Agendamentos da
Administração.

## Escopo do protótipo

- O cálculo usa valores internos demonstrativos, não a tabela comercial oficial do Dynatrace.
- A identificação registra solicitante e gestor, vertical de negócio, produto, squad opcional, categoria Porto SDM, tipo de solicitação, nome e estágio do sistema e, em adições, o orçamento anterior aprovado.
- Ao concluir os dados do solicitante, o portal prepara um identificador `ORC-...`, confirmado no envio, e gera a taxonomia de rastreabilidade para OneAgent, Kubernetes, serverless e OpenTelemetry.
- O envio congela o manifesto de tags, baixa o comprovante em PDF e mantém o registro no `localStorage` do navegador.
- O calendário corporativo permite cadastrar, editar, filtrar e excluir datas persistidas pelo Scheduler Service.
- O cadastro de fusos horários mantém um identificador IANA ativo como padrão no Scheduler Service.
- A gestão de rotinas agendadas cria JobDetails e triggers, consulta o estado do Quartz e executa comandos de pausa, retomada, disparo, interrupção, duplicação e exclusão pela API.
- O histórico de execuções apresenta os eventos auditáveis capturados pelo Scheduler Service.
- A autenticação e a administração de identidade usam o Identity Access Service. Revisão técnica, aprovação e armazenamento corporativo dos orçamentos ainda dependem de backend e BPMN.
- Datadog e StackOpen aparecem no catálogo como soluções futuras, sem fluxo de solicitação ativo.

## Interface

A auditoria usa a largura disponível, filtros combinados, ordenação e paginação
no servidor. Exporta a consulta aplicada em CSV, XLSX, JSON e PDF, com finalidade
registrada e nomes atuais omitidos por padrão. Consulte os controles, limites e
decisões organizacionais em [Auditoria e LGPD](../../docs/operacao/auditoria-e-lgpd.md).

Minha conta organiza os dados, acessos, senha e sessão em cartões Fluent UI v9.
As permissões ficam em uma seção expansível; a consulta de sessões ativas depende
da permissão `session:read`. Os prazos da sessão usam os dados da API e o horário
de Brasília. Contas externas orientam a alteração de senha no provedor.
O formulário local valida a confirmação e o limite de 72 bytes antes do envio,
permite mostrar as senhas e limpa os campos ao fechar.

O login usa uma composição em duas colunas no desktop com fotografia do site
oficial da Porto, servida pelo próprio portal. Em telas menores, o formulário
ocupa a largura disponível. Os textos e o fluxo de autenticação são preservados.
A entrada é suave e o movimento decorativo pode ser pausado; a preferência de
movimento reduzido e as cores forçadas do navegador são respeitadas. A origem da
foto está documentada em [public/images/README.md](public/images/README.md).

O Dockerfile compila o portal no Linux e executa `npm run test:production`, que
inicia o servidor de produção e verifica por HTTP todos os arquivos gerados:
JavaScript, CSS, logo, ícones, favicon e fontes. Não copie um `build/` gerado no
Windows para uma imagem Linux: o diretório de arquivos estáticos exportado pelo
React Router contém os separadores de caminho da plataforma de compilação.
Após o rollout, execute `npm run verify:assets -- http://127.0.0.1:30080` para
validar os arquivos usados pela tela de login e os recursos visuais compartilhados.

Todas as páginas de trabalho exigem sessão validada no servidor pelo Identity
Access Service, inclusive nas navegações que carregam dados. O login é apresentado
sem o menu do portal e retorna à página originalmente solicitada. O cookie de
sessão é `HttpOnly`; senhas e identificadores de sessão não são armazenados no
`localStorage` ou no `sessionStorage`.

A API informa os prazos de inatividade e de duração máxima em `/api/v1/me`.
O portal revalida a sessão ao retomar a aba e, durante a atividade do usuário,
no máximo uma vez a cada 30 segundos. Abas ociosas não enviam renovações periódicas.
Expiração, revogação e respostas 401 retiram o conteúdo protegido e levam ao login;
o logout também encerra a sessão no serviço e é comunicado às outras abas.
Respostas autenticadas usam `Cache-Control: no-store`.

A aplicação usa React Router Framework Mode com SSR, Fluent UI React v9, tokens semânticos, Griffel, ícones oficiais do Fluent e a marca oficial da Porto Seguros. Os estilos Fluent são extraídos no servidor e reutilizados durante a hidratação do cliente.

## Padrões técnicos

- [Tags e rastreabilidade do Dynatrace](docs/padrao-tags-dynatrace.md)

## Execução e deployment

Este componente possui scripts e manifestos próprios. Consulte o [guia de deployment](deployment/README.md) para executar em containers locais ou publicar em um cluster Kubernetes específico.

```powershell
.\scripts\deploy\local.ps1 -Engine docker
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.example.com/equipe/portal-web:1.0.0
```
