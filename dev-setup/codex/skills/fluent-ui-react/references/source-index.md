# Fontes oficiais e verificação local

As APIs e a maturidade mudam com frequência. Para dúvidas técnicas, use primeiro a versão instalada e depois as fontes oficiais.

## Ordem de consulta

1. `package.json`, arquivo de bloqueio (`lockfile`) e importações do projeto.
2. Tipos, exportações e arquivos README em `node_modules` da versão instalada.
3. [Storybook do Fluent UI React v9](https://react.fluentui.dev/) para componentes, conceitos, especificações de acessibilidade e migração.
4. [Catálogo de componentes React do Fluent 2](https://fluent2.microsoft.design/components/web/react) para localizar orientação de uso, comportamento, layout, acessibilidade e conteúdo.
5. [Repositório microsoft/fluentui](https://github.com/microsoft/fluentui) para código, históricos de alterações e problemas (`issues`) confirmados.
6. [Fluent 2 Design System](https://fluent2.microsoft.design/) para orientação de design.
7. [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) e o pacote [`@fluentui/react-icons`](https://www.npmjs.com/package/@fluentui/react-icons).
8. [Griffel](https://griffel.js.org/) para limitações, propriedades abreviadas (`shorthands`), renderizador e transformações de compilação.
9. [React](https://react.dev/) e a documentação do framework para ambiente de execução, SSR e hidratação.

## Fundamentos oficiais

- [Tokens de design](https://fluent2.microsoft.design/design-tokens): camadas globais e de alias, temas e categorias de tokens.
- [Cor](https://fluent2.microsoft.design/color), [tipografia](https://fluent2.microsoft.design/typography) e [layout](https://fluent2.microsoft.design/layout): paletas, hierarquia, escala e responsividade.
- [Forma](https://fluent2.microsoft.design/shapes), [elevação](https://fluent2.microsoft.design/elevation) e [movimento](https://fluent2.microsoft.design/motion): raio, traço, empilhamento, duração e curva.
- [Iconografia](https://fluent2.microsoft.design/iconography) e [pacote React Icons](https://github.com/microsoft/fluentui-system-icons/blob/main/packages/react-icons/README.md): coleções, variantes, tamanhos e limitações de cores forçadas.
- [Conteúdo](https://fluent2.microsoft.design/content-design) e [acessibilidade](https://fluent2.microsoft.design/accessibility): linguagem, estrutura, contraste, ampliação, refluxo e tecnologias assistivas.

## Arquitetura oficial

- [Arquitetura de tokens](https://github.com/microsoft/fluentui/blob/master/docs/architecture/design-tokens.md) para categorias e responsabilidades dos tokens.
- [Manual de estilos do React v9](https://github.com/microsoft/fluentui/blob/master/docs/react-v9/contributing/rfcs/react-components/styles-handbook.md) para padrões Griffel e limitações de CSS.
- [Padrões de componentes](https://github.com/microsoft/fluentui/blob/master/docs/architecture/component-patterns.md) para requisitos de documentação e acessibilidade dos componentes.

Use o README raiz do Fluent para distinguir projetos: a v9 é `@fluentui/react-components`; a v8 é `@fluentui/react`; Web Components usam outra implementação.

## Verificações locais úteis

Adapte os comandos ao terminal (`shell`) e ao gerenciador do projeto:

```sh
node -p "require('@fluentui/react-components/package.json').version"
node -p "require('@fluentui/react-components/package.json').peerDependencies"
node -p "require('@fluentui/react-icons/package.json').version"
```

Procure o tipo ou a exportação instalada em vez de confiar na memória:

```sh
rg "export .*FluentProvider|type .*Props|interface .*Props" node_modules/@fluentui
rg "@fluentui/react(-components|-icons)?" src package.json
```

Em espaços de trabalho (`workspaces`) Plug'n'Play ou com armazenamento virtual, use o comando de resolução do gerenciador em vez de pressupor a existência física de `node_modules`.

## Páginas-fonte no repositório

Os conteúdos do Storybook são mantidos no monorepo, principalmente em:

- `apps/public-docsite-v9/src/Concepts/QuickStart.mdx`
- `apps/public-docsite-v9/src/Concepts/Theming.mdx`
- `apps/public-docsite-v9/src/Concepts/StylingComponents.mdx`
- `apps/public-docsite-v9/src/Concepts/Slots/Slots.mdx`
- `apps/public-docsite-v9/src/Concepts/Accessibility/`
- `apps/public-docsite-v9/src/Concepts/Migration/`
- `apps/public-docsite-v9/src/Concepts/SSR/`
- `packages/react-components/<pacote>/library/README.md`
- `packages/react-components/<pacote>/stories/`

Confira o ramo (`branch`) e a versão: o conteúdo de `master` pode estar à frente do pacote instalado.

## Como resolver incerteza

- Para propriedade, slot ou evento: tipos locais e exemplo (`story`) da mesma versão.
- Para maturidade: exportação do pacote, histórico de alterações e indicador ou seção do Storybook.
- Para erro: problema (`issue`) oficial com reprodução e versão; depois, consulte o histórico de alterações da correção.
- Para compatibilidade com o React: `peerDependencies` locais e a página oficial “React Version Support”.
- Para migração: mapeamento e guia por componente no Storybook, não apenas busca e substituição.
- Para design: o Fluent 2 define a intenção; o pacote e os tokens instalados definem a implementação disponível.

Não copie trechos de código antigos sem confirmar importações e tipos. Registre a fonte e a versão quando uma decisão depender de comportamento volátil.
