# Acessibilidade

Os componentes Fluent oferecem uma base acessível, mas a experiência final depende da estrutura, do conteúdo, da composição e do estado da aplicação.

Antes de usar ou personalizar um componente, leia sua especificação de acessibilidade e suas boas práticas na documentação da versão instalada. Componentes compostos podem ser acessíveis isoladamente e ainda falhar quando a hierarquia, o nome, o estado ou o foco forem conectados incorretamente.

## Estrutura e semântica

- Comece por regiões semânticas (`landmarks`), uma hierarquia coerente de títulos e uma ordem DOM que corresponda à leitura e ao foco.
- Use o elemento nativo correto. Não adicione `role`, tratamento de teclado ou `tabIndex` para simular um botão, link, caixa de seleção ou título existente em HTML.
- Não deixe texto estático focalizável. Conecte ajuda ao controle com `aria-describedby` ou pelo mecanismo do `Field`.
- Em listas, tabelas, menus, abas e árvores, preserve a hierarquia esperada pelo componente. Não reorganize visualmente de modo que contradiga a ordem de leitura.
- Conteúdo oculto visualmente deve estar oculto ou disponível à tecnologia assistiva de modo intencional; não aplique `aria-hidden` a um ancestral de elemento focalizável.

## Nomes, descrições e estados

- Todo controle precisa de nome acessível claro e localizado. Prefira texto visível associado; use `aria-label` em controles sem texto, como botões só com ícone.
- Não inclua no nome palavras redundantes como “botão”, instruções como “clique aqui”, posição “2 de 5” ou estado que o papel/ARIA já anuncia.
- Use `aria-labelledby` quando a melhor identificação já estiver visível em outra parte do componente.
- Use `Field` para conectar rótulo (`label`), dica (`hint`), obrigatoriedade (`required`) e `validationMessage` aos controles compatíveis. Para componentes encapsuladores ou controles personalizados, confirme no DOM as relações `id`, `aria-describedby` e `aria-invalid`.
- Expresse o estado com a API do componente (`checked`, `selected`, `open`, `appearance`, `validationState` ou equivalente) para que a semântica e a apresentação visual permaneçam sincronizadas.
- Não use o texto de preenchimento (`placeholder`) como único rótulo.

## Teclado e foco

- Preserve os padrões de teclado fornecidos por `Menu`, `Dialog`, `Popover`, `Combobox`, `TabList`, `Toolbar`, `Tree` e `DataGrid`. Não acrescente manipuladores globais que dupliquem o tratamento das teclas de seta, Escape, Enter ou Espaço.
- Mantenha ordem de tabulação natural e nunca use `tabIndex` positivo.
- Torne o foco visível em todos os temas e no modo de cores forçadas. Não remova o contorno (`outline`) sem um indicador equivalente validado.
- Ao abrir uma sobreposição (`overlay`), valide o foco inicial, a contenção quando necessária, Escape e o retorno do foco ao acionador (`trigger`). Use a composição Fluent em vez de uma contenção de foco (`focus trap`) paralela.
- Quando um conteúdo inserido ou removido exigir movimento de foco, mova-o para um destino previsível e anuncie mudanças importantes sem competir com a fala do foco.
- Teste com teclado real, não apenas disparando eventos sintéticos isolados.

## Mensagens e atualizações dinâmicas

- Para erros de formulário, associe a mensagem ao campo e mantenha um resumo quando vários erros impedirem envio.
- Para mudanças assíncronas relevantes sem movimento de foco, prefira `AriaLiveAnnouncer` e `useAnnounce` se estiverem estáveis na versão instalada.
- Use anúncios curtos, localizados e disparados no evento correto. Evite envolver tabelas, chats, formulários ou outras regiões grandes com `aria-live`.
- Reserve `role="alert"` ou `aria-live="assertive"` para mensagens de alta importância; use `role="status"` ou `aria-live="polite"` em atualizações não urgentes.
- Não anuncie cada tecla digitada. Para retorno durante a digitação, verifique `useTypingAnnounce` na versão instalada, agrupe as mensagens e aplique um atraso controlado (`debounce`).

## Visual e conteúdo

- Use tokens para contraste consistente e valide texto, ícones informativos, bordas de controles, estados e foco.
- Garanta contraste mínimo de 4,5:1 para texto comum e 3:1 para texto grande. Garanta 3:1 para limites e indicadores visuais necessários à identificação de controles, estados e gráficos informativos, salvo exceção aplicável da norma.
- Não presuma que cores de marca, estados desabilitados ou valores fornecidos por um artefato visual estão automaticamente conformes; meça as combinações realmente renderizadas.
- Não dependa apenas de cor. Combine-a com texto, ícone, forma ou atributo de estado.
- Valide as cores forçadas (`forced-colors`) do Windows. Não aplique um tema fixo de alto contraste como solução global.
- Garanta texto ampliado a 200% sem perda de conteúdo ou função e refluxo equivalente a 400% de ampliação em uma área de exibição de 320 pixels CSS, exceto conteúdos legitimamente bidimensionais.
- Permita os ajustes de espaçamento de texto do usuário. Evite altura fixa em blocos de texto, sobreposição e truncamento que esconda a parte distintiva da informação.
- Em controles Web personalizados, preserve uma área interativa de pelo menos 44 por 44 pixels quando aplicável ao contexto. Não reduza a área de acionamento de um componente Fluent para fazer o ícone parecer mais compacto.
- Um `Tooltip` deve oferecer ajuda curta e opcional. Informações indispensáveis precisam estar acessíveis por toque, teclado e leitura sem depender da passagem do ponteiro (`hover`).
- Respeite `prefers-reduced-motion` em animações personalizadas. Não substitua o comportamento Fluent por movimento obrigatório.
- Defina `dir` no limite apropriado e valide LTR/RTL quando o produto suportar idiomas bidirecionais.

## Imagens, ícones e mídia

- Forneça texto alternativo conforme a finalidade da imagem; use alternativa vazia quando ela for puramente decorativa.
- Em botões somente com ícone, nomeie o controle e mantenha o SVG fora da ordem de foco. Leia [Iconografia](iconography.md) para variante, cor, tamanho e cores forçadas.
- Forneça legendas, transcrição ou audiodescrição para mídia quando o conteúdo exigir. Não inicie automaticamente áudio ou movimento que a pessoa não possa interromper.
- Preserve a informação quando uma imagem, um gradiente ou uma variante colorida de ícone desaparecer em cores forçadas.

## Checklist de validação

- Navegação somente por teclado, incluindo ordem, setas, Enter, Espaço, Escape e retorno de foco.
- Nome, papel, valor, estado e descrição na árvore de acessibilidade.
- `axe` ou ferramenta equivalente sem violações aplicáveis.
- Contraste medido nos estados e temas aplicáveis, incluindo foco e limites de controles.
- Temas claro e escuro solicitados, cores forçadas, texto a 200%, refluxo a 320 pixels CSS e ajustes de espaçamento de texto.
- Leitor de tela em fluxos críticos ou componentes personalizados complexos.
- Mensagens de validação, carregamento, vazio, sucesso e erro.
- Portais e sobreposições dentro do provedor e do documento corretos.

A automação não substitui a inspeção de teclado, foco, contraste, refluxo nem leitor de tela.
