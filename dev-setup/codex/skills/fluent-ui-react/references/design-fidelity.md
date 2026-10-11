# Fidelidade ao Fluent 2

Fidelidade não significa apenas reproduzir uma aparência. Uma implementação fiel preserva, no escopo solicitado, a intenção visual, a semântica, o comportamento, os estados, a responsividade, o conteúdo e a acessibilidade do Fluent 2.

## Fontes de decisão

Use esta ordem para resolver decisões de design e implementação:

1. requisitos explícitos e artefatos aprovados do produto;
2. orientação `Usage`, `Behavior`, `Layout`, `Accessibility` e `Content` da página oficial do componente;
3. API, tipos e exemplos da versão instalada do Fluent UI React;
4. fundamentos oficiais do Fluent 2 e tokens expostos pela versão instalada;
5. composição com componentes Fluent e HTML semântico;
6. personalização documentada e validada.

O artefato de design define a intenção, mas não autoriza copiar um valor visual isolado que contradiga a semântica de um token, o comportamento documentado ou um requisito de acessibilidade. Quando as fontes divergirem, não faça uma aproximação silenciosa: preserve o requisito prioritário, registre a divergência e indique o impacto.

## Contrato de fidelidade

- Use o componente estável que corresponda à função, não o que apenas se pareça com a imagem de referência.
- Preserve a anatomia, a hierarquia de slots e as combinações de componentes documentadas.
- Verifique todos os estados aplicáveis: repouso, passagem do ponteiro (`hover`), pressionado, foco, selecionado, marcado, expandido, carregando, desabilitado, somente leitura, sucesso, aviso e erro.
- Verifique os tamanhos, as aparências e as densidades fornecidos pelo componente antes de criar variantes.
- Use tokens pelo papel semântico. Não escolha um token porque seu valor atual coincide com uma amostra de cor ou medida.
- Trate tema claro, tema escuro, cores forçadas, direção RTL, ampliação e refluxo como variações do mesmo sistema, quando estiverem no escopo.
- Não substitua um comportamento acessível do Fluent por uma implementação visualmente semelhante e semanticamente inferior.
- Não declare fidelidade exata sem artefato de referência, estados definidos e comparação visual.

## Fundamentos a preservar

| Fundamento | Regra de implementação |
| --- | --- |
| Cor | Use a paleta e os tokens semânticos de superfície, conteúdo, borda, marca e status. Cor de status comunica significado e nunca deve ser o único indicador. |
| Tipografia | Use a escala tipográfica, peso, altura de linha e família fornecidos pelos tokens ou componentes. Preserve a hierarquia semântica de títulos. |
| Espaçamento e layout | Use a escala de espaçamento e relações de proximidade do Fluent. Prefira `gap`, grades e margens coerentes; valores excepcionais exigem uma razão de alinhamento ou geometria. |
| Forma e traço | Use tokens de raio e espessura de borda. Não aplique cantos arredondados ou contornos decorativos indiscriminadamente. |
| Elevação | Use sombras e superfícies para representar empilhamento e separação funcional, não como decoração arbitrária. |
| Movimento | Use duração e curva por função. Movimento deve explicar entrada, saída, continuidade ou mudança de estado e respeitar `prefers-reduced-motion`. |
| Iconografia | Use o conjunto oficial, a metáfora correta, a variante e o tamanho apropriados. Leia `iconography.md` quando houver ícones. |
| Conteúdo | Use texto claro, específico, conciso e consistente com a ação. Leia `content-design.md` quando criar ou alterar texto de interface. |
| Acessibilidade | Preserve semântica, nome, teclado, foco, contraste, ampliação, refluxo e tecnologias assistivas. A conformidade do componente isolado não garante a da composição. |

Tokens globais representam valores brutos e independentes de contexto. Tokens de alias representam função e contexto. No código da aplicação, prefira tokens de alias; use valores globais somente ao construir uma camada de tema ou quando a API oficial exigir.

## Da referência visual ao código

Antes de editar:

1. inventarie regiões, componentes, conteúdo, estados, áreas de exibição e temas visíveis ou especificados;
2. identifique o componente Fluent e a orientação oficial correspondente;
3. mapeie cor, tipografia, espaçamento, raio, traço, elevação e movimento para tokens por semântica;
4. separe o que é padrão Fluent, marca do produto e exceção específica;
5. confirme no pacote instalado que componentes, propriedades, slots, tokens e ícones existem.

Durante a implementação:

- mantenha o estilo padrão sempre que ele satisfizer o requisito;
- aplique a marca pelo tema, não por sobrescritas repetidas em cada componente;
- restrinja valores literais a geometrias genuinamente específicas do conteúdo ou a uma especificação aprovada;
- centralize qualquer exceção reutilizável e descreva por que um token ou componente padrão não atende;
- não deduza de uma única captura estados, comportamento responsivo ou conteúdo que ela não demonstra; use a orientação oficial e sinalize a inferência.

## Comparação e aceitação

Compare a implementação com os artefatos disponíveis em cada combinação relevante de:

- área de exibição e densidade;
- tema e marca;
- estado interativo e estado de dados;
- conteúdo curto, longo, traduzido, vazio e com erro;
- teclado, foco visível, cores forçadas, ampliação e direção RTL.

Avalie estrutura, alinhamento, ritmo, tipografia, cor, forma, elevação, ícones, quebra de texto e movimento. Prefira comparação visual automatizada já existente no projeto; caso não exista, faça inspeção manual reproduzível e registre o que foi observado.

Uma diferença é aceitável somente quando decorrer de conteúdo dinâmico, plataforma, comportamento responsivo, melhoria de acessibilidade ou exceção aprovada. Classifique diferenças não resolvidas como exceções; não as oculte com ajustes pontuais frágeis.

