# OBS Identity Access Service — Spec Driven Development

> **Status:** Draft v1  
> **Artifact:** `identity-access-service`  
> **Group:** `com.porto.ciops.coa.obs`  
> **Base package:** `com.porto.ciops.coa.obs.identityaccess`  
> **Target runtime:** Java 25 + Spring Boot 4.1.x  
> **Architecture style:** Modular Monolith / Hexagonal boundaries inside one independently deployable service  
> **Primary role:** Identity Federation + Authentication Broker + Authorization Plane for the OBS Platform

---

## 1. Purpose

The `identity-access-service` is the centralized identity and access component of the OBS Platform.

Its purpose is to provide a vendor-neutral identity layer capable of integrating multiple authentication and identity sources without coupling OBS applications and services to a specific Identity Provider (IdP).

The platform must support, at minimum:

- Microsoft Entra ID using SAML 2.0
- Generic SAML 2.0 Identity Providers
- Generic OpenID Connect / OAuth 2.0 Identity Providers
- Corporate LDAP / Active Directory through LDAPS
- Local LDAP through LDAPS
- Additional future Identity Providers through well-defined extension points
- Internal authorization using roles, permissions, scopes and policies
- Identity normalization across heterogeneous providers
- Internal OBS access tokens for service interoperability, when enabled
- Session-based authentication for browser clients
- JWT validation for protected REST APIs
- Auditing and observability of authentication and authorization flows

The implementation **must not depend on Microsoft MSAL**.

---

## 2. Architectural Principles

### 2.1 Vendor neutrality

The domain model must be based on authentication protocols and identity concepts, not vendor SDKs.

Allowed abstractions:

- SAML
- OIDC
- OAuth 2.0
- LDAP / LDAPS
- JWT
- RBAC
- ABAC
- Identity Federation

Avoid core-domain dependencies such as:

- `MicrosoftEntraAuthenticationService`
- `AzureAuthenticationService`
- `KeycloakAuthenticationService`
- `OktaAuthenticationService`

Vendor-specific behavior must be isolated behind adapters.

---

## 2.2 Authentication is not authorization

Authentication answers:

> Who is the principal?

Authorization answers:

> What is the principal allowed to do?

The service must maintain a strict separation between:

- Authentication
- Identity resolution
- Identity enrichment
- Identity normalization
- Authorization
- Token/session issuance
- Auditing

External IdP groups must not automatically become OBS permissions.

Example:

```text
Entra Group
    |
    v
GRP_OBS_OPERATIONS
    |
    v
OBS Role Mapping
    |
    v
OBS_OPERATOR
    |
    +--> dashboard:read
    +--> dashboard:write
    +--> topology:read
    +--> problem:read
```

---

## 2.3 OBS services must not depend directly on external IdPs

The desired dependency direction is:

```text
OBS Services
     |
     v
OBS Identity Contract
     |
     v
identity-access-service
     |
     +--> Microsoft Entra ID
     +--> LDAP
     +--> OIDC IdP
     +--> Generic SAML IdP
```

Individual OBS services must not implement Entra, LDAP or SAML integrations.

---

## 2.4 Avoid a central authorization call on every request

The `identity-access-service` must not become a mandatory synchronous network hop for every OBS request.

Prefer:

- local JWT validation
- local role/scope validation
- cached authorization data
- cached policy decisions when appropriate

Remote policy evaluation is allowed only for authorization decisions that cannot safely be represented by local token claims or cached policy data.

---

## 2.5 Synchronous application model

The initial implementation must use:

- Spring MVC
- Java Virtual Threads
- synchronous programming model
- `RestClient` for synchronous HTTP integrations

Do not introduce WebFlux or reactive persistence unless a future performance profile demonstrates a concrete need.

---

## 3. Technology Baseline

### Runtime

- Java 25
- Spring Boot 4.1.x
- Maven
- PostgreSQL
- Redis
- Flyway

### Spring capabilities

- Spring MVC
- Spring Security
- OAuth2 Client
- OAuth2 Resource Server
- OAuth2 Authorization Server
- SAML 2.0 Service Provider
- Spring LDAP
- Spring Security LDAP
- Spring Session Redis
- Spring Cache
- Bean Validation
- Actuator
- OpenTelemetry
- Testcontainers

