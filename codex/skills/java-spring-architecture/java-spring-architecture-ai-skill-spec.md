# Padrão de Arquitetura de Pacotes Java/Spring Boot para Times e Agentes de IA

> Documento-base para padronização de projetos Java/Spring Boot, revisão arquitetural e criação de uma **Skill para Codex/ChatGPT**.
>
> Objetivo: permitir que desenvolvedores e agentes de IA criem, alterem e revisem código usando as mesmas regras de arquitetura, nomenclatura, dependências, testes e organização de pacotes.

---

## 1. Objetivo

Este documento estabelece um padrão arquitetural para aplicações Java/Spring Boot orientado a:

- **Package by Feature**;
- modularidade;
- baixo acoplamento;
- alta coesão;
- separação entre API, aplicação, domínio e infraestrutura;
- uso consistente de `Service` e/ou `UseCase`;
- independência da lógica de negócio em relação a detalhes de framework;
- capacidade de validação automatizada da arquitetura;
- previsibilidade para desenvolvimento assistido por IA;
- facilidade de evolução para modular monolith, microservices ou arquiteturas distribuídas.

O padrão é inspirado por conceitos de:

- Domain-Driven Design;
- Clean Architecture;
- Hexagonal Architecture / Ports and Adapters;
- Patterns of Enterprise Application Architecture;
- Spring Boot;
- Spring Modulith;
- ArchUnit.

Este documento **não exige DDD completo**. O objetivo é aplicar princípios úteis de forma pragmática.

---

# 2. Regra principal

A unidade primária de organização deve ser a **feature/domínio funcional**, e não a camada técnica global.

## Recomendado

```text
br.com.empresa.project
├── customer
├── order
├── payment
├── billing
└── notification
```

Cada feature contém suas próprias camadas internas:

```text
br.com.empresa.project.customer
├── api
├── application
├── domain
└── infrastructure
```

## Evitar

```text
br.com.empresa.project
├── controller
├── service
├── repository
├── entity
├── dto
└── mapper
```

O segundo modelo cria organização por tipo técnico. Em projetos grandes, uma única alteração funcional normalmente exige navegação por diversos diretórios distantes.

---

# 3. Estrutura recomendada

```text
br.com.empresa.project
│
├── ProjectApplication.java
│
├── config
│   ├── security
│   ├── observability
│   ├── serialization
│   └── documentation
│
├── shared
│   ├── exception
│   ├── validation
│   └── kernel
│
├── customer
│   ├── api
│   │   ├── controller
│   │   ├── request
│   │   └── response
│   │
│   ├── application
│   │   ├── service
│   │   ├── usecase
│   │   ├── command
│   │   ├── query
│   │   └── mapper
│   │
│   ├── domain
│   │   ├── model
│   │   ├── valueobject
│   │   ├── repository
│   │   ├── service
│   │   ├── exception
│   │   └── event
│   │
│   └── infrastructure
│       ├── persistence
│       │   ├── entity
│       │   ├── repository
│       │   └── mapper
│       │
│       ├── client
│       ├── messaging
│       └── configuration
│
└── order
    ├── api
    ├── application
    ├── domain
    └── infrastructure
```

Nem todos os pacotes precisam existir antecipadamente.

**Regra:** criar um pacote somente quando houver uma responsabilidade concreta que justifique sua existência.

---

# 4. Dependências permitidas

A direção preferencial das dependências deve ser:

```text
API
 ↓
Application
 ↓
Domain
 ↑
Infrastructure
```

Uma representação mais precisa:

```text
              ┌──────────────────┐
              │       API        │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Application    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │      Domain      │
              └────────▲─────────┘
                       │ implements ports
              ┌────────┴─────────┐
              │ Infrastructure   │
              └──────────────────┘
```

## Regras normativas

### MUST

- `api` MUST depender de `application`, e não diretamente de detalhes de persistência.
- `application` MUST coordenar casos de uso.
- `domain` MUST concentrar regras de negócio quando houver comportamento de domínio relevante.
- interfaces que abstraem recursos externos SHOULD ficar próximas da regra que depende delas.
- implementações tecnológicas MUST ficar em `infrastructure`.
- dependências entre features SHOULD ocorrer através de contratos públicos explícitos.

### MUST NOT

- `domain` MUST NOT depender de `controller`.
- `domain` MUST NOT depender de DTO HTTP.
- `domain` SHOULD NOT depender de JPA quando a separação de domínio/persistência for adotada.
- `controller` MUST NOT acessar `JpaRepository` diretamente.
- uma feature MUST NOT acessar classes internas de outra feature.
- regras de negócio relevantes MUST NOT ficar espalhadas em controllers.

---

# 5. API Layer

Responsável pela exposição da aplicação.

Exemplos:

```text
customer/api
├── controller
│   └── CustomerController.java
├── request
│   ├── CreateCustomerRequest.java
│   └── UpdateCustomerRequest.java
└── response
    └── CustomerResponse.java
```

A API pode representar:

- REST;
- GraphQL;
- gRPC;
- consumer de mensageria;
- CLI;
- scheduler;
- interface administrativa.

O nome `api` não deve ser interpretado exclusivamente como HTTP.

---

# 6. Controller

O controller deve ser fino.

Responsabilidades permitidas:

- receber a requisição;
- realizar validações estruturais;
- converter entrada;
- chamar a camada de aplicação;
- transformar a saída;
- definir status HTTP e headers quando necessário.

## Exemplo

```java
@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
class CustomerController {

    private final CreateCustomerUseCase createCustomerUseCase;

    @PostMapping
    ResponseEntity<CustomerResponse> create(
            @Valid @RequestBody CreateCustomerRequest request) {

        var command = new CreateCustomerCommand(
                request.name(),
                request.email()
        );

        var result = createCustomerUseCase.execute(command);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(CustomerResponse.from(result));
    }
}
```

## Controller não deve

```java
@PostMapping
public CustomerEntity create(@RequestBody CustomerEntity entity) {
    if (entity.getCreditLimit().compareTo(BigDecimal.ZERO) < 0) {
        throw new IllegalArgumentException();
    }

    entity.setCreatedAt(Instant.now());

    return customerJpaRepository.save(entity);
}
```

