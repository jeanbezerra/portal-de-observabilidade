# Conteúdo de interface

O texto faz parte do design system. Preserve a intenção do produto e a terminologia existente; quando precisar escrever ou revisar conteúdo, use linguagem simples, específica, inclusiva e pronta para localização.

## Princípios

- Escreva de forma concisa, mas não remova a informação necessária para decidir ou corrigir um problema.
- Prefira voz ativa e instruções diretas. Fale com a pessoa em segunda pessoa quando isso tornar a orientação mais clara.
- Na Web, use maiúscula apenas no início da frase (`sentence case`), salvo nomes próprios, marcas e convenções do idioma.
- Use sempre o mesmo termo para o mesmo objeto ou ação.
- Evite jargão interno, humor dependente de cultura, metáforas ambíguas e expressões direcionais como “à direita” quando a posição puder mudar.
- Escreva o texto de modo que continue válido em tema, densidade, área de exibição e direção diferentes.

## Controles e navegação

- Dê a botões rótulos curtos que expressem a ação, normalmente com verbo: “Salvar alterações”, “Criar alerta”.
- Diferencie ação de navegação. Links devem identificar o destino ou o conteúdo; não use “clique aqui” ou “saiba mais” sem contexto suficiente.
- Mantenha rótulos de campo curtos, visíveis e em formato de frase. Não termine o rótulo com dois-pontos; use pontuação apenas quando ele for uma pergunta.
- Não trunque rótulos de campo. Permita quebra de linha quando necessária.
- Não use texto de preenchimento (`placeholder`) para instrução essencial, formato obrigatório ou único rótulo.
- Use `InfoLabel`, dica (`hint`) e `Tooltip` apenas para informação complementar. Orientação indispensável precisa permanecer disponível sem passagem do ponteiro (`hover`).
- Em menus e comandos, use estruturas paralelas e termos coerentes com os demais pontos da interface.

## Estados e mensagens

- Mensagens de erro devem dizer o que aconteceu e, quando conhecido, como corrigir. Evite culpar a pessoa ou apresentar apenas um código técnico.
- Mensagens de validação devem ficar próximas e associadas ao campo; um resumo pode complementar vários erros no envio.
- Para estado vazio, explique o motivo ou contexto e ofereça uma próxima ação quando existir.
- Para carregamento, sucesso e atualização assíncrona, anuncie somente o necessário e evite mensagens repetitivas.
- Rótulos de `Badge` devem ser curtos e expressar um status real. Não dependa somente de cor ou ícone.
- Ações destrutivas devem nomear o efeito; diálogos de confirmação precisam permitir distinguir claramente confirmar de cancelar.

## Acessibilidade e localização

- Faça o nome acessível corresponder ao texto visível ou começar por ele sempre que possível.
- Escreva texto alternativo conforme a função da imagem no contexto; use alternativa vazia para imagens puramente decorativas.
- Não coloque informação essencial apenas em imagens, ícones, cor ou posição.
- Prepare a interface para expansão de texto, palavras longas e idiomas bidirecionais. Não componha frases com fragmentos interpolados que impeçam tradução natural.
- Localize `aria-label`, mensagens anunciadas e textos visualmente ocultos com a mesma disciplina do conteúdo visível.
- Respeite números, datas, horas, plurais e ordenação segundo a localidade do produto.

## Revisão

Leia a interface como um fluxo completo e confirme:

- objetivo e próxima ação compreensíveis;
- terminologia, capitalização e tom consistentes;
- rótulos específicos e sem dependência de posição;
- estados vazio, carregando, sucesso, aviso e erro cobertos quando aplicáveis;
- conteúdo acessível equivalente para ícones, imagens e atualizações dinâmicas;
- ausência de truncamento crítico e funcionamento com expansão de texto e localização.

