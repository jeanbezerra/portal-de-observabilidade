# Identity Access Service

Serviço central de identidade, autenticação local, federação e autorização da plataforma OBS.
Usuários, senhas protegidas por BCrypt, grupos, perfis, permissões e auditoria são gerenciados no PostgreSQL
por padrão. SAML e LDAP são opcionais, utilizadas somente quando cadastradas e habilitadas.
Redis mantém as sessões transitórias; nenhum provedor externo é necessário para o acesso local.
`GET /api/v1/me` também informa `session.checkedAt`, `session.expiresAt` e
`session.absoluteExpiresAt` para que o portal acompanhe a validade da sessão sem
receber seu identificador. A expiração considera o menor prazo entre inatividade
e duração máxima. Clientes autenticados somente por token recebem `session: null`.
Esta implementação segue o
[`obs-identity-access-service-sdd.md`](docs/obs-identity-access-service-sdd.md)
e mantém o domínio independente de fornecedores: não usa MSAL, SDKs de IdP ou protocolos próprios.

## Estado da implementação

O incremento atual entrega os Milestones 1, 3 e 4, além da base executável dos Milestones 2 e 6:

- Java 25, Spring Boot 4.1, Spring MVC e Virtual Threads;
- PostgreSQL como fonte de verdade, migrations Flyway e optimistic locking;
- sessões e cache distribuídos no Redis;
- configuração tipada e validada;
- segurança deny-by-default, CORS explícito, CSRF, session fixation protection e limite absoluto de sessão;
- registro e descoberta de provedores SAML, OIDC e LDAP;
- ciclo de vida `DRAFT -> VALIDATED -> ENABLED -> DISABLED` com estado `ERROR`;
- configuração de segredos somente por referências `secret://...`, sempre redigidas na API;
- normalização de identidade sem expor tokens, credenciais ou assertions;
- RBAC OBS-owned com permissões no formato `<resource>:<action>` e negação por padrão;
- auditoria persistida para mudanças de provedor e decisões de autorização;
- autenticação LDAP/LDAPS com bind e pesquisas configuráveis, extração de grupos e timeouts;
- SSO SAML 2.0 compatível com Microsoft Entra ID, usando validação padrão do Spring Security/OpenSAML;
- download HTTPS, limite de tamanho e renovação periódica do metadata SAML com último registro válido;
- normalização de atributos SAML e criação da sessão browser sem persistir ou propagar a assertion;
- criação e rotação da sessão browser com `SecurityContext` persistido no Redis;
- resolução externa de segredos por referências `secret://env/VARIAVEL` ou referências namespaced;
- erros HTTP em RFC 9457 `ProblemDetail`;
- Actuator, OpenTelemetry e health groups de liveness/readiness;
- testes unitários e integração PostgreSQL/Redis por Testcontainers.

A integração OIDC e a emissão de tokens internos permanecem como adapters posteriores. Elas dependem dos
metadados e referências de segredos de cada ambiente. Os ports de federação e emissão de tokens existem para
que esses adapters não contaminem o domínio.

## Arquitetura

O código usa package-by-feature. Esta é uma pequena melhoria deliberada sobre a árvore de pacotes global
sugerida no SDD: `api`, `application`, `domain` e `infrastructure` ficam dentro de cada capability, evitando
acoplamento acidental entre casos de uso.

```text
identityaccess/
  provider/       # cadastro, validação, lifecycle, descoberta e persistência de IdPs
  federation/     # ports neutros para fluxos redirect e credentials
  identity/       # identidade canônica e normalização de atributos
  authorization/  # RBAC, resolução de entitlements e decisão deny-by-default
  token/          # port para emissão futura de tokens internos
  secrets/        # referências e resolução externa de segredos
  audit/          # contrato e persistência de eventos de segurança
  security/       # filtro HTTP, sessão, CSRF, CORS e JWT Resource Server opcional
  configuration/  # propriedades tipadas e beans transversais mínimos
  support/        # contrato uniforme de erro HTTP
```

As transações pertencem aos application services. O domínio não depende de JPA, Redis, HTTP ou Spring
Security. Controllers apenas validam/mapeiam entrada e saída. PostgreSQL armazena configuração, vínculos,
RBAC e auditoria; Redis armazena apenas sessão e cache reconstruível.

## API disponível

### Gestão local e portal