---

## 4. Maven Dependency Baseline

The project should contain, at minimum:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-restclient</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-oauth2-client</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-oauth2-resource-server</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-oauth2-authorization-server</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security-saml2</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-ldap</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-ldap</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>

<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-session-data-redis</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-opentelemetry</artifactId>
</dependency>
```

Test dependencies should include Spring-specific test starters already generated by Spring Initializr plus:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

Do not add Lombok, MapStruct or vendor-specific authentication SDKs by default.

---

## 5. High-Level Architecture

```text
                            +------------------------+
                            |      OBS Frontend      |
                            +-----------+------------+
                                        |
                                        | Browser Session / API
                                        v
                     +--------------------------------------+
                     |      identity-access-service         |
                     |                                      |
                     |  Identity Federation / Broker        |
                     |  Identity Normalization              |
                     |  Authorization                       |
                     |  Entitlements                        |
                     |  Session Management                  |
                     |  Token Issuance                      |
                     |  Audit                               |
                     +-----------+--------------+-----------+
                                 |              |
                 +---------------+              +----------------+
                 |                                               |
                 v                                               v
       +------------------+                           +----------------------+
       | External IdPs    |                           | Platform Storage     |
       |                  |                           |                      |
       | Entra SAML       |                           | PostgreSQL           |
       | Generic SAML     |                           | Redis                |
       | Generic OIDC     |                           | Secret References    |
       | LDAP / AD        |                           +----------------------+
       +------------------+
                                 |
                                 v
                     +---------------------------+
                     | Internal OBS Identity     |
                     | Principal / Session / JWT |
                     +-------------+-------------+
                                   |
                  +----------------+----------------+
                  |                |                |
                  v                v                v
              Service A        Service B        Service C
```

---

## 6. Identity Provider Model

The platform must model providers through protocol-oriented abstractions.

### Provider types

```java
public enum ProviderType {
    SAML,
    OIDC,
    LDAP
}
```

Do not encode vendors as provider types.

Vendor-specific presets may exist separately.

Example:

```text
Protocol: SAML
Preset: Microsoft Entra ID

Protocol: OIDC
Preset: Keycloak

Protocol: LDAP
Preset: Microsoft Active Directory
```

---

## 7. Provider Capability Model

Not every provider has the same interaction model.

Define capability-oriented abstractions.

```java
public interface IdentityProvider {
    ProviderId id();
    ProviderType type();
    ProviderStatus status();
}
```

```java
public interface RedirectIdentityProvider extends IdentityProvider {
    AuthenticationRedirect beginAuthentication(AuthenticationContext context);
    AuthenticationResult completeAuthentication(AuthenticationCallback callback);
}
```

Applicable to:

- SAML
- OIDC

Define credential-oriented authentication separately:

```java
public interface CredentialIdentityProvider extends IdentityProvider {
    AuthenticationResult authenticate(CredentialAuthenticationRequest request);
}
```

Applicable to:

- LDAP

Do not force all providers into a single `authenticate(username, password)` contract.

---

## 8. Provider Registry

Implement a registry responsible for resolving providers dynamically.

```java
public interface IdentityProviderRegistry {

    Optional<IdentityProvider> findById(ProviderId providerId);

    List<IdentityProvider> findEnabled();

    List<IdentityProvider> findByType(ProviderType type);
}
```

The registry must not expose Spring implementation details to the domain layer.

---

## 9. Identity Normalization

All external identities must be transformed into a canonical OBS identity.

Example domain model:

```java
public record FederatedIdentity(
    String externalSubject,
    ProviderId providerId,
    ProviderType providerType,
    Map<String, Object> attributes
) {}
```

Canonical model:

```java
public record PlatformIdentity(
    String subject,
    String username,
    String email,
    String displayName,
    String providerId,
    Set<String> groups,
    Set<String> roles,
    Set<String> permissions,
    Map<String, Object> attributes
) {}
```

Define normalization as a dedicated port:

```java
public interface IdentityNormalizer {
    PlatformIdentity normalize(FederatedIdentity federatedIdentity);
}
```

No controller or provider adapter may implement authorization mapping directly.

---

## 10. Identity Attribute Mapping

External providers expose different attribute names.

Examples:

### Microsoft Entra SAML

```text
NameID
emailaddress
givenname
surname
objectidentifier
groups
```

### LDAP

```text
uid
cn
mail
memberOf
employeeNumber
department
```

### OIDC

```text
sub
preferred_username
email
name
groups
```

The platform must support configurable attribute mappings.

Example conceptual configuration:

```yaml
identity:
  providers:
    corporate-entra:
      type: SAML
      mappings:
        subject: objectidentifier
        username: emailaddress
        email: emailaddress
        display-name: name
        groups: groups
