# Checklist obrigatório de conclusão

Use este checklist antes de concluir uma implementação, refatoração ou revisão. Marque mentalmente cada item aplicável; não gere arquivos de checklist no projeto salvo se o usuário não pedir.

## Contexto e escopo

- A feature e o caso de uso afetados foram identificados?
- Pacote raiz, Java, Spring Boot, build tool, convenções e instruções locais foram verificados?
- A mudança está restrita ao pedido, sem migração ou limpeza adjacente não autorizada?
- Cada novo pacote, classe, interface ou dependência tem responsabilidade e consumidor concretos?

## Arquitetura

- O código está agrupado pela feature ou respeita conscientemente a estrutura legada existente?
- A direção `API -> Application -> Domain` foi preservada e Infrastructure apenas implementa detalhes/portas?
- Controller/consumer permanece fino e sem acesso direto ao repository de persistência?
- Domain permanece independente de HTTP, DTOs de API e Infrastructure?
- Features não acessam internals umas das outras e não criam ciclos?
- Configuração específica ficou na feature; somente configuração realmente global foi para a raiz?
- `shared` não virou destino genérico de código sem ownership?

## Aplicação e domínio

- A escolha entre Service e UseCase corresponde à complexidade, coesão, dependências e transações reais?
- O caso de uso e os nomes expressam intenção, sem `Manager`, `Processor`, `Common` ou `Utils` vagos?
- A transação cobre exatamente o caso de uso e está na camada de Application?
- Regras de negócio estão em Application/Domain, não no controller ou adapter?
- Value Object, Domain Service ou evento foram usados somente quando acrescentam semântica?
- Não foi criada uma interface `Service`/`ServiceImpl` ou outra abstração especulativa?

## Fronteiras tecnológicas

- Requests/responses não expõem JPA Entity por padrão?
- Separação entre Domain Model e persistence entity foi uma decisão consciente, não automática?
- Mappers estão nas fronteiras e possuem escopo/nome específico?
- Integrações externas dependem de contrato semântico quando isso traz desacoplamento real?
- Exceções representam o problema e handlers traduzem o protocolo?
- Segurança e observabilidade técnica não contaminaram o Domain?

## Testes

- Comportamento novo ou alterado possui teste no menor escopo suficiente?
- Regras de domínio foram testadas sem Spring quando possível?
- API, persistência, clients, mensageria e migrations têm integração/slice quando necessário?
- A estrutura de testes acompanha a feature?
- Uma regra estrutural recorrente/criticável merece ArchUnit ou Spring Modulith?

## Verificação do repositório

Descubra e use os comandos do projeto em vez de assumir versões. Exemplos apenas indicativos:

```text
Maven Wrapper:  ./mvnw test ou ./mvnw verify
Gradle Wrapper: ./gradlew test ou ./gradlew check
```

- Compile/build executou?
- Testes unitários e de integração relevantes executaram?
- Testes arquiteturais, lint, formatter e análise estática disponíveis executaram?
- Migrations e configuração foram validadas proporcionalmente ao risco?
- Falhas preexistentes foram distinguidas de regressões introduzidas?

Se o ambiente impedir um check, informe exatamente qual não executou e por quê; não declare sucesso sem evidência.

## Relato final

Inclua de forma concisa:

- resultado entregue;
- feature/caso de uso e decisão Service/UseCase ou estrutura reduzida;
- principais fronteiras preservadas ou corrigidas;
- comandos executados e resultados;
- riscos, violações existentes ou validações pendentes fora do escopo.

Em revisão sem pedido de alteração, reporte achados com arquivo/linha, impacto e correção recomendada; não implemente silenciosamente.