O portal oferece `/entrar` e `/seguranca`, com usuários, grupos locais, perfis, permissões,
provedores externos, vínculos de grupos, auditoria, sessões ativas e minha conta.
As chamadas passam pela rota interna `/api/identity/*`, que encaminha cookies HttpOnly e CSRF
ao endereço definido em `IDENTITY_ACCESS_SERVICE_URL` no servidor do portal.

| Método | Endpoint | Permissão |
|---|---|---|
| POST | `/api/v1/auth/login/local` | público + CSRF |
| POST | `/api/v1/me/password` | sessão + senha atual + CSRF |
| GET / POST | `/api/v1/security/users` | `identity:read` / `identity:write` + `role:write` |
| PUT | `/api/v1/security/users/{subject}` | `identity:write` + `role:write` |
| POST | `/api/v1/security/users/{subject}/password` | `identity:write` + `role:write` |
| GET / POST / PUT / DELETE | `/api/v1/security/roles[/{key}]` | `role:read` / `role:write` |
| GET / POST / DELETE | `/api/v1/security/permissions[/{key}]` | `role:read` / `role:write` |
| GET / POST / PUT / DELETE | `/api/v1/security/groups[/{key}]` | `role:read` / `role:write` |
| GET / POST / DELETE | `/api/v1/security/group-mappings[/{id}]` | `role:read` / `role:write` |
| GET | `/api/v1/security/audit?query=&outcome=&since=&limit=50&offset=0` | `audit:read` |
| POST | `/api/v1/security/audit/export` | `audit:read` + `audit:export` + CSRF; incluir nomes exige `identity:read` |
| GET | `/api/v1/security/sessions?subject=...` | `session:read` |
| DELETE | `/api/v1/security/sessions/{reference}?subject=...` | `session:revoke` |

Mutações exigem CSRF. Auditoria usa paginação e últimos 30 dias por padrão. Referências de sessão
são hashes; IDs que autenticam o navegador não são retornados. O perfil `OBS_ADMIN` e suas permissões
são protegidos. Deve permanecer um administrador local ativo. Perfis e grupos são reavaliados em cada
requisição; bloqueios e redefinições de senha encerram sessões. Cinco falhas consecutivas de login
bloqueiam temporariamente a conta por 15 minutos.

A auditoria aceita filtros combinados por intervalo, resultado, evento, usuário,
recurso, provedor, trace ID e UUID, com ordenação no servidor e instante de corte.
Exportações CSV/XLSX/JSON/PDF usam a consulta completa, registram finalidade e
recibo e omitem nomes atuais por padrão. Os limites e as decisões de governança
estão descritos em [Auditoria e LGPD](../../docs/operacao/auditoria-e-lgpd.md).

### Primeiro administrador

Em um banco vazio, forneça `BOOTSTRAP_ADMIN_USERNAME` e `BOOTSTRAP_ADMIN_PASSWORD` no ambiente ou Secret.
A senha exige ao menos 12 caracteres e no máximo 72 bytes. O primeiro início cria a conta com
`OBS_ADMIN`; inícios posteriores não sobrescrevem usuários ou senhas. Remova essas variáveis após a criação
e altere a senha em **Segurança > Minha conta**. Não existe senha compartilhada predefinida.
O script Compose gera uma senha única em `deployment/local/.env`. No Kubernetes, use um Secret;
`runtime-secret.env.example` documenta as variáveis opcionais. O identificador `local` é reservado.
Contas externas são registradas após o primeiro login federado: senha, nome e e-mail vêm do provedor,
enquanto bloqueios e permissões da plataforma permanecem locais.

### Provedores externos

| Método | Endpoint | Proteção |
|---|---|---|
| `GET` | `/api/v1/auth/providers` | público; retorna apenas providers habilitados |
| `GET` | `/api/v1/auth/csrf` | público; materializa o token CSRF |
| `GET` | `/api/v1/auth/login/{providerId}` | público; inicia SAML e responde com redirect |
| `POST` | `/api/v1/auth/login/{providerId}` | público + CSRF; login LDAP habilitado |
| `GET` | `/saml2/authenticate/{registrationId}` | público; gera o `AuthnRequest` SAML |
| `POST` | `/login/saml2/sso/{registrationId}` | público; ACS validado pelo Spring Security/OpenSAML |
| `GET` | `/saml2/service-provider-metadata/{registrationId}` | público; metadata do Service Provider |
| `POST` | `/api/v1/auth/logout` | autenticado + CSRF |
| `GET` | `/api/v1/me` | autenticado |
| `GET` | `/api/v1/providers` | `identity-provider:read` |
| `POST` | `/api/v1/providers` | `identity-provider:create` |
| `GET` | `/api/v1/providers/{id}` | `identity-provider:read` |
| `PUT` | `/api/v1/providers/{id}` | `identity-provider:update` |
| `POST` | `/api/v1/providers/{id}/validate` | `identity-provider:update` |
| `POST` | `/api/v1/providers/{id}/enable` | `identity-provider:enable` |
| `POST` | `/api/v1/providers/{id}/disable` | `identity-provider:disable` |
| `POST` | `/api/v1/authorization/evaluate` | autenticado |