Problemas:

- controller conhece JPA;
- regra de negócio misturada com HTTP;
- entidade de persistência exposta externamente;
- baixa testabilidade;
- alto acoplamento.

---

# 7. Request e Response

Evitar um diretório genérico contendo dezenas de `Dto`.

Preferir:

```text
api/request/CreateCustomerRequest.java
api/request/UpdateCustomerRequest.java
api/response/CustomerResponse.java
```

Exemplo:

```java
public record CreateCustomerRequest(
        @NotBlank String name,
        @Email String email
) {
}
```

```java
public record CustomerResponse(
        UUID id,
        String name,
        String email
) {
}
```

Um contrato de API não deve ser automaticamente reutilizado como:

- entidade JPA;
- objeto de domínio;
- payload interno;
- evento de domínio.

Reuso excessivo cria acoplamento entre contextos diferentes.

---

# 8. Application Layer

A camada de aplicação implementa e coordena os **casos de uso do sistema**.

Pode conter:

```text
application
├── service
├── usecase
├── command
├── query
└── mapper
```

Ela é responsável por:

- coordenar operações;
- controlar fronteiras transacionais;
- carregar agregados;
- invocar comportamento do domínio;
- chamar portas externas;
- persistir resultados;
- publicar eventos;
- retornar resultados do caso de uso.

---

# 9. Padrão Service

`Service` é apropriado quando um conjunto de operações relacionadas forma uma interface de aplicação coesa.

Exemplo:

```text
customer/application/service
└── CustomerService.java
```

```java
@Service
@RequiredArgsConstructor
@Transactional
public class CustomerService {

    private final CustomerRepository customerRepository;

    public Customer create(CreateCustomerCommand command) {
        var customer = Customer.create(
                command.name(),
                command.email()
        );

        return customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public Customer findById(UUID id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));
    }

    public Customer update(UUID id, UpdateCustomerCommand command) {
        var customer = findById(id);

        customer.updateName(command.name());

        return customerRepository.save(customer);
    }
}
```

## Quando usar Service

Usar `Service` quando:

- a feature é pequena ou média;
- os métodos formam uma API de aplicação coesa;
- a classe não está crescendo de forma excessiva;
- a lógica de orquestração é simples;
- separar cada operação em uma classe não agregaria clareza.

---

# 10. Padrão Use Case

O padrão `UseCase` representa cada ação relevante da aplicação como uma unidade explícita.

Exemplo:

```text
customer/application/usecase
├── CreateCustomerUseCase.java
├── FindCustomerUseCase.java
├── UpdateCustomerUseCase.java
└── DeleteCustomerUseCase.java
```

## Exemplo: CreateCustomerUseCase

```java
@Service
@RequiredArgsConstructor
public class CreateCustomerUseCase {

    private final CustomerRepository customerRepository;

    @Transactional
    public Customer execute(CreateCustomerCommand command) {

        if (customerRepository.existsByEmail(command.email())) {
            throw new CustomerAlreadyExistsException(command.email());
        }

        var customer = Customer.create(
                command.name(),
                command.email()
        );

        return customerRepository.save(customer);
    }
}
```

## Exemplo: FindCustomerUseCase

```java
@Service
@RequiredArgsConstructor
public class FindCustomerUseCase {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Customer execute(UUID customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(
                    () -> new CustomerNotFoundException(customerId)
                );
    }
}
```

---

# 11. Service versus UseCase

Não existe uma regra universal segundo a qual todo projeto deve usar apenas um deles.

## Service

```text
CustomerService
├── create()
├── update()
├── findById()
├── delete()
└── activate()
```

### Vantagens

- menos classes;
- simples de navegar;
- bom para CRUDs;
- familiar para equipes Spring;
- menor overhead estrutural.

### Riscos

- classes muito grandes;
- responsabilidades crescentes;
- dependências demais;
- transações heterogêneas;
- difícil evolução de features complexas.

---

## UseCase

```text
CreateCustomerUseCase
UpdateCustomerUseCase
FindCustomerUseCase
DeleteCustomerUseCase
ActivateCustomerUseCase
```

### Vantagens

- responsabilidade única;
- comportamento explícito;
- dependências mínimas por operação;
- testes pequenos;
- fácil ownership;
- melhor contexto para agentes de IA;
- alterações localizadas.

### Riscos

- explosão de classes em CRUDs triviais;
- abstrações desnecessárias;
- navegação excessiva em sistemas simples.

---

# 12. Regra de decisão para Service vs UseCase

A IA e o desenvolvedor SHOULD aplicar a seguinte heurística.

## Usar `Service` quando

- feature simples;
- operações predominantemente CRUD;
- poucas integrações;
- menos de aproximadamente 5–7 operações coesas;
- dependências semelhantes entre métodos;
- regras pequenas.

## Considerar `UseCase` quando

- feature possui fluxos de negócio distintos;
- métodos possuem dependências muito diferentes;
- existem diversas integrações;
- transações possuem fronteiras diferentes;
- uma classe Service começa a crescer significativamente;
- operações possuem autorização/regras próprias;
- CQRS é utilizado;
- comportamentos precisam ser observados/testados isoladamente.

## Não usar número de linhas como regra absoluta

Quantidade de linhas é apenas um sinal.

Sinais mais importantes:

- número de responsabilidades;
- número de dependências;
- coesão;
- quantidade de razões para mudança;
- complexidade ciclomática;
- quantidade de fluxos distintos.

---

# 13. Padrão híbrido recomendado

É aceitável usar Service e UseCase no mesmo projeto.

Exemplo:

```text
customer/application
├── service
│   └── CustomerQueryService.java
└── usecase
    ├── RegisterCustomerUseCase.java
    ├── BlockCustomerUseCase.java
    └── MergeCustomerUseCase.java
```

Consultas triviais podem permanecer em um `QueryService`, enquanto operações complexas são modeladas como casos de uso explícitos.

---

# 14. Command e Query

Quando o projeto cresce, entradas da camada de aplicação podem ser explicitadas.

```text
application
├── command
│   ├── CreateCustomerCommand.java
│   └── UpdateCustomerCommand.java
└── query
    └── FindCustomerQuery.java
```

