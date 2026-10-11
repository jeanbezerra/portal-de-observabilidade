# Migração de Fluent UI React v8 para v9

A migração da v8 para a v9 é a adoção incremental de outra arquitetura, não uma simples atualização de versão. A v8 usa `@fluentui/react`; a v9 usa `@fluentui/react-components`.

## Limites

- Não migre toda a aplicação quando o pedido for corrigir uma tela ou componente.
- Meça o uso de componentes v8, estilos personalizados, componentes encapsuladores, temas, dados declarativos, testes e o pacote gerado (`bundle`) antes de estimar a migração.
- Escolha uma estratégia vertical (uma experiência completa) ou horizontal (um tipo de componente) e defina um critério de validação testável.
- Novas experiências devem usar a v9 quando não houver restrição; o código v8 existente pode coexistir durante a transição.
- Espere um aumento temporário do pacote gerado enquanto as duas versões estiverem presentes e verifique a eliminação de código não utilizado (`tree shaking`) na compilação de produção.

## Coexistência

Apelidos explícitos nas importações evitam confusão:

```tsx
import { Button as ButtonV8, ThemeProvider } from '@fluentui/react';
import {
  Button as ButtonV9,
  FluentProvider,
  webLightTheme,
} from '@fluentui/react-components';

export function MigrationBoundary() {
  return (
    <ThemeProvider>
      <FluentProvider theme={webLightTheme}>
        <ButtonV8>Legado</ButtonV8>
        <ButtonV9>Atual</ButtonV9>
      </FluentProvider>
    </ThemeProvider>
  );
}
```

Mantenha os provedores (`providers`) no limite da área em migração. Os temas v8 e v9 têm estruturas e mecanismos diferentes; não passe um objeto de um provedor ao outro sem um adaptador documentado.

## Mudanças arquiteturais

| v8 | v9 | Ação de migração |
| --- | --- | --- |
| `PrimaryButton`, `DefaultButton`, `ActionButton` | `Button` com `appearance` | Converta a intenção e revalide o layout e os ícones. |
| Propriedades (`props`) de dados, como itens de menu | JSX e `children` declarativos | Mapeie dados para `children` com chaves (`keys`) estáveis. |
| Funções de retorno (`callbacks`) `onRender*` | Slots | Use conteúdo, objeto de propriedades ou função de renderização do slot confirmado. |
| Propriedade `styles` e `IStyle` | `makeStyles`, `className` e classes de slots | Reescreva por semântica; não faça tradução textual de seletores internos. |
| `ThemeProvider` e tema em tempo de execução | `FluentProvider`, tokens de design e variáveis CSS | Defina um limite de tema da v9 e mapeie a marca conscientemente. |
| `TextField` | `Input` ou `Textarea` + `Field` | Separe campos de uma linha e de múltiplas linhas e reconecte o rótulo, o erro e a dica. |
| `ContextualMenu`/`Callout` | `Menu`/`Popover` | Refaça a estrutura composta e valide o teclado e o foco. |
| `Modal` | `Dialog` | Revalide fechamento, foco, título e ações. |
| `Panel` | `Drawer` | Reavalie a semântica e a navegação, não apenas a aparência lateral. |
| `Pivot` | `TabList`/`Tab` | Mantenha os painéis fora de `TabList` e conecte seleção e conteúdo. |
| `DetailsList` | `Table`/`DataGrid` ou composição | Não presuma equivalência; confirme ordenação, seleção, virtualização e acessibilidade. |
| `Stack` | CSS Flex/Grid | Migre para layout CSS; use um adaptador temporário (`shim`) apenas como ponte. |
| `Shimmer` | `Skeleton` | Preserve o nome ou o contexto de carregamento e a estabilidade do layout. |
| `Toggle` | `Switch` | Revalide o rótulo e o estado de seleção (`checked`). |

Consulte o mapeamento oficial para componentes não listados. Alguns componentes v8 não possuem substituto direto ou exigem um pacote de compatibilidade ou um pacote do repositório `fluentui-contrib`.

## Sequência segura por componente

1. Localize todos os usos, componentes encapsuladores, estilos, instantâneos (`snapshots`) e testes do componente-alvo.
2. Registre o comportamento atual: propriedades, valores padrão, teclado, acessibilidade, layout e telemetria.
3. Confirme no guia oficial o componente v9 e as diferenças de API.
4. Adicione o provedor e as importações no menor limite coerente.
5. Migre propriedades, `children`, slots, estilos e eventos; não preserve APIs v8 acidentalmente em novos componentes encapsuladores.
6. Compare a aparência e o comportamento nos estados aplicáveis: padrão (`default`), `hover`, `pressed`, `focus`, `disabled`, `loading`, `error` e alto contraste.
7. Execute a verificação de tipos, os testes, o `axe`, a compilação de produção e a medição do pacote gerado.
8. Remova dependências v8 somente quando não houver consumidor restante no pacote.

Os adaptadores temporários (`shims`) de `@fluentui/react-migration-v8-v9` aceitam propriedades antigas e renderizam componentes v9. Use-os apenas como ponte, com um responsável e um critério de remoção; eles podem manter ambos os pacotes no `bundle` e são implementações de melhor esforço (`best effort`).

## Estilos durante a transição

- Aceitar pequenas diferenças visuais pode ser mais seguro do que sobrescrever cada detalhe da v9.
- Para reduzir as inconsistências, migre todas as instâncias de um componente em uma superfície.
- Prefira mover a experiência para Fluent 2. Se o produto exigir paridade temporária, use temas e adaptadores oficiais e documente a exceção.
- Não use seletores `.ms-*` ou `.fui-*` como contrato entre versões.
- Não misture `mergeStyleSets`/`IStyle` com `makeStyles` no mesmo componente novo.
