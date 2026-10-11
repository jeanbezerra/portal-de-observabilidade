# Exemplos aplicáveis

Adapte pacote raiz, linguagem, framework, anotações e ferramentas ao projeto. Os exemplos mostram decisões, não um template a ser copiado integralmente.

## Feature simples com Service

Use a estrutura mínima quando o fluxo é predominantemente CRUD e coeso:

```text
customer
├── CustomerController.java
├── CustomerService.java
├── CustomerRepository.java
└── Customer.java
```

```java
@RestController
@RequestMapping("/customers")
final class CustomerController {
    private final CustomerService service;

    CustomerController(CustomerService service) {
        this.service = service;
    }

    @PostMapping
    ResponseEntity<CustomerResponse> create(
            @Valid @RequestBody CreateCustomerRequest request) {
        var result = service.create(new CreateCustomerCommand(
                request.name(), request.email()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CustomerResponse.from(result));
    }
}
```

```java
@Service
final class CustomerService {
    private final CustomerRepository repository;

    CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    @Transactional
    Customer create(CreateCustomerCommand command) {
        if (repository.existsByEmail(command.email())) {
            throw new CustomerAlreadyExistsException(command.email());
        }
        return repository.save(Customer.create(command.name(), command.email()));
    }
}
```

O controller conhece a aplicação, não JPA. Não separe domínio, entidade e mapper se o modelo é apenas CRUD e essa duplicação não compra independência ou comportamento.

## Fluxo complexo com UseCase e ports/adapters

```text
payment
├── api
│   ├── controller/PaymentController.java
│   ├── request/AuthorizePaymentRequest.java
│   └── response/PaymentResponse.java
├── application
│   ├── command/AuthorizePaymentCommand.java
│   └── usecase/AuthorizePaymentUseCase.java
├── domain
│   ├── model/Payment.java
│   ├── repository/PaymentRepository.java
│   └── gateway/PaymentGateway.java
└── infrastructure
    ├── persistence/...
    └── client/PaymentGatewayAdapter.java
```

```java
@Service
final class AuthorizePaymentUseCase {
    private final PaymentRepository payments;
    private final PaymentGateway gateway;

    AuthorizePaymentUseCase(PaymentRepository payments, PaymentGateway gateway) {
        this.payments = payments;
        this.gateway = gateway;
    }

    @Transactional
    Payment execute(AuthorizePaymentCommand command) {
        var payment = payments.get(command.paymentId());
        var authorization = gateway.authorize(payment);
        payment.apply(authorization);
        return payments.save(payment);
    }
}
```

```java
public interface PaymentGateway {
    PaymentAuthorization authorize(Payment payment);
}
```

```java
@Component
final class PaymentGatewayAdapter implements PaymentGateway {
    private final ExternalPaymentClient client;
    private final PaymentProviderMapper mapper;

    PaymentGatewayAdapter(ExternalPaymentClient client, PaymentProviderMapper mapper) {
        this.client = client;
        this.mapper = mapper;
    }

    @Override
    public PaymentAuthorization authorize(Payment payment) {
        return mapper.toDomain(client.authorize(mapper.toRequest(payment)));
    }
}
```

O UseCase explicita dependências e transação próprias. O domínio conhece a semântica `PaymentGateway`, não o SDK do fornecedor.

## Testes por responsabilidade

### Domínio sem Spring

```java
class CustomerTest {
    @Test
    void blocksAnActiveCustomer() {
        var customer = Customer.create("Maria", "maria@example.com");
        customer.block();
        assertTrue(customer.isBlocked());
    }
}
```

### UseCase isolado

```java
class AuthorizePaymentUseCaseTest {
    @Test
    void persistsAnAuthorizedPayment() {
        var payments = mock(PaymentRepository.class);
        var gateway = mock(PaymentGateway.class);
        var useCase = new AuthorizePaymentUseCase(payments, gateway);

        // Configure only the behavior relevant to the use case.
        // Execute, assert the state/result, and verify meaningful collaboration.
    }
}
```

Use slices ou integração real para serialização/API, repositories, clients, migrations e mensageria. Use Testcontainers, mock server ou ferramentas já presentes quando agregarem fidelidade. Evite um `@SpringBootTest` indiscriminado.

## ArchUnit

Adapte `com.example.project` ao pacote raiz real e confirme a versão/API da dependência existente.

```java
@AnalyzeClasses(packages = "com.example.project")
class ArchitectureTest {
    @ArchTest
    static final ArchRule domainDoesNotDependOnInfrastructure =
            noClasses()
                    .that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure..");

    @ArchTest
    static final ArchRule controllersDoNotAccessPersistence =
            noClasses()
                    .that().resideInAPackage("..api.controller..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..infrastructure.persistence..");

    @ArchTest
    static final ArchRule featuresAreFreeOfCycles =
            slices()
                    .matching("com.example.project.(*)..")
                    .should().beFreeOfCycles();
}
```

Antes de adicionar regras, verifique o layout real: pacotes como `config` e `shared` podem precisar ser excluídos da regra de slices, e uma base legada pode exigir uma adoção incremental explicitamente documentada.

## Spring Modulith

Se o projeto já é ou pretende ser um modular monolith e a dependência está no escopo:

```java
class ModularityTest {
    @Test
    void verifiesApplicationModules() {
        ApplicationModules.of(ProjectApplication.class).verify();
    }
}
```

Use os subpacotes diretos da aplicação como módulos funcionais somente se isso corresponder às features reais. Considere também testes isolados e documentação de módulos, sem duplicar validações já cobertas por ArchUnit.

## Exemplo de revisão

Ao encontrar `OrderController -> CustomerJpaRepository`:

1. registre a violação de limite entre API, persistência e features;
2. encontre ou crie, dentro do escopo, um contrato público semântico em `customer`;
3. faça a Application de `order` consumir esse contrato;
4. preserve detalhes JPA dentro de `customer.infrastructure`;
5. adicione teste do comportamento e, se a regra for crítica/repetida, uma verificação arquitetural.

Não mova todas as features para uma nova estrutura a menos que o usuário tenha solicitado a migração.