```

Mappings must be validated during provider activation.

---

## 11. Microsoft Entra ID — SAML Architecture

Microsoft Entra ID acts as the Identity Provider.

`identity-access-service` acts as the SAML Service Provider / Relying Party.

```text
Browser
   |
   | GET /auth/login/corporate-entra
   v
identity-access-service
   |
   | SAML AuthnRequest
   v
Microsoft Entra ID
   |
   | User authentication
   | MFA
   | Conditional Access
   |
   | SAML Response
   v
identity-access-service
   |
   +--> validate signature
   +--> validate issuer
   +--> validate audience
   +--> validate destination
   +--> validate temporal conditions
   +--> validate InResponseTo
   |
   v
FederatedIdentity
   |
   v
IdentityNormalizer
   |
   v
PlatformIdentity
```

The implementation must use Spring Security SAML support.

MSAL must not be used.

SAML assertions must never be forwarded to downstream OBS services.

---

## 12. OIDC Architecture

For OIDC providers:

```text
Browser
   |
   v
identity-access-service
   |
   | Authorization Code + PKCE
   v
OIDC Provider
   |
   v
identity-access-service
   |
   +--> validate issuer
   +--> validate nonce
   +--> validate state
   +--> validate ID Token
   +--> resolve claims
   |
   v
FederatedIdentity
   |
   v
PlatformIdentity
```

Use Spring Security OAuth2 Client.

Do not create custom OAuth/OIDC protocol implementations.

---

## 13. LDAP Architecture

LDAP authentication must use LDAPS in production.

```text
Browser
   |
   | credentials
   v
identity-access-service
   |
   v
CredentialIdentityProvider
   |
   v
Spring Security LDAP
   |
   | LDAPS
   v
LDAP / Active Directory
```

LDAP provider configuration must support:

- LDAP URL
- Base DN
- User search base
- User search filter
- Group search base
- Group search filter
- Bind DN
- Secret reference
- Connection timeout
- Read timeout
- TLS certificate/trust configuration

Passwords must never be persisted by the service.

Bind credentials must be referenced through an external secret mechanism.

---

## 14. Authentication Provider Discovery

The frontend must not have hard-coded knowledge of configured providers.

Expose an endpoint:

```http
GET /api/v1/auth/providers
```

Example response:

```json
[
  {
    "id": "corporate-entra",
    "displayName": "Microsoft Entra ID",
    "type": "SAML",
    "interaction": "REDIRECT"
  },
  {
    "id": "corporate-ldap",
    "displayName": "LDAP Corporativo",
    "type": "LDAP",
    "interaction": "CREDENTIALS"
  }
]
```

Only enabled providers must be returned.

Never expose:

- client secrets
- bind passwords
- private keys
- provider signing secrets
- internal metadata not needed by the client

---

## 15. Browser Authentication Strategy

Prefer a Backend-for-Frontend-compatible browser security model.

After successful authentication:

- create an authenticated server-side session
- persist session state in Redis
- send a secure session cookie to the browser

Cookie requirements:

- `HttpOnly=true`
- `Secure=true`
- appropriate `SameSite`
- defined path
- finite TTL

Do not require browser JavaScript to persist long-lived access tokens in local storage.

---

## 16. Internal OAuth2 / Token Strategy

When internal token issuance is enabled, the service acts as an OAuth2 Authorization Server for the OBS Platform.

External authentication protocol:

```text
SAML / OIDC / LDAP
```

must be decoupled from the internal interoperability protocol:

```text
OAuth2 / JWT
```

Example:

```text
Microsoft Entra
      |
      | SAML
      v
identity-access-service
      |
      | normalize identity
      v
PlatformIdentity
      |
      | issue internal access token
      v
