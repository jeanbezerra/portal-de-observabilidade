# SSR e configuração avançada

Leia a documentação correspondente ao framework e à versão instalada antes de implementar. Next.js App Router, Next.js Pages, Remix e SSR personalizado têm pontos de integração diferentes.

## SSR e hidratação

O Fluent v9 exige que o renderizador (`renderer`) do Griffel usado no servidor corresponda ao usado no cliente e que os estilos gerados sejam incluídos no HTML. O arranjo básico envolve:

- `createDOMRenderer`;
- `RendererProvider`;
- `SSRProvider` quando requerido pela integração/versão;
- `FluentProvider` com o mesmo tema inicial;
- serialização de estilos com `renderToStyleElements` ou a integração específica do framework.

Não copie o exemplo do Express para um framework sem adaptar seu ciclo de renderização. Verifique o guia oficial do Next.js ou do Remix e os exemplos do repositório.

Critérios mínimos:

- nenhuma divergência de hidratação (`hydration mismatch`) no console;
- IDs estáveis entre servidor e cliente;
- tema inicial idêntico para evitar uma mudança visual transitória e uma marcação divergente;
- estilos Fluent presentes na primeira pintura (`first paint`);
- portais montados apenas no documento correto;
- execução no servidor sem acesso desprotegido a `window`, `document`, `HTMLElement` ou medidas de layout.

Evite desabilitar o Strict Mode como correção permanente. Investigue a versão e o problema real de hidratação antes de aplicar uma solução temporária (`workaround`) documentada.

## CSP

Quando a política exigir um `nonce` para estilos, crie o renderizador com `styleElementAttributes` e forneça o mesmo `nonce` confiável da requisição. Não gere um `nonce` fixo nem aceite um valor vindo de conteúdo não confiável.

```tsx
const renderer = createDOMRenderer(targetDocument, {
  styleElementAttributes: { nonce },
});

return (
  <RendererProvider renderer={renderer} targetDocument={targetDocument}>
    <FluentProvider theme={theme} targetDocument={targetDocument}>
      {children}
    </FluentProvider>
  </RendererProvider>
);
```

Adapte os tipos e a presença de `targetDocument` à versão instalada.

## Iframes e janelas filhas

Quando a subárvore for renderizada em outro `document`:

- crie o renderizador com o documento de destino;
- passe `targetDocument` ao `RendererProvider` e ao `FluentProvider` conforme a API instalada;
- mantenha o renderizador memoizado por documento;
- confirme onde portais, ouvintes de eventos e estilos são inseridos;
- teste o foco ao atravessar o limite e a limpeza ao fechar a janela.

Não reutilize automaticamente o renderizador do documento pai.

## Múltiplas raízes ou pacotes gerados

Raízes Fluent independentes na mesma página podem gerar colisões de IDs quando os pacotes não compartilham contexto. Em versões modernas do React, use `identifierPrefix` de `createRoot` quando aplicável. Em versões antigas, verifique `IdPrefixProvider` na versão instalada.

Cada raiz deve ter:

- prefixo único e estável entre o servidor e o cliente;
- provedor e renderizador coerentes;
- responsabilidade clara por portais e anunciadores;
- testes com as raízes montadas simultaneamente.

## Consultas de mídia e estilos em tempo de compilação

- O Griffel ordena grupos (`buckets`) e consultas de mídia (`media queries`). Se a aplicação depender de uma ordem específica, configure `compareMediaQueries` uma vez no renderizador.
- A transformação do Griffel durante a compilação é uma otimização opcional. Só a adicione após uma análise de desempenho (`profiling`) e de acordo com a compatibilidade do projeto com Webpack ou Babel.
- Para bibliotecas não empacotadas, confira a predefinição (`preset`) e o contrato de publicação. Para aplicações, confira o carregador ou plug-in recomendado pelo empacotador atual.
- Valide os ambientes de desenvolvimento e produção, a divisão de código (`code splitting`), as rotas sob demanda e o SSR após habilitar a transformação.