Exemplo:

```java
public record CreateCustomerCommand(
        String name,
        String email
) {
}
```

O command deve representar a intenção da aplicação e não necessariamente reproduzir o payload HTTP.

---

# 15. Domain Layer

O domínio representa conceitos e regras do negócio.

Estrutura possível:

```text
domain
├── model
├── valueobject
├── repository
├── service
├── event
└── exception
```

---

# 16. Domain Model

Exemplo:

```java
public class Customer {

    private final UUID id;
    private String name;
    private final Email email;
    private CustomerStatus status;

    private Customer(
            UUID id,
            String name,
            Email email,
            CustomerStatus status) {

        this.id = id;
        this.name = Objects.requireNonNull(name);
        this.email = Objects.requireNonNull(email);
        this.status = Objects.requireNonNull(status);
    }

    public static Customer create(String name, String email) {
        return new Customer(
                UUID.randomUUID(),
                name,
                new Email(email),
                CustomerStatus.ACTIVE
        );
    }

    public void block() {
        if (status == CustomerStatus.BLOCKED) {
            throw new CustomerAlreadyBlockedException(id);
        }

        status = CustomerStatus.BLOCKED;
    }

    public void rename(String newName) {
        if (newName == null || newName.isBlank()) {
            throw new InvalidCustomerNameException();
        }

        this.name = newName;
    }
}
```

Preferir:

```java
customer.block();
```

em vez de:

```java
customer.setStatus(CustomerStatus.BLOCKED);
```

quando existe uma regra de negócio associada à transição.

---

# 17. Value Objects

Conceitos com validação ou semântica própria podem ser Value Objects.

```java
public record Email(String value) {

    public Email {
        if (value == null || !value.contains("@")) {
            throw new InvalidEmailException(value);
        }

        value = value.trim().toLowerCase(Locale.ROOT);
    }
}
```

Outros exemplos:

- CPF;
- CNPJ;
- Money;
- Percentage;
- AccountNumber;
- PhoneNumber;
- Email;
- DocumentId.

---

# 18. Repository como porta

A interface do repository pode residir no domínio:

```text
customer/domain/repository/CustomerRepository.java
```

```java
public interface CustomerRepository {

    Customer save(Customer customer);

    Optional<Customer> findById(UUID id);

    boolean existsByEmail(String email);
}
```

O domínio/aplicação conhece a abstração, não a implementação tecnológica.

---

# 19. Infrastructure Layer

A infraestrutura contém detalhes externos ao núcleo da aplicação.

Exemplos:

```text
infrastructure
├── persistence
├── client
├── messaging
└── configuration
```

---

# 20. Persistência

Estrutura:

```text
infrastructure/persistence
├── entity
│   └── CustomerEntity.java
├── repository
│   ├── SpringDataCustomerRepository.java
│   └── CustomerRepositoryAdapter.java
└── mapper
    └── CustomerPersistenceMapper.java
```

## Entidade JPA

```java
@Entity
@Table(name = "customer")
class CustomerEntity {

    @Id
    private UUID id;

    private String name;

    private String email;

    @Enumerated(EnumType.STRING)
    private CustomerStatus status;
}
```

## Spring Data Repository

```java
interface SpringDataCustomerRepository
        extends JpaRepository<CustomerEntity, UUID> {

    boolean existsByEmail(String email);
}
```

## Adapter

```java
@Repository
@RequiredArgsConstructor
class CustomerRepositoryAdapter implements CustomerRepository {

    private final SpringDataCustomerRepository repository;
    private final CustomerPersistenceMapper mapper;

    @Override
    public Customer save(Customer customer) {
        var entity = mapper.toEntity(customer);
        return mapper.toDomain(repository.save(entity));
    }

    @Override
    public Optional<Customer> findById(UUID id) {
        return repository.findById(id)
                .map(mapper::toDomain);
    }

    @Override
    public boolean existsByEmail(String email) {
        return repository.existsByEmail(email);
    }
}
```

---

# 21. Quando separar Domain Model e JPA Entity

A separação não deve ser dogmática.

## Separar quando

- domínio possui comportamento relevante;
- banco não deve ditar o modelo de negócio;
- persistência pode mudar;
- há integrações diferentes;
- entidades JPA possuem detalhes técnicos significativos;
- projeto é grande ou crítico;
- agregados de domínio diferem da modelagem relacional.

## Pode usar a mesma classe quando

- aplicação é CRUD simples;
- domínio praticamente não contém comportamento;
- custo da duplicação seria superior ao benefício;
- arquitetura foi conscientemente simplificada.

A Skill não deve criar mapeadores e entidades duplicadas automaticamente sem necessidade.

---

# 22. Domain Service

Um Domain Service é apropriado quando uma regra pertence ao domínio, mas não se encaixa naturalmente em uma única entidade.

```java
public class CreditEligibilityService {

    public boolean isEligible(
            Customer customer,
            CreditProfile profile) {

        return customer.isActive()
                && profile.score() >= 700
                && profile.hasNoOverdueDebt();
    }
}
```

Não confundir:

```text
application/service
```

com:

```text
domain/service
```

`Application Service` coordena.

`Domain Service` representa comportamento do domínio.

---

# 23. Integrações externas

Clientes HTTP, SDKs e outros recursos externos devem permanecer na infraestrutura.

```text
payment/infrastructure/client
├── PaymentGatewayClient.java
└── PaymentGatewayAdapter.java
```

Porta:

```java
public interface PaymentGateway {

    PaymentAuthorization authorize(Payment payment);
}
```

Adapter:

```java
@Component
@RequiredArgsConstructor
class PaymentGatewayAdapter implements PaymentGateway {

    private final ExternalPaymentClient client;

    @Override
    public PaymentAuthorization authorize(Payment payment) {
        // tradução entre domínio e fornecedor
    }
}
```

Isso reduz o acoplamento do sistema ao fornecedor externo.

---

# 24. Mensageria

Exemplo:

```text
order
├── domain
│   └── event
│       └── OrderCreated.java
└── infrastructure
    └── messaging
        ├── publisher
        └── consumer
```