OBS Service
```

Internal services must validate tokens using standard Resource Server capabilities.

---

## 17. Internal JWT Contract

The initial canonical token should contain a minimal, controlled claim set.

Example:

```json
{
  "iss": "https://identity.obs.example",
  "sub": "5af2b2af-...",
  "aud": ["obs-platform"],
  "preferred_username": "user@example.com",
  "provider": "corporate-entra",
  "roles": [
    "OBS_OPERATOR"
  ],
  "permissions": [
    "dashboard:read",
    "topology:read"
  ]
}
```

Do not include unnecessary PII.

Do not place large group sets or volatile authorization state in tokens without a documented limit and expiry strategy.

---

## 18. Token Security Requirements

Access tokens must:

- have short expiration
- use asymmetric signing
- use managed signing keys
- support key rotation
- expose public verification keys through JWKS where applicable
- validate issuer
- validate audience
- validate expiration
- validate signature

Never log:

- access tokens
- refresh tokens
- ID tokens
- SAML assertions
- passwords
- bind credentials
- private keys

---

## 19. Authorization Model

The platform must initially support RBAC.

Domain concepts:

```text
User / Principal
Role
Permission
Group Mapping
Role Mapping
Policy
Resource
Action
```

Example:

```text
Role: OBS_OPERATOR

Permissions:
- dashboard:read
- dashboard:write
- topology:read
- problem:read
```

Permission naming convention:

```text
<resource>:<action>
```

Examples:

```text
dashboard:read
dashboard:create
dashboard:update
dashboard:delete

topology:read

identity-provider:read
identity-provider:create
identity-provider:update

role:read
role:assign
```

---

## 20. Future ABAC Support

The domain must not prevent future ABAC support.

Possible attributes:

- environment
- tenant
- business unit
- ownership
- application
- criticality
- time window
- principal attributes

Future example:

```text
ALLOW dashboard:update

WHEN
  principal.role == OBS_OPERATOR
  AND resource.environment != PROD
```

Do not implement a full ABAC engine in the first iteration unless explicitly requested.

---

## 21. Local Authorization vs Central Policy Evaluation

Use local authorization for common permission checks.

Example:

```java
@PreAuthorize("hasAuthority('dashboard:write')")
```

Central policy evaluation should be reserved for decisions requiring dynamic resource context.

The design must permit a future Policy Decision Point without requiring it on every request.

---

## 22. Persistence Model

PostgreSQL is the system of record for platform identity configuration.

Initial entities should include:

```text
identity_provider
provider_attribute_mapping
platform_identity
external_identity_link
role
permission
role_permission
principal_role
group_role_mapping
authorization_policy
audit_event
```

Not all entities need to be implemented in milestone 1.

---

## 23. Suggested Provider Table

Conceptual schema:

```text
identity_provider
------------------------------
id
provider_key
display_name
provider_type
enabled
priority
configuration
created_at
updated_at
version
```

Sensitive values must not be persisted directly inside generic JSON configuration.

Use secret references.

Example:

```text
secret://vault/obs/identity/ldap/corporate-bind
```

---

## 24. Secret Management

The domain must model secret references, not raw secrets.

Example:

```java
public record SecretReference(String value) {}
```

Do not introduce a hard dependency on one secret vendor.

Provide a port:

```java
public interface SecretResolver {
    SecretValue resolve(SecretReference reference);
}
```

Possible future adapters:

- HashiCorp Vault
- CyberArk
- Azure Key Vault
- Kubernetes Secret
- environment-backed local development resolver

---

## 25. Redis Responsibilities

Redis should initially be used for:

- browser sessions
- authorization caches
- provider metadata cache
- transient authentication state
- replay protection when necessary
- short-lived provider discovery metadata

Redis is not the system of record.

---

## 26. Cache Rules

Cache only data whose invalidation strategy is explicitly defined.

Candidates:

```text
permission-set
role-resolution
provider-metadata
jwks
authorization-decision
```

Every cache must define:

- TTL
- key format
- invalidation trigger
- fallback behavior
- maximum stale tolerance

Security-sensitive caches must fail safely.

---

## 27. Package Architecture

Use package-by-capability with internal architectural boundaries.

Recommended structure:

```text
com.porto.ciops.coa.obs.identityaccess
|
+-- api
|   +-- authentication
|   +-- authorization
|   +-- provider
|   +-- administration
|
+-- application
|   +-- authentication
|   +-- authorization
|   +-- federation
|   +-- identity
|   +-- provider
|
+-- domain
|   +-- identity
|   +-- provider
|   +-- authorization
|   +-- policy
|   +-- audit
|
+-- infrastructure
    +-- security
    |   +-- saml
    |   +-- oidc
    |   +-- ldap
    |   +-- oauth2
    |
    +-- persistence
    |   +-- jpa
    |   +-- redis
    |
    +-- secrets
    +-- observability
    +-- configuration