O Resource Server JWT é opcional e desabilitado por padrão. Quando habilitado, valida assinatura por JWKS,
issuer e audience; somente o claim interno `permissions` vira authority. Grupos externos nunca viram
authorities diretamente.

## Configuração local

Variáveis essenciais:

```text
DB_URL=jdbc:postgresql://localhost:5432/identity_access
DB_USERNAME=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_COOKIE_SECURE=true
CORS_ALLOWED_ORIGINS=http://localhost:3000
OTEL_EXPORT_ENABLED=false
```

Para validar JWTs internos:

```text
RESOURCE_SERVER_ENABLED=true
TOKEN_ISSUER=https://identity.example
TOKEN_AUDIENCE=obs-platform
JWK_SET_URI=https://identity.example/oauth2/jwks
```

Em produção, cookies seguros e CORS explícito são obrigatórios. URLs LDAP devem usar `ldaps://`; URI de
metadata SAML e issuer OIDC devem usar HTTPS. Senhas, client secrets e chaves privadas nunca entram na
configuração: use, por exemplo, `secret://identity/oidc/client-secret`.

Os exporters OTLP ficam desligados até `OTEL_EXPORT_ENABLED=true`; nesse caso, configure os endpoints e
headers `management.opentelemetry.*`/`management.otlp.*` do collector do ambiente.

## Configuração do Microsoft Entra ID via SAML

Cadastre o provider, valide-o e então habilite-o. O `registration-id` deve ser igual ao `id` do provider para
que login, callback e configuração persistida tenham uma única identidade. Exemplo:

```json
{
  "id": "corporate-entra",
  "displayName": "Microsoft Entra ID",
  "type": "SAML",
  "priority": 10,
  "configuration": {
    "metadata-uri": "https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml?appid=<application-id>",
    "entity-id": "https://identity.example/saml2/sp",
    "registration-id": "corporate-entra",
    "assertion-consumer-service-location": "{baseUrl}/login/saml2/sso/{registrationId}",
    "metadata-connect-timeout-ms": "5000",
    "metadata-request-timeout-ms": "10000",
    "metadata-maximum-bytes": "1048576",
    "metadata-cache-ttl-ms": "3600000"
  },
  "attributeMappings": {
    "subject": "http://schemas.microsoft.com/identity/claims/objectidentifier",
    "username": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "displayName": "http://schemas.microsoft.com/identity/claims/displayname",
    "groups": "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups"
  }
}
```

O `entity-id` deve coincidir com o Identifier configurado no Enterprise Application do Entra. A Reply URL é
a URL pública resultante de `assertion-consumer-service-location`, por exemplo
`https://identity.example/login/saml2/sso/corporate-entra`. O gateway precisa encaminhar `/saml2` e
`/login/saml2` ao `identity-access-service`; o manifesto Kubernetes deste repositório já contém essas rotas.

Por padrão, o metadata é renovado a cada hora. Se uma renovação falhar, o processo mantém apenas o último
registro previamente validado e tenta novamente após um minuto. Uma alteração na versão/configuração do
provider nunca reutiliza o registro anterior. O metadata precisa conter certificado de verificação do IdP.

Para assinar `AuthnRequest`, adicione `sign-authn-requests=true` e o par de referências
`signing-private-key-reference`/`signing-certificate-reference`. Assertions criptografadas usam o par
`decryption-private-key-reference`/`decryption-certificate-reference`. As chaves devem ser PKCS#8 PEM não
criptografadas e ficam fora do banco, resolvidas pelo mecanismo `secret://`; por exemplo,
`secret://identity/saml/signing-key` corresponde a `OBS_SECRET_IDENTITY_SAML_SIGNING_KEY`.