Eventos devem possuir semântica clara.

Preferir:

```text
OrderCreated
PaymentAuthorized
CustomerBlocked
```

Evitar nomes genéricos:

```text
OrderEvent
CustomerMessage
GenericEvent
```

---

# 25. Transações

A fronteira transacional SHOULD ficar na camada de aplicação.

Exemplo:

```java
@Transactional
public Customer execute(CreateCustomerCommand command) {
    ...
}
```

Benefícios:

- transação alinhada ao caso de uso;
- domínio permanece livre de infraestrutura;
- comportamento fica previsível.

Evitar espalhar `@Transactional` em:

- controllers;
- mappers;
- entidades;
- helpers.

---

# 26. Exceptions

Estrutura sugerida:

```text
customer
├── domain
│   └── exception
│       ├── CustomerNotFoundException.java
│       └── CustomerAlreadyBlockedException.java
└── api
    └── exception
        └── CustomerExceptionHandler.java
```

Pode também existir tratamento global:

```text
shared/exception
├── GlobalExceptionHandler.java
└── ErrorResponse.java
```

A exceção representa o problema.

O handler representa como o problema é convertido para o protocolo externo.

---

# 27. Shared não deve virar lixeira

Pacote:

```text
shared
```

deve ser usado com parcimônia.

## Permitido

- tipos realmente transversais;
- contratos comuns estáveis;
- error model global;
- abstrações técnicas reutilizadas;
- kernel compartilhado conscientemente projetado.

## Evitar

```text
shared
├── util
│   ├── StringUtils2.java
│   ├── DateHelper.java
│   ├── GeneralUtils.java
│   └── CommonHelper.java
```

Antes de mover uma classe para `shared`, perguntar:

> Ela pertence realmente a várias features ou ainda pertence a uma feature específica?

---

# 28. Comunicação entre features

Evitar acesso a internals.

## Ruim

```java
import br.com.empresa.project.customer.infrastructure.persistence.CustomerEntity;
```

utilizado pela feature `order`.

## Melhor

`customer` expõe uma interface pública:

```java
public interface CustomerQuery {

    CustomerSummary findById(UUID customerId);
}
```

A feature `order` depende do contrato público.

---

# 29. Eventos para desacoplamento

Quando apropriado:

```text
Order
   |
   | OrderCreated
   v
Billing

Order
   |
   | OrderCreated
   v
Notification
```

Isso reduz dependência direta entre módulos.

Nem toda comunicação precisa ser um evento.

Usar eventos quando houver valor real em desacoplamento temporal ou funcional.

---

# 30. Spring Modulith

Spring Modulith pode ser utilizado para reforçar módulos lógicos em aplicações Spring Boot.

Estrutura típica:

```text
br.com.empresa.project
├── customer
├── order
└── payment
```

Por padrão, os subpacotes diretos do pacote principal podem representar módulos da aplicação.

Spring Modulith pode validar:

- ciclos entre módulos;
- acesso indevido a internals;
- dependências permitidas;
- testes de módulos isolados;
- documentação dos módulos;
- observabilidade entre módulos.

## Exemplo de verificação

```java
class ArchitectureTest {

    @Test
    void verifiesModules() {
        ApplicationModules
                .of(ProjectApplication.class)
                .verify();
    }
}
```

Uma equipe que adota Package by Feature em Spring Boot SHOULD avaliar Spring Modulith antes de implementar validações próprias de modularidade.

---

# 31. ArchUnit

ArchUnit permite transformar regras arquiteturais em testes automatizados.

Exemplos de regras úteis:

- controllers não acessam repositories diretamente;
- domínio não depende da infraestrutura;
- features não possuem ciclos;
- classes com determinado papel ficam no pacote correspondente;
- adapters são acessados apenas pelas camadas permitidas.

## Exemplo

```java
@AnalyzeClasses(packages = "br.com.empresa.project")
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainMustNotDependOnInfrastructure =
            noClasses()
                    .that()
                    .resideInAPackage("..domain..")
                    .should()
                    .dependOnClassesThat()
                    .resideInAPackage("..infrastructure..");
}
```

## Controllers

```java
@ArchTest
static final ArchRule controllersMustNotAccessPersistence =
        noClasses()
                .that()
                .resideInAPackage("..api.controller..")
                .should()
                .dependOnClassesThat()
                .resideInAPackage("..infrastructure.persistence..");
```

## Ciclos por feature

```java
@ArchTest
static final ArchRule featuresShouldBeFreeOfCycles =
        slices()
                .matching("br.com.empresa.project.(*)..")
                .should()
                .beFreeOfCycles();
```

Arquitetura que existe apenas em documentação tende a sofrer erosão.

Arquitetura crítica SHOULD ser verificável por testes.

---

# 32. Testes

Estrutura dos testes deve refletir a estrutura de produção.

```text
src/test/java/br/com/empresa/project/customer
├── api
├── application
├── domain
└── infrastructure
```

---

# 33. Testes de UseCase

```java
class CreateCustomerUseCaseTest {

    private CustomerRepository repository;
    private CreateCustomerUseCase useCase;

    @BeforeEach
    void setup() {
        repository = mock(CustomerRepository.class);
        useCase = new CreateCustomerUseCase(repository);
    }

    @Test
    void shouldCreateCustomer() {

        var command = new CreateCustomerCommand(
                "Maria Silva",
                "maria@example.com"
        );

        when(repository.existsByEmail(command.email()))
                .thenReturn(false);

        when(repository.save(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var customer = useCase.execute(command);

        assertEquals("Maria Silva", customer.getName());
    }
}
```

---

# 34. Testes de domínio

Preferir testes sem Spring quando não houver necessidade do framework.

```java
class CustomerTest {

    @Test
    void shouldBlockActiveCustomer() {

        var customer = Customer.create(
                "Maria Silva",
                "maria@example.com"
        );

        customer.block();

        assertTrue(customer.isBlocked());
    }
}
```

Esse tipo de teste deve ser rápido e determinístico.

---

# 35. Testes de infraestrutura

Exemplos:

- repository com Testcontainers;
- client HTTP com WireMock/mock server;
- serialization;
- migrations;
- mensageria.