```

Do not organize the entire application only by technical layers such as:

```text
controller
service
repository
model
```

at the project root.

---

## 28. Domain Ports

The first iteration should introduce explicit interfaces such as:

```java
public interface IdentityProviderRegistry {
    Optional<IdentityProvider> findById(ProviderId providerId);
}
```

```java
public interface IdentityNormalizer {
    PlatformIdentity normalize(FederatedIdentity identity);
}
```

```java
public interface IdentityRepository {
    Optional<PlatformIdentity> findBySubject(String subject);
    PlatformIdentity save(PlatformIdentity identity);
}
```

```java
public interface AuthorizationService {
    AuthorizationDecision authorize(AuthorizationRequest request);
}
```

```java
public interface TokenIssuer {
    IssuedToken issue(TokenRequest request);
}
```

```java
public interface AuditPublisher {
    void publish(AuditEvent event);
}
```

Infrastructure adapters implement these ports.

---

## 29. API Conventions

Base path:

```text
/api/v1
```

Suggested initial endpoints:

```text
GET  /api/v1/auth/providers

GET  /api/v1/auth/login/{providerId}
POST /api/v1/auth/login/{providerId}

POST /api/v1/auth/logout

GET  /api/v1/me

GET  /api/v1/providers
POST /api/v1/providers
GET  /api/v1/providers/{providerId}
PUT  /api/v1/providers/{providerId}
POST /api/v1/providers/{providerId}/enable
POST /api/v1/providers/{providerId}/disable

GET  /api/v1/roles
POST /api/v1/roles

GET  /api/v1/permissions

POST /api/v1/authorization/evaluate
```

Protocol-specific callback endpoints may be managed by Spring Security and should not be unnecessarily reimplemented.

---

## 30. Error Contract

Use a single error response contract based on RFC 9457 Problem Details where practical.

Example:

```json
{
  "type": "https://obs.example/problems/identity-provider-unavailable",
  "title": "Identity provider unavailable",
  "status": 503,
  "detail": "The configured identity provider is currently unavailable.",
  "instance": "/api/v1/auth/login/corporate-entra",
  "traceId": "..."
}
```

Do not expose:

- stack traces
- LDAP internals
- SAML assertion content
- secret references
- database details
- certificate private material

---

## 31. Validation

Use Bean Validation for API requests and configuration.

Examples:

- non-empty provider names
- valid provider type
- valid HTTPS metadata URI
- LDAPS enforcement for production LDAP
- unique provider key
- valid redirect URI
- valid Base DN
- non-empty mapping for subject identifier

Provider activation must fail validation if required configuration is incomplete.

---

## 32. Security Configuration

Security configuration must be split by responsibility.

Suggested components:

```text
ApiSecurityConfiguration
BrowserSecurityConfiguration
SamlSecurityConfiguration
OidcSecurityConfiguration
LdapSecurityConfiguration
AuthorizationServerConfiguration
ResourceServerConfiguration
SessionSecurityConfiguration
```

Avoid a single massive `SecurityConfig`.

---

## 33. CSRF

Browser session endpoints must keep CSRF protection enabled.

Do not globally disable CSRF for convenience.

Stateless bearer-token APIs may use an isolated security chain with the appropriate CSRF strategy.

---

## 34. CORS

CORS must:

- be configurable
- use explicit allowed origins
- never default to `*` when credentials are enabled
- be environment-specific

---

## 35. Session Security

Session management must include:

- session fixation protection
- explicit inactivity timeout
- maximum session lifetime
- Redis-backed storage
- logout invalidation
- invalidation after critical security events where required

---

## 36. Observability

The service must be observable from the first production-ready iteration.

Use:

- Spring Boot Actuator
- OpenTelemetry
- structured application logs
- metrics
- traces
- audit events

---

## 37. Required Health Signals

At minimum expose:

```text
/actuator/health
/actuator/health/liveness
/actuator/health/readiness
```

Custom health indicators may include:

```text
postgres
redis
provider:corporate-entra
provider:corporate-ldap
```

A transient external IdP failure must not necessarily make Kubernetes liveness fail.

Liveness must represent whether the application process is healthy.

Readiness may account for required runtime dependencies.

---

## 38. Telemetry Naming

Suggested spans:

```text
identity.authenticate
identity.provider.resolve
identity.normalize