O callback é a única exceção de CSRF baseada no protocolo, registrada pelo suporte SAML do Spring Security.
Assinatura, issuer, destination, audience, condições temporais e correlação da resposta são validados antes de
os atributos chegarem ao caso de uso. A sessão contém somente o principal canônico, claims seguros normalizados
e permissões internas, nunca a resposta ou a assertion SAML.

## Configuração de um provider LDAP

Um provider LDAP permanece em `DRAFT` até ser validado e habilitado. Exemplo de configuração administrativa:

```json
{
  "id": "corporate-ldap",
  "displayName": "LDAP Corporativo",
  "type": "LDAP",
  "priority": 10,
  "configuration": {
    "url": "ldaps://ldap.example:636",
    "base-dn": "dc=example,dc=org",
    "user-search-base": "ou=people",
    "user-search-filter": "(uid={0})",
    "group-search-base": "ou=groups",
    "group-search-filter": "(member={0})",
    "group-role-attribute": "cn",
    "bind-dn": "cn=obs-service,ou=services,dc=example,dc=org",
    "bind-credential-reference": "secret://identity/ldap/bind-password",
    "trust-certificate-reference": "secret://identity/ldap/trust-certificate",
    "connection-timeout-ms": "5000",
    "read-timeout-ms": "10000"
  },
  "attributeMappings": {
    "subject": "uid",
    "username": "uid",
    "email": "mail",
    "displayName": "cn",
    "groups": "memberOf"
  }
}
```

A referência `secret://identity/ldap/bind-password` é resolvida pela variável
`OBS_SECRET_IDENTITY_LDAP_BIND_PASSWORD`. No cluster, inclua essa variável no Secret
`identity-access-service-runtime`, junto das conexões do banco e do Redis. Para certificados,
adicione também `OBS_SECRET_IDENTITY_LDAP_TRUST_CERTIFICATE` com o conteúdo PEM. Consulte o
[guia de deployment](deployment/README.md) para carregar essas variáveis no contexto e namespace
escolhidos, preservando as chaves existentes do Secret.

O frontend deve obter `/api/v1/auth/csrf` e enviar o token no header retornado ao chamar o login. Credenciais
de usuário são mantidas somente durante o bind, apagadas dos arrays mutáveis e nunca persistidas ou auditadas.

## Build e testes

```powershell
.\mvnw.cmd clean verify
```

Os testes de integração sobem PostgreSQL 18 e Redis 8 com Testcontainers e são ignorados automaticamente
quando um runtime de containers não estiver disponível. O artefato padronizado é `target/app.jar`.

`SecurityAdministrationIntegrationTest` executa HTTP real com PostgreSQL e Redis. Configure
`IAM_INTEGRATION_DB_URL`, `IAM_INTEGRATION_DB_USERNAME`, `IAM_INTEGRATION_DB_PASSWORD` e
`IAM_INTEGRATION_REDIS_PORT` (padrão `56379`) antes de `./mvnw test`.
Use um banco vazio e descartável: o teste aplica migrations e cria seus próprios usuários.
Ele valida CSRF, login local, grupos, atualização de permissões, bloqueios, revogação,
troca de senha, último administrador, auditoria e referências de segredos redigidas.

## SonarQube

O build gera automaticamente o relatório XML do JaCoCo em `target/site/jacoco/jacoco.xml`. A chave, o nome
do projeto e a URL local do SonarQube estão no `pom.xml`; o token nunca deve ser salvo no repositório.

No PowerShell, forneça o token apenas pela variável de ambiente e execute a análise a partir desta pasta:

```powershell
$env:SONAR_TOKEN = '<token-gerado-no-sonarqube>'
.\mvnw.cmd clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar
Remove-Item Env:SONAR_TOKEN
```

Para usar outra instância sem alterar o projeto, sobrescreva somente a URL:

```powershell
.\mvnw.cmd clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar `
  -Dsonar.host.url=https://sonarqube.example.com
```

## Execução e deployment

Este componente possui scripts e manifestos próprios. Consulte o [guia de deployment](deployment/README.md) para executar em containers locais ou publicar em um cluster Kubernetes específico.

```powershell
.\scripts\deploy\local.ps1 -Engine docker
.\scripts\deploy\rollout.ps1 -Context meu-cluster -Namespace observabilidade -Image registry.example.com/equipe/identity-access-service:1.0.0
```
