# Identity Access Service

Serviço central de identidade, federação e autorização da plataforma OBS. Esta implementação segue o
[`obs-identity-access-service-sdd.md`](../../docs/arquitetura-tecnica/sdd/obs-identity-access-service-sdd.md)
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
`OBS_SECRET_IDENTITY_LDAP_BIND_PASSWORD`. No Kubernetes local, crie o Secret opcional consumido pelo
Deployment:

```shell
kubectl create secret generic identity-access-secrets \
  --namespace observabilidade-portal \
  --from-literal=OBS_SECRET_IDENTITY_LDAP_BIND_PASSWORD='<senha>' \
  --from-file=OBS_SECRET_IDENTITY_LDAP_TRUST_CERTIFICATE='./ldap-ca.pem'
```

O frontend deve obter `/api/v1/auth/csrf` e enviar o token no header retornado ao chamar o login. Credenciais
de usuário são mantidas somente durante o bind, apagadas dos arrays mutáveis e nunca persistidas ou auditadas.

## Build e testes

```powershell
.\mvnw.cmd clean verify
```

Os testes de integração sobem PostgreSQL 18 e Redis 8 com Testcontainers e são ignorados automaticamente
quando um runtime de containers não estiver disponível. O artefato padronizado é `target/app.jar`.

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