identity.saml.authenticate
identity.oidc.authenticate
identity.ldap.authenticate

authorization.evaluate
authorization.roles.resolve
authorization.permissions.resolve

token.issue
token.refresh
token.revoke
```

Allowed attributes may include:

```text
identity.provider.id
identity.provider.type
auth.result
authorization.result
authorization.resource
authorization.action
```

Do not include secrets or authentication payloads.

---

## 39. Audit Requirements

Audit is distinct from telemetry.

The following events should be auditable:

- successful authentication
- failed authentication
- logout
- provider created
- provider updated
- provider enabled
- provider disabled
- role created
- permission mapping changed
- role assigned
- role revoked
- policy changed
- privileged authorization denied

Audit records should include:

- timestamp
- event type
- actor subject
- target
- provider id when applicable
- outcome
- trace/correlation id
- source context where appropriate

Never persist raw passwords, tokens or assertions in audit events.

---

## 40. Flyway

Database changes must be performed exclusively through versioned Flyway migrations.

Example:

```text
db/migration/
  V001__create_identity_provider.sql
  V002__create_roles_and_permissions.sql
  V003__create_identity_mapping.sql
```

Do not use:

```properties
spring.jpa.hibernate.ddl-auto=update
```

in production.

---

## 41. Testing Strategy

### Unit tests

Required for:

- identity normalization
- role mapping
- permission resolution
- provider validation
- authorization decisions
- attribute mappings

### Integration tests

Use Testcontainers for:

- PostgreSQL
- Redis where practical
- LDAP where practical

Test:

- Flyway migration execution
- JPA constraints
- unique provider keys
- transaction behavior
- session persistence
- cache behavior

### Security integration tests

Test:

- anonymous access restrictions
- authenticated access
- role/permission enforcement
- CSRF
- invalid JWT
- expired JWT
- incorrect issuer
- incorrect audience
- SAML callback failure
- disabled provider
- LDAP authentication failure

### Contract tests

Define contracts for:

```text
GET /api/v1/auth/providers
GET /api/v1/me
POST /api/v1/authorization/evaluate
```

---

## 42. Provider Configuration Lifecycle

Provider lifecycle:

```text
DRAFT
  |
  v
VALIDATED
  |
  v
ENABLED
  |
  +--> DISABLED
  |
  +--> ERROR
