# Estilos, tokens e temas

## Ordem de decisão

1. Aceite o estilo padrão do componente.
2. Para uma decisão de produto reutilizável, use ou componha um tema.
3. Para uma instância, aplique uma classe Griffel no elemento raiz (`root`).
4. Para uma parte interna, aplique uma classe por slot.
5. Recomponha o componente ou use uma API instável somente como mecanismo de escape documentado.

Evite duplicar seletores e estruturas DOM internas do Fluent. Classes geradas e marcação não são contratos públicos.

## Griffel

Declare `makeStyles` no escopo do módulo, chame o hook dentro do componente e combine classes com `mergeClasses`:

```tsx
import {
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  compact: {
    gap: tokens.spacingVerticalS,
  },
});

type PanelProps = React.ComponentProps<'section'> & { compact?: boolean };

export function Panel({ compact, className, ...props }: PanelProps) {
  const styles = useStyles();

  return (
    <section
      {...props}
      className={mergeClasses(styles.root, compact && styles.compact, className)}
    />
  );
}
```

Regras importantes:

- A última classe passada a `mergeClasses` tem precedência; deixe `className` do consumidor por último quando a sobrescrita for permitida.
- Não concatene classes Griffel como cadeias de caracteres (`strings`) nem dependa da ordem textual das classes.
- Use `shorthands` para propriedades abreviadas de CSS que o Griffel não representa diretamente de forma segura.
- Mantenha variantes como entradas estáticas de `makeStyles` e selecione-as durante a renderização.
- Não passe valores dinâmicos arbitrários para `makeStyles`. Para medidas realmente calculadas em tempo de execução, use uma propriedade `style` restrita ou uma propriedade CSS personalizada e documentada; não replique variáveis internas do tema.
- Só adicione a transformação do Griffel durante a compilação após comprovar que o custo inicial é relevante e de forma compatível com o empacotador do projeto. A execução padrão sem essa transformação é uma configuração suportada.
- Chame `mergeClasses` uma vez por elemento e mantenha cada conjunto de regras no menor escopo necessário.
- Evite seletores amplos, repetição das mesmas regras e `!important`. Corrija a origem da precedência ou use a API pública de slot e aparência.
- Use cores de sistema CSS somente dentro de uma consulta `@media (forced-colors: active)` e quando forem necessárias para preservar a semântica nesse modo.

## Tokens

O Fluent possui duas camadas conceituais de tokens: tokens globais são valores brutos e independentes de contexto; tokens de alias expressam papel, estado e superfície. Em estilos de aplicação e componentes, use tokens de alias. Reserve valores globais para a construção controlada de temas ou para APIs oficiais que os exijam.

Use tokens semânticos de acordo com seu papel na interface:

- `foreground`, `background` e `stroke` conforme a superfície;
- `neutral`, `brand` e `status` conforme o significado;
- variante de interação `Hover`, `Pressed`, `Selected` ou `Disabled` para o estado correspondente;
- `spacing`, `typography`, `border radius`, `shadow`, `duration` e `curve` para as demais fundações.

Escolha o token a partir desta sequência: elemento ou superfície, função semântica, ênfase e estado. Confirme a família completa de estados aplicáveis, não apenas repouso e `hover`.

Não escolha um token apenas porque seu valor atual coincide com a cor desejada. O nome precisa continuar correto nos temas claro e escuro, nas cores forçadas (`forced-colors`) e nos temas de marca.

Evite:

- cores, fontes, sombras e raios literais quando houver um token semântico adequado;
- acessar `var(--color...)` ou qualquer variável interna emitida pelo Fluent;
- redefinir tokens globais para consertar uma única instância;
- usar um token global ou literal diretamente porque ele coincide com uma amostra do artefato visual;
- usar cor como único indicador de erro, seleção ou status;
- sobrescrever estilos de foco sem alternativa equivalente ou melhor.

Valores literais ainda podem ser corretos em geometrias específicas do conteúdo, grades responsivas ou recursos gráficos. Diferencie decisões de layout da linguagem visual do sistema.

## Tema e marca

`FluentProvider` transforma o tema em tokens disponíveis na sua subárvore e nos portais Fluent. Use os temas oficiais quando atenderem ao produto.

Para uma marca própria:

- parta de um `BrandVariants` completo aprovado pela equipe de design;
- use a função de criação de tema claro ou escuro exportada pela versão instalada;
- mantenha os temas claro e escuro como objetos separados;
- valide contraste e estados interativos em ambas as variantes pedidas;
- altere tokens individuais somente quando a semântica do produto justificar.

Não invente uma rampa incompleta nem gere um modo escuro apenas invertendo cores. Consulte as exportações locais porque os nomes das funções de criação podem mudar entre versões.

Se o aplicativo tiver tokens próprios, mapeie-os para uma camada semântica clara. Estenda `Theme` apenas com valores realmente compartilhados, pois cada extensão adiciona variáveis ao provedor.

## Layout, tipografia e responsividade

- Construa o ritmo a partir da escala de espaçamento do Fluent. Use valores excepcionais somente para geometria específica, alinhamento óptico documentado ou requisito aprovado.
- Use CSS Grid para relações bidimensionais e Flexbox para fluxos unidimensionais.
- Aplique espaçamento em um único nível de responsabilidade; evite margem em `children` reutilizáveis quando o contêiner puder usar `gap`.
- Use tokens tipográficos ou o componente `Text` sem destruir a hierarquia nativa de títulos.
- Preserve o refluxo (`reflow`) durante a ampliação; evite alturas fixas para conteúdo textual e larguras que provoquem truncamento ilegível.
- Use consultas de mídia ou de contêiner conforme o projeto. Se a ordem das consultas de mídia do Griffel importar, configure o renderizador uma vez e teste a ordem emitida.
- Trate a densidade compacta como uma variante deliberada, sem reduzir alvos, texto ou espaçamento a ponto de prejudicar o uso.

## Forma, elevação e movimento

- Use tokens de raio e espessura de borda de acordo com a anatomia do componente; não arredonde todas as superfícies por conveniência.
- Use elevação para comunicar sobreposição, empilhamento ou separação funcional. Não copie sombras literais de uma captura.
- Use tokens de duração e curva para animações personalizadas. Cada movimento deve explicar entrada, saída, continuidade, mudança de estado ou mudança de elevação.
- Preserve o comportamento estático ou reduzido sob `prefers-reduced-motion`; não torne uma transição indispensável para compreender o resultado.
- Não anime propriedades de layout sem avaliar custo, refluxo e legibilidade.

## Slots e sobrescritas

Uma classe no elemento raiz não alcança necessariamente os slots internos. Passe um objeto ao slot:

```tsx
const useStyles = makeStyles({
  icon: { color: tokens.colorBrandForeground1 },
});

function SaveButton() {
  const styles = useStyles();
  return <Button icon={{ children: <SaveRegular />, className: styles.icon }}>Salvar</Button>;
}
```

Ao criar componentes encapsuladores:

- exponha somente variantes necessárias ao produto;
- encaminhe `className`, referências (`refs`) e propriedades HTML relevantes sem enfraquecer os tipos;
- componha a classe base antes da classe do consumidor;
- não faça um encapsulador opaco que impeça rótulos, manipuladores de eventos ou slots necessários;
- teste a renderização polimórfica se expuser `as`.