Não substituir todos os testes por `@SpringBootTest`.

Usar o menor escopo de teste capaz de validar o comportamento.

---

# 36. Nomenclatura

## Controllers

```text
CustomerController
OrderController
PaymentController
```

## Application Services

```text
CustomerService
CustomerQueryService
PaymentService
```

## Use Cases

Preferir verbo + objeto:

```text
CreateCustomerUseCase
BlockCustomerUseCase
CancelOrderUseCase
AuthorizePaymentUseCase
```

Evitar:

```text
CustomerUseCase
GenericCustomerUseCase
CustomerManager
CustomerProcessor
```

quando o nome não explicita a intenção.

## Commands

```text
CreateCustomerCommand
UpdateCustomerCommand
AuthorizePaymentCommand
```

## Queries

```text
FindCustomerQuery
SearchOrdersQuery
```

## Repositories

Domínio:

```text
CustomerRepository
OrderRepository
```

Infraestrutura:

```text
CustomerRepositoryAdapter
SpringDataCustomerRepository
```

## Clients

```text
FraudAnalysisClient
PaymentProviderClient
IdentityProviderClient
```

---

# 37. Interfaces

Não criar interfaces mecanicamente.

Evitar:

```text
CustomerService
CustomerServiceImpl
```

quando existe apenas uma implementação e nenhum motivo arquitetural para a abstração.

Uma interface é útil quando representa:

- uma porta;
- um contrato entre módulos;
- múltiplas implementações;
- um recurso externo;
- uma fronteira arquitetural;
- uma extensão deliberada.

Não usar `Impl` como padrão automático.

---

# 38. Mappers

Mapeamento deve ocorrer em fronteiras.

Exemplos:

```text
API Request
    ↓
Command

Domain
    ↓
Response

Domain
    ↔
Persistence Entity

Domain
    ↔
External Provider DTO
```

Evitar um único `CustomerMapper` responsável por todos os tipos de conversão.

Preferir nomes específicos:

```text
CustomerApiMapper
CustomerPersistenceMapper
PaymentProviderMapper
```

---

# 39. Observabilidade

Casos de uso importantes são bons pontos para instrumentação.

Exemplo conceitual:

```text
HTTP Request
   ↓
Controller
   ↓
CreateOrderUseCase
   ├── CustomerRepository
   ├── PaymentGateway
   └── OrderRepository
```

A instrumentação deve permitir identificar:

- nome do caso de uso;
- latência;
- falhas;
- integração externa responsável;
- operações de banco;
- correlation/trace ID.

Não inserir lógica de telemetria de fornecedor diretamente no domínio.

Preferir OpenTelemetry/Micrometer ou abstrações de observabilidade na infraestrutura/aplicação conforme o caso.

---

# 40. Segurança

Controllers e casos de uso podem possuir responsabilidades distintas.

Autenticação/autorização técnica pode ocorrer via Spring Security.

Regras de negócio de autorização devem permanecer próximas do domínio/aplicação.

Exemplo:

```java
if (!authorizationPolicy.canBlock(operator, customer)) {
    throw new OperationNotAllowedException();
}
```

Evitar depender exclusivamente de segurança HTTP quando o mesmo caso de uso também pode ser chamado por mensageria ou scheduler.

---

# 41. Anti-patterns

## God Service

```java
CustomerService
```

com:

- 40 métodos;
- 25 dependências;
- chamadas HTTP;
- SQL;
- regras de negócio;
- mapeamento;
- mensageria;
- cache.

A solução pode envolver:

- separar UseCases;
- mover regras para domínio;
- criar adapters;
- dividir responsabilidades.

---

## Controller Service Repository automático

Evitar criar mecanicamente:

```text
XController
XService
XRepository
XEntity
XDto
```

para toda tabela.

A arquitetura deve representar comportamento e casos de uso, não apenas a estrutura do banco.

---

## JPA como domínio inteiro

Evitar modelar toda a aplicação a partir das tabelas quando o negócio é complexo.

O banco é uma representação de persistência, não necessariamente a representação correta do domínio.

---

## Utils globais

Evitar:

```text
Utils
Helper
Common
Manager
Processor
```

sem semântica específica.

---

## Feature acessando infraestrutura de outra feature

Evitar:

```text
order
  → customer.infrastructure.persistence.CustomerEntity
```

Preferir contrato público de `customer`.

---

# 42. Estrutura mínima para projeto simples

Nem todo projeto necessita da estrutura completa.

Uma API pequena pode iniciar assim:

```text
br.com.empresa.project
├── customer
│   ├── CustomerController.java
│   ├── CustomerService.java
│   ├── CustomerRepository.java
│   └── Customer.java
└── ProjectApplication.java
```

À medida que a complexidade crescer:

```text
customer
├── api
├── application
├── domain
└── infrastructure
```

Arquitetura deve evoluir proporcionalmente à complexidade.

---

# 43. Estrutura recomendada para projeto corporativo

```text
br.com.empresa.project
│
├── ProjectApplication.java
│
├── config
│   ├── security
│   ├── observability
│   └── documentation
│
├── shared
│   ├── exception
│   └── kernel
│
├── customer
│   ├── api
│   │   ├── controller
│   │   ├── request
│   │   └── response
│   │
│   ├── application
│   │   ├── command
│   │   ├── query
│   │   ├── service
│   │   ├── usecase
│   │   └── mapper
│   │
│   ├── domain
│   │   ├── model
│   │   ├── valueobject
│   │   ├── repository
│   │   ├── service
│   │   ├── event
│   │   └── exception
│   │
│   └── infrastructure
│       ├── persistence
│       │   ├── entity
│       │   ├── repository
│       │   └── mapper
│       ├── client
│       ├── messaging
│       └── configuration
│
├── order
│   ├── api
│   ├── application
│   ├── domain
│   └── infrastructure
│
└── payment
    ├── api
    ├── application
    ├── domain
    └── infrastructure
```

---

# 44. Regras para agentes de IA

Ao criar ou modificar código, um agente de IA MUST primeiro identificar:

1. a feature afetada;
2. o caso de uso;
3. a camada correta;
4. as dependências necessárias;
5. os testes necessários;
6. se uma nova abstração é realmente necessária.

