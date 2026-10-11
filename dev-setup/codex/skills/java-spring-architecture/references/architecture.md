# Referência arquitetural

Use esta referência para decidir localização, dependências e fronteiras. Adapte nomes de pacotes, versão do Java/Spring, bibliotecas e build tool ao repositório inspecionado; não os presuma.

## Princípio central

A unidade primária é a feature/domínio funcional, não o tipo técnico global:

```text
com.example.project
├── customer
│   ├── api
│   ├── application
│   ├── domain
│   └── infrastructure
├── order
└── payment
```

Evite raízes globais como `controller`, `service`, `repository`, `entity`, `dto` e `mapper` quando o sistema possui múltiplas features. Crie somente os subpacotes que tenham responsabilidades concretas.

Para aplicações pequenas, esta forma reduzida continua sendo package by feature:

```text
com.example.project
├── customer
│   ├── CustomerController.java
│   ├── CustomerService.java
│   ├── CustomerRepository.java
│   └── Customer.java
└── ProjectApplication.java
```

Evolua para `api/application/domain/infrastructure` somente quando a complexidade justificar.

## Direção de dependências

```text
API -> Application -> Domain
          |             ^
          v             |
     ports/contracts <- Infrastructure implements
```

Regras:

- API pode depender de Application, mas não de detalhes de persistência.
- Application coordena casos de uso, agregados, portas, persistência, publicação e resultados.
- Domain não depende de HTTP, controllers, DTOs externos ou Infrastructure.
- Implementações tecnológicas ficam em Infrastructure.
- Interfaces que abstraem um recurso ficam próximas da regra consumidora: por exemplo, um repository/gateway port em Domain ou Application conforme a semântica.
- Features se relacionam por contratos públicos mínimos. Não importe entity, repository adapter ou outro internal de uma feature vizinha.

## API

API inclui REST, GraphQL, gRPC, mensageria de entrada, CLI, scheduler ou interface administrativa. Um controller/consumer fino pode:

- receber e validar estrutura;
- converter request em command/query;
- invocar Application;
- converter o resultado em response;
- definir status, headers e semântica do protocolo.

Não coloque nele regras de negócio, transações ou acesso direto a JPA. Requests e responses são contratos da fronteira; não os reutilize automaticamente como domínio, entidade JPA ou evento.

Records são bons DTOs imutáveis quando a versão e as convenções do projeto permitirem.

## Application

Application torna o caso de uso explícito e coordena:

- carregamento e persistência;
- comportamento de domínio;
- integrações externas por portas;
- publicação de eventos;
- fronteira transacional;
- resultado da operação.

### Service

Use quando a feature é simples ou média, as operações formam uma API coesa e compartilham dependências e política transacional. É a preferência para CRUD simples e poucas operações relacionadas.

### UseCase

Considere quando operações têm regras, dependências, autorizações, integrações ou transações diferentes; quando CQRS é adotado; ou quando um Service acumula razões de mudança. Nomeie com verbo e objeto, como `AuthorizePaymentUseCase`.

Service e UseCase podem coexistir. Um `CustomerQueryService` pode servir consultas simples enquanto `BlockCustomerUseCase` representa uma ação rica. Não crie uma classe por ação trivial apenas por ritual.

Commands e queries representam intenção da aplicação e não precisam copiar o payload HTTP.

## Domain

Use Domain Model, Value Objects, Domain Services, eventos e exceções quando o negócio possui comportamento relevante:

- prefira `customer.block()` a `setStatus(BLOCKED)` quando a transição tem regras;
- use Value Object quando validação, normalização ou semântica justificarem o tipo;
- use Domain Service quando a regra é de negócio, mas não pertence naturalmente a uma única entidade;
- mantenha o domínio livre de telemetria de fornecedor e detalhes de protocolo/persistência.

Não force domínio rico em uma operação que é honestamente um transaction script simples.

## Persistência

Quando domínio e persistência precisam ser separados:

```text
feature
├── domain/repository/CustomerRepository.java
└── infrastructure/persistence
    ├── entity/CustomerEntity.java
    ├── repository/SpringDataCustomerRepository.java
    ├── repository/CustomerRepositoryAdapter.java
    └── mapper/CustomerPersistenceMapper.java
```

Separe Domain Model de JPA Entity quando o domínio tem comportamento relevante, o agregado difere do modelo relacional, detalhes JPA contaminariam o núcleo ou a aplicação é grande/crítica. Uma classe única pode ser uma simplificação consciente em CRUD simples; não duplique entity/model/mapper automaticamente.

Mapeie nas fronteiras e dê nomes específicos (`CustomerApiMapper`, `CustomerPersistenceMapper`, `PaymentProviderMapper`) em vez de um mapper universal.

## Integrações e mensageria

Clientes HTTP, SDKs, brokers e fornecedores ficam em Infrastructure. Exponha uma porta semântica, como `PaymentGateway`, quando isso desacoplar o caso de uso do fornecedor. O adapter traduz entre o contrato interno e os DTOs externos.

Eventos devem representar fatos, como `OrderCreated` ou `PaymentAuthorized`. Use eventos quando desacoplamento temporal/funcional traz valor; uma chamada síncrona por contrato público pode ser mais simples e correta.

## Transações, erros, segurança e observabilidade

- Delimite `@Transactional` em Application, alinhado ao caso de uso; use leitura somente quando suportado e apropriado.
- Não espalhe transações por controllers, mappers, entities ou helpers.
- A exceção expressa o problema; a API/handler traduz para HTTP ou outro protocolo.
- Autenticação/autorização técnica pode ficar no Spring Security. Regras de autorização de negócio pertencem a Application/Domain para continuarem válidas em HTTP, eventos e schedulers.
- Instrumente casos de uso e adapters para nome, latência, falha, dependência externa, banco e correlação. Prefira os padrões de observabilidade do projeto; não injete SDK de fornecedor no Domain.

## Shared e configuração

Use `shared` apenas para tipos realmente transversais, estáveis e conscientemente compartilhados. Antes de mover algo, confirme que não pertence a uma feature. Evite `GeneralUtils`, `CommonHelper`, `Manager` ou `Processor` sem semântica.

Configuração global pode ficar no pacote raiz (`security`, `serialization`, `documentation`, `observability`). Configuração específica permanece na feature.

## Nomenclatura e interfaces

- Controllers: `CustomerController`.
- Services: `CustomerService`, `CustomerQueryService`.
- UseCases: verbo + objeto (`CreateCustomerUseCase`).
- Commands/queries: `CreateCustomerCommand`, `FindCustomerQuery`.
- Port de domínio: `CustomerRepository`, `PaymentGateway`.
- Adapter: `CustomerRepositoryAdapter`; Spring Data: `SpringDataCustomerRepository`.
- Client tecnológico: `FraudAnalysisClient`.

Crie interface somente para porta, contrato entre módulos, múltiplas implementações, recurso externo, fronteira arquitetural ou extensão deliberada. Não aplique `Service`/`ServiceImpl` mecanicamente.

## Governança opcional

Use ArchUnit quando uma regra crítica precisa ser executável. Em modular monoliths Spring Boot, avalie Spring Modulith para ciclos, internals, dependências, testes isolados e documentação. Não adicione essas dependências apenas para cumprir esta referência: confirme que já existem ou que a tarefa autoriza sua introdução.

## Sinais de erosão

- God Service com muitas dependências e fluxos heterogêneos;
- geração mecânica de Controller/Service/Repository/Entity/DTO por tabela;
- JPA ditando todo o domínio complexo;
- feature acessando Infrastructure de outra feature;
- regra de negócio em controller;
- abstrações ou camadas sem consumidor real;
- ciclo entre features.

Corrija apenas o necessário para a tarefa. Registre problemas adjacentes sem transformar uma mudança localizada em migração arquitetural ampla.
