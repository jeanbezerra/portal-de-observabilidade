---
name: fluent-ui-react
description: Crie, migre, revise ou corrija interfaces React fiéis ao Microsoft Fluent 2 com Fluent UI React v9, componentes, tokens, Griffel, slots, ícones oficiais, conteúdo e acessibilidade. Use em aplicações e bibliotecas React, inclusive para auditoria de design system; não use para Angular, Web Components, WinUI, aplicações nativas ou tarefas somente de backend.
---

# Fluent UI para React

Implemente experiências React fiéis ao Fluent 2, priorizando APIs estáveis do Fluent UI React v9 e preservando o escopo e a arquitetura do projeto.

## Contrato essencial

- Inspecione `package.json`, arquivo de bloqueio (`lockfile`), versão do React, framework, renderização no cliente ou no servidor (SSR), biblioteca visual existente, estilos e testes antes de editar.
- Para trabalho novo, prefira v9: `@fluentui/react-components`. Trate `@fluentui/react` como v8 legado e mantenha-o apenas quando o projeto ou a migração exigir.
- Verifique a versão instalada, seus tipos e exportações e o Storybook oficial antes de assumir nomes de componentes, propriedades (`props`), slots ou comportamentos. As APIs do Fluent mudam entre versões.
- Para cada componente escolhido, consulte a orientação oficial de uso, comportamento, layout, acessibilidade e conteúdo disponível. A API comprova o que pode ser implementado; a orientação de design define como e quando usar.
- Prefira, nesta ordem: componente Fluent estável, HTML semântico, composição Fluent e, por último, componente personalizado alinhado aos tokens.
- Importe ícones do pacote oficial `@fluentui/react-icons`; não recrie um ícone existente com emoji, caractere Unicode ou SVG improvisado.
- Trate cor, tipografia, espaçamento, forma, traço, elevação, movimento, iconografia, conteúdo, estados e acessibilidade como partes inseparáveis da fidelidade ao sistema.
- Use tokens pelo papel semântico e não pelo valor visual atual. No código da aplicação, prefira tokens de alias aos valores globais ou literais.
- Não use exportações `unstable`, componentes em pré-visualização (`preview`) ou alfa nem APIs internas sem necessidade explícita, justificativa e validação na versão instalada.
- Preserve requisitos explícitos de tema, área de exibição (`viewport`), densidade e plataforma. Não acrescente modo escuro, responsividade, dependências ou uma migração ampla quando estiverem fora do pedido.
- Não declare conformidade total se houver requisito aplicável não validado, erro conhecido ou exceção não documentada.

## Referências

Leia sempre:

- [Fidelidade ao Fluent 2](references/design-fidelity.md)
- [Acessibilidade](references/accessibility.md)

Leia somente quando aplicável:

- Escolha, composição, implementação ou revisão de componentes: [Arquitetura e componentes](references/architecture-components.md)
- Cor, tipografia, espaçamento, layout, forma, elevação, movimento, tokens ou temas: [Estilos, tokens e temas](references/styling-theming.md)
- Alteração ou revisão de código: [Validação e entrega](references/quality-validation.md)
- Projeto com v8, Fabric ou migração: [Migração v8 para v9](references/migration-v8-v9.md)
- Next.js, Remix, SSR, hidratação, CSP, iframe ou múltiplas raízes: [SSR e configuração avançada](references/ssr-advanced.md)
- Interface com ícones, botões somente com ícone ou símbolos de status: [Iconografia](references/iconography.md)
- Criação ou alteração de rótulos, ajuda, mensagens, estados vazios ou validação: [Conteúdo de interface](references/content-design.md)
- Dúvida sobre versão, API ou componente: [Fontes oficiais](references/source-index.md)

## Fluxo de trabalho

1. Identifique a versão Fluent e o gerenciador de pacotes realmente usados. Não troque ferramentas nem atualize versões sem relação com a tarefa.
2. Traduza o requisito visual em estrutura semântica, componentes, estados e fundamentos. Consulte a orientação de design, o Storybook e os tipos locais antes de compor a API.
3. Garanta um `FluentProvider` no limite apropriado da aplicação e selecione somente os temas pedidos.
4. Implemente a estrutura com componentes estáveis e componentes compostos completos. Use slots para partes internas e JSX declarativo para coleções.
5. Aplique layout e personalização com `makeStyles`, `mergeClasses`, `shorthands` e tokens semânticos. Evite replicar estilos internos do componente ou ajustar valores isolados para imitar uma captura.
6. Preserve iconografia e conteúdo consistentes, além de nomes acessíveis, teclado, foco, estados, mensagens, contraste, cores forçadas (`forced-colors`), ampliação, refluxo (`reflow`) e direção RTL quando aplicáveis.
7. Valide com os scripts existentes, testes por comportamento e comparação visual proporcional ao risco em cada estado, tema e área de exibição relevantes. Inclua SSR, hidratação e portais quando fizerem parte da arquitetura.

## Entrega

Ao alterar uma interface, resuma de forma objetiva:

```text
Fluent UI React
- Versão e pacotes:
- Componentes e composição:
- Fidelidade visual e comportamental:
- Tokens, tema, fundamentos e ícones:
- Conteúdo e localização:
- Acessibilidade:
- Testes executados:
- Exceções ou bloqueios:
- Resultado: CONFORME | CONFORME COM EXCEÇÕES | NÃO CONFORME
```

Use `CONFORME` somente quando todos os requisitos aplicáveis ao escopo tiverem sido implementados e validados.