---

# 45. Fluxo obrigatório para geração de código por IA

Antes de gerar código:

```text
1. Identificar feature
2. Identificar entrada
3. Identificar comportamento
4. Identificar saída
5. Identificar persistência
6. Identificar integrações
7. Identificar transação
8. Identificar regras de negócio
9. Identificar testes
10. Validar dependências arquiteturais
```

---

# 46. Regras que a Skill deve impor

## MUST

A IA deve:

- respeitar Package by Feature;
- localizar código na feature correta;
- preferir constructor injection;
- manter controllers finos;
- manter domínio independente de HTTP;
- evitar acesso direto do controller ao repository;
- adicionar testes para comportamento relevante;
- reutilizar padrões existentes do repositório;
- verificar arquitetura existente antes de criar novos pacotes;
- manter nomes semânticos;
- preservar compatibilidade com o build atual;
- executar testes/lint/checks disponíveis antes de finalizar quando o ambiente permitir.

## SHOULD

A IA deve:

- preferir records para DTOs imutáveis quando compatível com o projeto;
- usar UseCase para fluxos complexos;
- usar Service para operações coesas simples;
- usar portas/adapters para integrações externas;
- avaliar ArchUnit;
- avaliar Spring Modulith em modular monoliths;
- manter transações na camada de aplicação;
- evitar abstrações especulativas.

## MUST NOT

A IA não deve:

- criar packages vazios;
- criar interfaces `XService` + `XServiceImpl` sem justificativa;
- criar `Utils` genéricos;
- expor `Entity` JPA diretamente como response HTTP por padrão;
- adicionar uma dependência externa sem necessidade;
- mover regra de negócio para controller;
- acessar internals de outra feature;
- criar camada adicional apenas para seguir um diagrama;
- refatorar áreas não relacionadas sem necessidade.

---

# 47. Checklist de Pull Request

## Arquitetura

- [ ] O código está na feature correta?
- [ ] A direção das dependências está correta?
- [ ] Alguma feature acessa internals de outra?
- [ ] Controller está fino?
- [ ] Persistência está isolada?
- [ ] Integrações externas possuem fronteira clara?
- [ ] Existe ciclo entre features?

## Aplicação

- [ ] O caso de uso está explícito?
- [ ] Service continua coeso?
- [ ] Seria melhor dividir em UseCases?
- [ ] Transação cobre exatamente a operação desejada?

## Domínio

- [ ] Regras importantes estão no lugar correto?
- [ ] Value Objects agregariam valor?
- [ ] Há comportamento anêmico que deveria pertencer ao modelo?

## Testes

- [ ] Há teste de comportamento?
- [ ] Há teste de integração quando necessário?
- [ ] Arquitetura pode ser validada com ArchUnit/Spring Modulith?

## IA

- [ ] A mudança respeitou os padrões existentes?
- [ ] A IA adicionou abstrações não solicitadas?
- [ ] A IA alterou áreas fora do escopo?
- [ ] A IA executou verificações disponíveis?

---

# 48. Exemplo completo: fluxo com Service

```text
customer
├── api
│   ├── controller
│   │   └── CustomerController.java
│   ├── request
│   │   └── CreateCustomerRequest.java
│   └── response
│       └── CustomerResponse.java
│
├── application
│   ├── command
│   │   └── CreateCustomerCommand.java
│   └── service
│       └── CustomerService.java
│
├── domain
│   ├── model
│   │   └── Customer.java
│   ├── repository
│   │   └── CustomerRepository.java
│   └── exception
│       └── CustomerAlreadyExistsException.java
│
└── infrastructure
    └── persistence
        ├── entity
        │   └── CustomerEntity.java
        ├── mapper
        │   └── CustomerPersistenceMapper.java
        └── repository
            ├── SpringDataCustomerRepository.java
            └── CustomerRepositoryAdapter.java
```

Fluxo:

```text
POST /customers
      │
      ▼
CustomerController
      │
      ▼
CustomerService.create()
      │
      ▼
Customer.create()
      │
      ▼
CustomerRepository
      │
      ▼
CustomerRepositoryAdapter
      │
      ▼
SpringDataCustomerRepository
      │
      ▼
Database
```

---

# 49. Exemplo completo: fluxo com UseCase

```text
payment
├── api
│   └── controller
│       └── PaymentController.java
│
├── application
│   ├── command
│   │   └── AuthorizePaymentCommand.java
│   └── usecase
│       └── AuthorizePaymentUseCase.java
│
├── domain
│   ├── model
│   │   └── Payment.java
│   ├── repository
│   │   └── PaymentRepository.java
│   └── gateway
│       └── PaymentGateway.java
│
└── infrastructure
    ├── persistence
    └── client
        └── PaymentGatewayAdapter.java
```

Fluxo:

```text
PaymentController
      │
      ▼
AuthorizePaymentUseCase
      │
      ├─────────────► PaymentRepository
      │
      ├─────────────► PaymentGateway
      │
      ▼
Payment domain behavior
```

O caso de uso deixa claro quais dependências são necessárias para a operação.

---

# 50. Matriz de decisão rápida

| Cenário | Preferência |
|---|---|
| CRUD simples | Service |
| Feature pequena | Service |
| Poucas operações coesas | Service |
| Fluxo de negócio complexo | UseCase |
| Dependências diferentes por operação | UseCase |
| Muitas regras por ação | UseCase |
| CQRS | UseCase/Command/Query Handler |
| Modular monolith | Feature + Application/Domain/Infrastructure |
| Integração externa | Port + Adapter |
| Domínio complexo | Domain Model + Value Objects + Domain Services |
| Projeto extremamente simples | Estrutura reduzida |
| Arquitetura crítica | ArchUnit / Spring Modulith |

---

# 51. Princípios arquiteturais

## Alta coesão

Código que muda pelas mesmas razões deve permanecer próximo.

## Baixo acoplamento

Features devem expor contratos mínimos e evitar conhecimento dos detalhes internos umas das outras.

## Dependency Inversion

Detalhes tecnológicos devem depender de abstrações úteis ao núcleo, quando isso trouxer benefício real.

