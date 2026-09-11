# Iconografia

Use ícones como parte da linguagem do Fluent, não como decoração genérica. Confirme o nome e a exportação na versão instalada de `@fluentui/react-icons`.

## Escolha do ícone

- Use ícones do sistema para ações, navegação, estado e objetos comuns da interface.
- Use ícones de produto ou de tipo de arquivo somente para representar o produto ou o arquivo correspondente. Não os redesenhe, altere suas cores ou use como substitutos de logotipos oficiais.
- Escolha uma metáfora reconhecível no contexto cultural e linguístico do produto. Valide ícones direcionais, gestos e símbolos com significado regional.
- Não invente um SVG, emoji ou caractere Unicode quando existir um ícone Fluent apropriado.
- Se não houver ícone inequívoco, prefira um rótulo textual a uma metáfora ambígua.

## Variante e tamanho

- Use `Regular` para ações e orientação na maioria das interfaces.
- Use `Filled` para seleção ou ênfase quando esse contraste de estado fizer parte de um padrão consistente.
- Não alterne `Regular` e `Filled` aleatoriamente nem dependa apenas dessa diferença para comunicar estado.
- Prefira variantes redimensionáveis, como `NomeRegular`, para tamanhos fluidos. Use variantes com tamanho, como `Nome24Regular`, quando precisar do desenho otimizado para aquele tamanho.
- Use os tamanhos e o alinhamento do componente. Não force o ícone a preencher toda a área interativa.
- Ícones informativos de 12 px são geralmente pequenos demais para funcionar como controle. Em controles personalizados para a Web, preserve uma área interativa de pelo menos 44 por 44 pixels quando aplicável ao contexto de uso.

## Cor e temas

- Ícones de sistema devem usar uma única cor derivada de um token semântico de primeiro plano ou status.
- Não fixe uma cor que desapareça em tema escuro ou cores forçadas.
- Evite as variantes `Color` por padrão: gradientes e múltiplas cores podem perder significado ou visibilidade no modo de cores forçadas.
- Se um requisito aprovado exigir um ícone `Color`, ofereça alternativa compreensível em cores forçadas, teste os temas e forneça um `idPrefix` estável e exclusivo quando o ícone usar IDs SVG para gradientes. Use `React.useId` somente conforme a API instalada.
- Não use cor como único indicador de seleção, severidade ou disponibilidade.

## Semântica e acessibilidade

- Em um controle com texto e ícone, trate o ícone como decorativo quando o texto já nomear a ação.
- Em um botão somente com ícone, nomeie o botão com `aria-label` localizado ou `aria-labelledby`. O foco e a semântica pertencem ao botão, não ao SVG.
- Um ícone informativo sem texto precisa de alternativa acessível no elemento ou no contexto que comunica a informação.
- Não use a propriedade (`prop`) `title` do SVG como único nome ou explicação.
- Use `Tooltip` apenas como ajuda visual complementar; a ação precisa continuar compreensível e operável por teclado e toque sem depender dele.
- Ao comunicar estado, combine o ícone com texto, nome acessível, atributo de estado ou outra indicação persistente.

## Direção e desempenho

- Confirme se o pacote espelha automaticamente o ícone em RTL antes de aplicar transformação manual. Nem todo ícone direcional deve ser espelhado: marcas, relógios, mídia e símbolos convencionais podem manter a direção.
- Importe somente os ícones usados por meio da API pública suportada pelo empacotador. Não use importações profundas para tentar reduzir o pacote sem medir o resultado.
- Não adote APIs atômicas experimentais ou sprites alfa apenas por otimização teórica. Exija medição, compatibilidade com o empacotador e validação de SSR, hidratação e acessibilidade.

## Revisão

Para cada ícone, confirme:

- coleção, metáfora, variante e tamanho corretos;
- alinhamento e espaçamento fornecidos pelo componente ou por tokens;
- nome acessível no controle quando necessário;
- estados de repouso, interação, seleção e desabilitado;
- tema claro, tema escuro e cores forçadas solicitados;
- comportamento RTL e localização quando aplicáveis;
- ausência de SVG, emoji ou glifo improvisado equivalente.
