---
name: java-spring-architecture
description: Projete, implemente, refatore e revise backends Java/Spring Boot segundo uma arquitetura pragmática package-by-feature. Use ao alterar controllers, application services, use cases, domínio, repositories/adapters, integrações, transações, limites entre módulos ou testes arquiteturais. Não use para tarefas Java sem Spring que não envolvam decisões arquiteturais nem para mudanças exclusivamente de frontend.
---

# Arquitetura Java/Spring

Organize o código pela feature ou domínio funcional que muda, preservando a menor arquitetura capaz de manter clareza, coesão, testabilidade e evolução. Não imponha DDD, Clean Architecture ou todas as camadas a CRUDs simples.

## Comece pelo repositório

Antes de alterar código:

1. Leia as instruções locais e identifique módulos, pacote raiz, Java, Spring Boot, build tool e verificações disponíveis.
2. Localize a feature afetada e seu padrão predominante; examine código e testes vizinhos antes de criar pacotes ou abstrações.
3. Explicite entrada, comportamento, saída, persistência, integrações, transação, regras de negócio e testes do caso de uso.
4. Escolha a estrutura mínima compatível com a complexidade e com as convenções já adotadas.

Package by Feature é a regra primária para código novo. Em código legado organizado por camada técnica, mantenha a mudança restrita e informe a lacuna: não crie uma segunda hierarquia concorrente nem migre áreas não solicitadas.

## Preserve as fronteiras

- API recebe o protocolo, valida estrutura, converte entrada, chama a aplicação e converte a saída.
- Application coordena o caso de uso e normalmente delimita a transação.
- Domain contém regras e conceitos de negócio quando eles realmente existem.
- Infrastructure implementa persistência, clientes, mensageria e outros detalhes tecnológicos.
- Use injeção por construtor.
- Não permita `Controller -> persistence repository` nem `Domain -> Infrastructure`.
- Não exponha entidade JPA como resposta HTTP por padrão.
- Não acesse internals de outra feature; use um contrato público ou evento quando houver benefício real.
- Não crie pacotes vazios, `XService` + `XServiceImpl`, `Utils` genéricos, camadas cerimoniais ou dependências sem necessidade concreta.

Leia [references/architecture.md](references/architecture.md) antes de desenhar novas fronteiras, revisar dependências, separar domínio de persistência ou integrar módulos/sistemas externos.

## Escolha Service ou UseCase conscientemente

Use um Application Service para CRUDs e poucas operações coesas com dependências e transações semelhantes. Prefira um UseCase explícito quando os fluxos, dependências, autorizações, integrações ou fronteiras transacionais variam por operação, ou quando um Service perde coesão. É válido combinar Query Service simples com UseCases complexos.

Não use contagem de linhas como regra. Avalie responsabilidades, razões para mudança, dependências, complexidade e testabilidade. Consulte [references/examples.md](references/examples.md) quando precisar de modelos de Service, UseCase, port/adapter, ArchUnit ou Spring Modulith.

## Teste no menor escopo suficiente

- Domínio: teste unitário sem Spring.
- Service/UseCase: teste de comportamento com dependências substituídas quando possível.
- API, persistência, clientes, mensageria e migrations: teste de integração ou slice adequado.
- Fronteiras críticas: considere ArchUnit; em modular monoliths Spring Boot, considere Spring Modulith se já adotado ou se sua introdução estiver no escopo.

Espelhe a feature em `src/test`. Não substitua toda a estratégia por `@SpringBootTest`.

## Conclua com evidências

Antes de finalizar qualquer implementação ou revisão, leia e execute [references/checklist.md](references/checklist.md). Rode os checks descobertos no repositório e relate:

- feature e caso de uso afetados;
- decisão estrutural tomada e por quê;
- testes/checks executados e resultados;
- violações existentes ou riscos que permaneceram fora do escopo.

## Exemplos de ativação

Deve ativar para: criar um endpoint Spring, dividir um God Service, modelar um caso de uso, adicionar JPA ou uma integração HTTP, revisar dependências entre features, escrever regras ArchUnit ou estruturar um modular monolith.

Não deve ativar para: corrigir JavaScript/CSS, administrar infraestrutura sem código Spring, explicar sintaxe Java isolada ou alterar um utilitário Java independente sem impacto arquitetural.

Padrão-base: revisão local de 2026-09-29 do documento `java-spring-architecture-ai-skill-spec.md`, que não declara um identificador próprio de versão.