```

A provider must not be enabled until its configuration is successfully validated.

Validation may include:

- metadata reachability
- certificate validation
- LDAP bind test
- LDAP user search test
- OIDC discovery retrieval
- required claim presence

---

## 43. Provider Administration Security

Provider administration endpoints must require privileged permissions.

Example:

```text
identity-provider:read
identity-provider:create
identity-provider:update
identity-provider:enable
identity-provider:disable
```

Authentication-provider management is a high-impact security operation.

All modifications must be audited.

---

## 44. Secret Redaction

All configuration serialization must redact secrets.

Bad:

```json
{
  "bindPassword": "Password123"
}
```

Acceptable:

```json
{
  "bindCredential": {
    "secretReference": "secret://vault/obs/ldap/corporate"
  }
}
```

Logs must never serialize security configuration indiscriminately.

---

## 45. Failure Behavior

Define explicit behavior for dependency failures.

### PostgreSQL unavailable

- service should become unready if required for operation
- do not claim successful authentication if identity persistence is required and fails

### Redis unavailable

Behavior depends on feature:

- browser sessions may become unavailable
- cache failure should fall back to authoritative source when safe
- never allow authorization because the cache failed

### IdP unavailable

- fail only the affected authentication provider when possible
- other providers should remain usable
- return controlled errors
- produce telemetry and audit events

### LDAP unavailable

- fail authentication safely
- do not fall back to another user with matching username automatically

---

## 46. Security Defaults

The application must default to secure behavior.

Rules:

- providers disabled until valid
- deny by default
- TLS for external identity traffic
- LDAPS in production
- short-lived tokens
- asymmetric JWT signatures
- CSRF enabled for browser sessions
- no wildcard CORS with credentials
- no secrets in logs
- no tokens in telemetry
- no raw SAML assertions in persistence
- no MSAL
- no vendor-specific identity model in domain

---

## 47. Configuration Properties

Use typed configuration properties.

Example:

```java
@ConfigurationProperties(prefix = "obs.identity")
public record IdentityAccessProperties(
    SessionProperties session,
    TokenProperties token,
    SecurityProperties security
) {}
```

Do not spread raw `@Value` expressions throughout the codebase.

Use Spring Configuration Processor.

---

## 48. Virtual Threads

Enable virtual threads for the synchronous service model.

Expected configuration:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

The application code should remain imperative unless a specific integration mandates otherwise.

---

## 49. Initial Milestones

### Milestone 1 — Foundation

Implement:

- project/package architecture
- PostgreSQL
- Redis
- Flyway
- Security baseline
- Actuator
- OpenTelemetry
- canonical error model
- provider domain model
- provider registry
- identity normalization interfaces
- authorization domain model
- initial test infrastructure

Acceptance:

- application starts locally
- migrations run successfully
- health endpoints work
- integration tests use containers
- no vendor SDK exists in core domain

---

### Milestone 2 — Provider Administration

Implement:

- provider CRUD
- provider lifecycle
- provider validation
- provider enable/disable
- provider discovery API
- audit events

Acceptance:

```http
GET /api/v1/auth/providers
```

returns only enabled providers.

Provider secrets are never returned.

---

### Milestone 3 — LDAP Authentication

Implement:

- LDAP provider
- LDAPS
- configurable searches
- identity attribute mapping
- group extraction
- identity normalization
- browser session creation

Acceptance:

- corporate/local LDAP can be configured independently
- LDAP provider can authenticate a valid user
- invalid credentials fail safely
- raw credentials are never persisted
- authentication event is audited

---

### Milestone 4 — Microsoft Entra SAML SSO

Implement:

- SAML provider adapter
- Entra-compatible metadata configuration
- SAML login initiation
- SAML callback handling
- assertion validation through Spring Security
- attribute mapping
- normalized identity
- session creation

Acceptance:

- user can select Microsoft Entra from provider list
- browser redirects to Entra
- successful SSO returns authenticated user to OBS
- normalized `/api/v1/me` response is independent of SAML
- SAML assertion is not exposed downstream

---

### Milestone 5 — Generic OIDC

Implement:

- OIDC provider adapter
- discovery document support
- authorization code flow
- PKCE
- state/nonce handling
- claim normalization

Acceptance:

- generic standards-compliant OIDC provider can be configured without application code changes

---

### Milestone 6 — RBAC

Implement:

- roles
- permissions
- role-permission mapping
- principal-role mapping
- external-group-to-role mapping
- Spring Security authority conversion

Acceptance:

- external IdP group names do not become OBS authorities directly
- authorization is based on normalized OBS roles/permissions

---

### Milestone 7 — Internal OBS Token Issuance

Implement only after the browser authentication and authorization model is stable.

Implement:

- Authorization Server configuration
- asymmetric signing keys
- JWKS
- internal audience
- token claim customization
- Resource Server reference integration

Acceptance:

- OBS service can validate a token locally
- downstream service does not query Entra/LDAP for each request
- downstream service does not need provider-specific libraries

---

## 50. Explicit Non-Goals for the First Iteration

Do not implement initially:

- custom password database
- custom MFA
- custom cryptographic protocols
- SAML implementation from scratch
- OAuth implementation from scratch
- user password storage
- full ABAC policy language
- SCIM provisioning unless separately specified
- Microsoft Graph integration unless separately specified
- Keycloak-specific implementation in core
- WebFlux
- R2DBC
- reactive Redis
- vendor-specific identity APIs

---

## 51. Definition of Done

A feature is complete only when:

- domain behavior is implemented
- API contract is documented
- validation exists
- authorization exists
- audit implications are handled
- observability is implemented
- unit tests exist
- integration tests exist where relevant
- secrets are redacted
- error responses follow the standard contract
- no provider-specific behavior leaks into unrelated modules

---

## 52. Coding Rules for Codex

When implementing this specification, Codex must:

1. Preserve package boundaries.
2. Prefer domain interfaces over infrastructure coupling.
3. Never introduce MSAL.
4. Never add vendor-specific SDKs unless a later specification explicitly authorizes them.
5. Prefer Spring Security's standard SAML/OIDC/OAuth2/LDAP support.
6. Avoid custom protocol parsing where Spring Security already supports the protocol.
7. Use constructor injection.
8. Use immutable records for request/domain value objects where appropriate.
9. Avoid static service locators.
10. Do not put business rules in controllers.
11. Do not put authorization mapping inside provider adapters.
12. Do not persist raw credentials or tokens.
13. Use typed configuration properties.
14. Use Flyway for schema changes.
15. Use PostgreSQL behavior in integration tests instead of H2 assumptions.
16. Keep the application imperative and synchronous.
17. Do not add WebFlux merely to call external HTTP services.
18. Keep security configuration modular.
19. Deny by default.
20. Add tests with each capability.
21. Keep public APIs versioned under `/api/v1`.
22. Document any architectural deviation before implementing it.

---

## 53. Suggested First Codex Task

```text
Implement Milestone 1 of this specification.