## YAGNI

Não criar abstrações sem necessidade concreta.

## KISS

Preferir a solução mais simples que preserve requisitos e qualidade.

## SOLID

Aplicar como guia, não como ritual.

---

# 52. Relação com Clean Architecture

Uma correspondência aproximada:

```text
Clean Architecture        Este padrão
-----------------------   ------------------------
Entities                  domain
Use Cases                 application/usecase
Interface Adapters        api / infrastructure
Frameworks & Drivers      infrastructure
```

O projeto não precisa copiar os nomes da Clean Architecture literalmente.

O importante é preservar a direção das dependências.

---

# 53. Relação com Hexagonal Architecture

Correspondência:

```text
Domain
   │
   ├── Ports
   │
   └── Business Rules
         ▲
         │
Adapters ┴
```

Neste padrão:

```text
domain/repository
domain/gateway
```

podem representar portas.

```text
infrastructure/persistence
infrastructure/client
```

podem representar adapters.

---

# 54. Relação com DDD

Package by Feature aproxima a estrutura de código da linguagem de negócio.

Exemplo:

```text
customer
order
payment
billing
shipment
```

é preferível a:

```text
controllers
services
repositories
entities
```

quando o sistema possui vários subdomínios.

---

# 55. Configuração global

Itens realmente globais podem permanecer fora das features.

```text
config
├── SecurityConfig.java
├── OpenApiConfig.java
├── JacksonConfig.java
└── ObservabilityConfig.java
```

Configuração específica da feature deve permanecer na própria feature.

---

# 56. Arquitetura evolutiva

Uma sequência saudável pode ser:

```text
Fase 1
feature
├── Controller
├── Service
├── Repository
└── Entity
```

Depois:

```text
Fase 2
feature
├── api
├── application
└── infrastructure
```

Depois, quando o domínio justificar:

```text
Fase 3
feature
├── api
├── application
├── domain
└── infrastructure
```

Não antecipar a Fase 3 quando a Fase 1 resolve o problema adequadamente.

---

# 57. Especificação sugerida para a Skill

A Skill criada a partir deste documento SHOULD ser focada em um workflow específico:

> Projetar, gerar, modificar e revisar código Java/Spring Boot seguindo o padrão arquitetural do time.

Estrutura sugerida:

```text
java-spring-architecture/
├── SKILL.md
├── references/
│   ├── architecture.md
│   ├── examples.md
│   └── checklist.md
└── assets/
    └── templates/
```

O `SKILL.md` principal deve permanecer conciso.

Detalhes extensos devem ficar em `references/`.

---

# 58. Front matter sugerido

```yaml
---
name: java-spring-architecture
description: >
  Apply the team's Java/Spring Boot package-by-feature architecture when
  creating, modifying, refactoring, or reviewing backend code. Use for
  controllers, application services, use cases, domain models, repositories,
  persistence adapters, integrations, module boundaries, and architecture tests.
---
```

---

# 59. Comportamento esperado da Skill

Ao ser ativada, a Skill deve:

1. inspecionar a estrutura existente do repositório;
2. identificar a feature afetada;
3. identificar o padrão predominante da feature;
4. evitar refatoração arquitetural não solicitada;
5. aplicar as regras deste documento;
6. escolher Service ou UseCase conscientemente;
7. manter dependências na direção correta;
8. adicionar/ajustar testes;
9. executar verificações disponíveis;
10. informar violações arquiteturais encontradas.

---

# 60. Prompt para solicitar ao Codex a criação da Skill

Copiar o texto abaixo junto com este arquivo.

```text
Crie uma Skill reutilizável para Codex chamada `java-spring-architecture`
com base integralmente no documento de arquitetura fornecido.

Objetivo da Skill:
padronizar criação, alteração, refatoração e revisão de aplicações Java/Spring
Boot do time.

A Skill deve seguir o padrão aberto de Agent Skills e possuir no mínimo:

java-spring-architecture/
├── SKILL.md
└── references/
    ├── architecture.md
    ├── examples.md
    └── checklist.md

Requisitos:

1. Use YAML front matter no SKILL.md com `name` e `description`.
2. Mantenha SKILL.md conciso e orientado a execução.
3. Coloque conteúdo de referência extenso em `references/`.
4. Transforme as regras MUST, SHOULD e MUST NOT do documento em instruções
   objetivas para o agente.
5. Ensine o agente a decidir quando usar Application Service e quando usar
   UseCase.
6. Não imponha Clean Architecture ou DDD completo em CRUDs simples.
7. Preserve Package by Feature como regra primária.
8. Faça o agente inspecionar a arquitetura existente antes de criar código.
9. Não permita Controller -> persistence repository diretamente.
10. Não permita Domain -> Infrastructure.
11. Não crie interfaces `Service` + `ServiceImpl` sem justificativa.
12. Não crie abstrações especulativas.
13. Inclua estratégia para testes unitários, integração e testes arquiteturais.
14. Inclua exemplos com ArchUnit.
15. Inclua orientação opcional para Spring Modulith.
16. Ensine o agente a manter mudanças restritas ao escopo solicitado.
17. Inclua checklist final obrigatório antes de concluir uma alteração.
18. Quando possível, execute build, testes e verificações arquiteturais do
    repositório antes de finalizar.
19. A Skill deve adaptar nomes de package, Java version, Spring Boot version,
    build tool e convenções ao projeto encontrado; não hardcode versões sem
    verificar o repositório.
20. Gere também exemplos de tarefas que devem e que não devem ativar a Skill.

Depois de gerar os arquivos:
- valide a consistência interna;
- revise a description para que a Skill seja acionada nos contextos corretos;
- elimine instruções redundantes;
- mantenha detalhes grandes fora do SKILL.md.
```

---

# 61. Referências técnicas oficiais

## Spring Boot — Structuring Your Code

Documentação oficial do Spring Boot sobre organização de código.

Pontos relevantes:

- Spring Boot não exige um layout específico;
- recomenda evitar o default package;
- recomenda localizar a classe principal em um root package acima das demais classes;
- a própria documentação aponta Spring Modulith para estruturas orientadas a domínio.

Referência:

https://docs.spring.io/spring-boot/reference/using/structuring-your-code.html

---

## Spring Modulith — Fundamentals

Documentação sobre módulos funcionais em aplicações Spring Boot.

Referência:

https://docs.spring.io/spring-modulith/reference/fundamentals.html

---

## Spring Modulith — Verification

Validação de:

- ciclos entre módulos;
- acesso a internals;
- dependências permitidas.

Referência:

https://docs.spring.io/spring-modulith/reference/verification.html

---

## Spring Modulith — Testing

Testes de integração de módulos isolados.

Referência:

https://docs.spring.io/spring-modulith/reference/testing.html

---

## Spring Modulith — Documentation

Geração de documentação e diagramas dos módulos.

Referência:

https://docs.spring.io/spring-modulith/reference/documentation.html

---

## ArchUnit

ArchUnit permite testar regras de arquitetura diretamente sobre bytecode Java.

Referência:

https://www.archunit.org/userguide/html/000_Index.html

---

# 62. Referências de padrões

## Service Layer

Martin Fowler / Randy Stafford.

Define uma fronteira da aplicação e um conjunto de operações oferecidas aos consumidores, coordenando a resposta da aplicação.

Referência:

https://martinfowler.com/eaaCatalog/serviceLayer.html

---

## Repository

Martin Fowler / Edward Hieatt / Rob Mee.

O padrão Repository faz a mediação entre o domínio e a camada responsável pelo acesso aos dados.

Referência:

https://martinfowler.com/eaaCatalog/repository.html

---

## Patterns of Enterprise Application Architecture

FOWLER, Martin.

**Patterns of Enterprise Application Architecture**.  
Addison-Wesley Professional, 2002.

ISBN: 978-0321127426.

Padrões relevantes:

- Service Layer;
- Repository;
- Data Mapper;
- Domain Model;
- Transaction Script;
- Gateway.

---

# 63. Referências bibliográficas

## Domain-Driven Design

EVANS, Eric.

**Domain-Driven Design: Tackling Complexity in the Heart of Software**.  
Addison-Wesley Professional, 2003.

ISBN: 978-0321125217.

Conceitos relacionados:

- Ubiquitous Language;
- Entities;
- Value Objects;
- Aggregates;
- Repositories;
- Domain Services;
- Bounded Contexts.

---

## Implementing Domain-Driven Design

VERNON, Vaughn.

**Implementing Domain-Driven Design**.  
Addison-Wesley Professional, 2013.

ISBN: 978-0321834577.

Útil para aplicação prática de:

- aggregates;
- repositories;
- application services;
- domain events;
- bounded contexts.

---

## Clean Architecture

MARTIN, Robert C.

**Clean Architecture: A Craftsman's Guide to Software Structure and Design**.  
Pearson, 2017.

ISBN: 978-0134494166.

Conceitos relacionados:

- Dependency Rule;
- Use Cases;
- boundaries;
- separation of concerns.

---

## Hexagonal Architecture

COCKBURN, Alistair.

**Hexagonal Architecture / Ports and Adapters**.

Referência clássica:

https://alistair.cockburn.us/hexagonal-architecture/

---

## Refactoring

FOWLER, Martin.

**Refactoring: Improving the Design of Existing Code**. 2nd ed.  
Addison-Wesley Professional, 2018.

ISBN: 978-0134757599.

Aplicação:

- evolução incremental;
- identificação de code smells;
- redução segura de complexidade.

---

# 64. Referências para Skills e Codex

## OpenAI — Skills

Documentação atual sobre Agent Skills, `SKILL.md`, instruções reutilizáveis e arquivos de apoio.

https://developers.openai.com/api/docs/guides/tools-skills

---

## OpenAI — Building Skills

Exemplo de estrutura:

```text
skills/
└── skill-name/
    ├── SKILL.md
    ├── references/
    ├── scripts/
    └── assets/
```

Referência:

https://developers.openai.com/plugins/build/skills

---

## OpenAI — Skills concepts

Explica como Skills fornecem workflows repetíveis e complementam ferramentas.

https://developers.openai.com/plugins/concepts/skills

---

## OpenAI — Using Skills

Guia conceitual de Skills como playbooks reutilizáveis.

https://openai.com/academy/skills/

---

# 65. Observação sobre Skills para IA

Uma Skill eficiente não deve duplicar toda a documentação dentro do `SKILL.md`.

Preferir **progressive disclosure**:

```text
SKILL.md
   │
   ├── regras essenciais
   ├── workflow
   └── quando consultar referências
           │
           ├── references/architecture.md
           ├── references/examples.md
           └── references/checklist.md
```

Isso reduz contexto desnecessário e torna o comportamento do agente mais previsível.

---

# 66. Política de evolução deste padrão

Este documento deve ser versionado.

Sugestão:

```text
architecture/
├── java-spring-architecture.md
├── ADR/
│   ├── ADR-001-package-by-feature.md
│   ├── ADR-002-service-vs-usecase.md
│   └── ADR-003-module-boundaries.md
└── CHANGELOG.md
```

Mudanças importantes devem ser registradas por ADR — Architecture Decision Record.

A Skill deve apontar para a versão do padrão utilizada pelo time.

---

# 67. Regra final

A finalidade deste padrão não é maximizar o número de camadas.

A finalidade é maximizar:

```text
clareza
+ coesão
+ testabilidade
+ modularidade
+ capacidade de evolução
+ previsibilidade para humanos e agentes de IA
```

A melhor arquitetura é a menor arquitetura capaz de manter essas propriedades para a complexidade real do sistema.

---

# 68. Resumo executivo

O padrão recomendado é:

```text
br.com.empresa.project
└── feature
    ├── api
    ├── application
    ├── domain
    └── infrastructure
```

Com evolução pragmática:

```text
Feature simples
    → Service

Feature complexa
    → UseCases

Domínio complexo
    → Domain Model

Integração externa
    → Port + Adapter

Aplicação modular
    → Spring Modulith

Governança arquitetural
    → ArchUnit

Execução consistente por IA
    → Agent Skill + referências versionadas
```

A arquitetura deve ser orientada ao domínio funcional, e não à classificação técnica global das classes.
