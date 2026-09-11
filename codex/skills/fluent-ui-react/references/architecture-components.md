# Arquitetura e componentes

## Decisão de versão

| Situação encontrada | Decisão padrão |
| --- | --- |
| Projeto novo ou nova área sem legado | Use `@fluentui/react-components` (v9). |
| Projeto já em v9 | Mantenha a versão e os padrões instalados; não atualize sem necessidade. |
| Projeto v8 (`@fluentui/react`) | Preserve v8 para correções locais; use v9 em trabalho novo somente se a coexistência fizer parte do escopo. |
| Projeto misto v8/v9 | Isole os limites, diferencie importações e temas e siga a referência de migração. |
| Pacote em pré-visualização (`preview`), versão alfa ou exportação `/unstable` | Use apenas se o requisito não tiver alternativa estável e o usuário aceitar o risco. |

`@fluentui/react-components` é o pacote agregado conveniente para aplicações. As importações a partir da raiz permitem a eliminação de código não utilizado (`tree shaking`) quando o empacotador está configurado corretamente. Só adote pacotes granulares quando o projeto já seguir esse padrão ou quando a medição do pacote gerado (`bundle`) justificar a mudança.

Antes de implementar, confirme:

- a versão do React e de `@types/react` aceita pela versão instalada do Fluent;
- componentes e propriedades (`props`) exportados pela versão instalada;
- se o componente está estável, em pré-visualização (`preview`) ou em versão alfa;
- a convenção do projeto para estado controlado, formulários, roteamento, tradução e testes;
- se o código roda no navegador, no servidor ou nos dois ambientes.

Para cada componente escolhido, consulte na documentação oficial as seções disponíveis de uso, comportamento, layout, acessibilidade e conteúdo. Registre as decisões relevantes quando o componente tiver variantes, restrições de composição ou recomendações específicas. O Storybook e os tipos confirmam a API da versão; a página do Fluent 2 confirma a intenção de design.

## Base mínima

Instale dependências com o gerenciador indicado pelo arquivo de bloqueio (`lockfile`). Em uma aplicação v9, mantenha um `FluentProvider` próximo à raiz:

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

export function AppRoot() {
  return (
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
}
```

Escolha `webLightTheme`, `webDarkTheme`, temas do Teams ou um tema de marca conforme o produto. Não use um tema fixo de alto contraste como substituto do suporte nativo às cores forçadas (`forced-colors`).

Provedores (`providers`) aninhados são válidos para uma região temática específica, mas cada `FluentProvider` renderiza um elemento no DOM e define tokens no seu limite. Não os espalhe por componente sem motivo.

## Escolha de componentes

Use o componente que expressa a semântica e o comportamento, não apenas a aparência:

| Necessidade | Opção preferencial | Cuidados |
| --- | --- | --- |
| Ação | `Button`, `MenuButton`, `SplitButton`, `ToggleButton` | Não transforme `div` ou `Link` em botão. Diferencie ação de navegação. |
| Navegação | `Link`, `Breadcrumb`, `Nav`, `TabList` conforme a experiência | Integre o componente de roteamento preservando `href`, semântica e referência (`ref`). |
| Campo | `Field` + `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch` | Use rótulo (`label`), dica (`hint`) e mensagem de validação conectados ao controle. |
| Escolha em lista | `Select` para opções simples; `Dropdown`/`Combobox` para cenários compostos | Não presuma busca, multiseleção ou entrada livre (`freeform`); confira a API. |
| Comandos contextuais | Estrutura completa de `Menu` | Mantenha acionador (`MenuTrigger`), sobreposição (`MenuPopover`), lista (`MenuList`) e itens (`MenuItem`); preserve teclado e foco. |
| Confirmação/modal | Estrutura completa de `Dialog` | Use `DialogTrigger`, `DialogSurface`, `DialogBody` e `DialogActions`; não implemente contenção de foco (`focus trap`) manual em paralelo. |
| Conteúdo transitório | `Popover`, `Tooltip`, `Toast`, `MessageBar` conforme duração e importância | Um `Tooltip` não pode conter informação indispensável. |
| Dados tabulares | `Table` para tabela semântica simples; `DataGrid` quando sua API instalada atender à interação necessária | Não use uma grade interativa para uma tabela estática nem `div`s para imitar uma tabela sem necessidade. |
| Carregamento | `Spinner`, `ProgressBar`, `Skeleton` | Forneça rótulo ou contexto e evite mudança brusca de layout. |
| Pessoa/identidade | `Avatar`, `AvatarGroup`, `Persona` | Defina conscientemente o nome, a imagem alternativa, a presença e a alternativa (`fallback`). |
| Layout | CSS Grid/Flex com Griffel e tokens | Não procure um componente Fluent para cada contêiner estrutural. |

Se não houver componente estável adequado, use HTML semântico antes de construir uma versão frágil de um controle interativo complexo. Para um controle personalizado, siga o padrão ARIA correspondente e teste o teclado e o leitor de tela.

## Composição v9

O Fluent v9 usa componentes compostos, `children` declarativos e slots.

- Preserve a hierarquia documentada de componentes compostos. Ela carrega contexto, IDs, atributos ARIA e gerenciamento de foco.
- Renderize coleções como `children` com uma `key` estável. Não use o índice como chave quando os itens puderem ser reordenados, inseridos ou removidos.
- Use slots para alterar o conteúdo ou as propriedades de uma parte interna, por exemplo `icon`, `contentBefore` ou `contentAfter`.
- Um slot pode aceitar conteúdo simples, JSX ou um objeto de propriedades (`props`). Confirme a forma exata no tipo do componente instalado.
- Para uma alteração visual simples, prefira `className`; para uma parte interna, prefira o slot correspondente; para uma mudança global, prefira o tema.
- Use funções de renderização de slot e hooks `*_unstable` somente quando as alternativas estáveis não resolverem. Os tipos dessas APIs podem variar entre versões do React.

Exemplo de composição e slot:

```tsx
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';

export function ActionsMenu() {
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={<MoreHorizontalRegular />}
          aria-label="Mais ações"
        />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem>Editar</MenuItem>
          <MenuItem>Duplicar</MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
```

Não reutilize este exemplo sem antes validar `disableButtonEnhancement` e os slots na versão instalada.

## Estado e eventos

- Preserve a distinção entre estado controlado e não controlado da API instalada (`value`/`defaultValue`, `checked`/`defaultChecked`, `open`/`defaultOpen` ou equivalentes).
- Não espelhe propriedades (`props`) em estado com `useEffect` sem necessidade. Derive valores durante a renderização ou use a função de retorno de mudança do componente.
- Leia a assinatura real das funções de retorno (`callbacks`). Muitos eventos Fluent entregam `(event, data)`; a estrutura de `data` depende do componente.
- Para formulários, converta o evento no limite do adaptador da biblioteca de formulários. Não acople um componente encapsulador genérico a estruturas não confirmadas.
- Mantenha o foco, a seleção e o estado no componente responsável mais próximo; eleve o estado apenas quando houver um consumidor real.
- Use referências (`refs`) somente para foco, medição ou integração imperativa necessária. Preserve o tipo e a referência ao adaptar `as` ou componentes de roteamento.

## Ícones

Quando a interface usar ícones, leia [Iconografia](iconography.md) antes de escolher coleção, metáfora, variante, tamanho, cor ou comportamento RTL. O ícone é uma parte do componente; preserve no elemento interativo o nome, o foco, a área de acionamento e o estado.