Constraints:
- Java 25
- Spring Boot 4.1.x
- Maven
- Spring MVC
- Virtual Threads
- PostgreSQL
- Redis
- Flyway
- Spring Security
- Actuator
- OpenTelemetry
- No MSAL
- No WebFlux
- No vendor-specific identity SDKs
- Do not implement Entra, LDAP or OIDC provider logic yet

Deliver:
1. package architecture
2. domain primitives
3. provider abstractions
4. provider registry abstraction
5. identity normalization abstraction
6. authorization primitives
7. standard API error model
8. baseline SecurityFilterChain organization
9. typed configuration properties
10. Flyway baseline
11. Testcontainers configuration
12. unit and integration test skeletons
13. README architecture section

Before coding, produce a short implementation plan mapped to this specification.
```

---

## 54. Architecture Decision Summary

| Decision | Choice |
|---|---|
| Runtime | Java 25 |
| Framework | Spring Boot 4.1.x |
| HTTP model | Spring MVC |
| Concurrency | Virtual Threads |
| External HTTP | RestClient |
| SAML | Spring Security SAML2 |
| OIDC | Spring Security OAuth2 Client |
| API JWT validation | OAuth2 Resource Server |
| Internal token issuance | OAuth2 Authorization Server |
| LDAP | Spring LDAP + Spring Security LDAP |
| Browser session | Spring Session + Redis |
| Primary persistence | PostgreSQL |
| Migrations | Flyway |
| Cache | Spring Cache + Redis |
| Observability | Actuator + OpenTelemetry |
| Test infrastructure | Testcontainers |
| Microsoft SDK | None |
| MSAL | Forbidden |
| Reactive stack | Not used initially |
| Identity abstraction | Protocol-oriented |
| Authorization | OBS-owned RBAC first |
| SAML propagation | Forbidden |
| Secrets | External references |
| Security default | Deny by default |

---

## 55. Architectural End State

```text
                           OBS Identity Plane

              +---------------------------------------+
              |       identity-access-service         |
              |                                       |
              |  Federation                           |
              |  Identity Normalization               |
              |  Sessions                             |
              |  Roles / Permissions                  |
              |  Authorization                        |
              |  Token Issuance                       |
              |  Audit                                |
              +-------------------+-------------------+
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
         SAML Provider        OIDC Provider       LDAP Provider
              |                   |                   |
              v                   v                   v
          Entra / IdP         Generic IdP         AD / LDAP

                                  |
                                  v
                         PlatformIdentity
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
              Browser Session               OBS JWT
                    |                           |
                    v                           v
              OBS Frontend              OBS Microservices
```

The architecture is considered successful when changing or adding an external Identity Provider does not require changes to the identity contract consumed by the OBS frontend and backend services.
