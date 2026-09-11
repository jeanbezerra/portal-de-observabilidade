# Validação e entrega

Use os scripts reais do projeto e o gerenciador indicado pelo arquivo de bloqueio (`lockfile`). Não invente um critério de validação inexistente nem atualize instantâneos (`snapshots`) indiscriminadamente para esconder regressões.

## Revisão estática

Procure no escopo alterado:

- mistura não intencional de `@fluentui/react` e `@fluentui/react-components`;
- importações de `/unstable`, de componentes em pré-visualização (`preview`) ou alfa, importações profundas (`deep imports`) ou seletores internos `.fui-*`/`.ms-*`;
- cores, fontes, sombras e raios literais que deveriam ser tokens;
- uso de token global ou escolha de token baseada no valor visual em vez do papel semântico;
- acesso direto às variáveis CSS internas do tema;
- classes Griffel concatenadas como texto em vez de combinadas com `mergeClasses`;
- seletores amplos, regras duplicadas, `!important` e cores de sistema fora de `forced-colors`;
- elementos `div` ou `span` clicáveis, `tabIndex` positivo e controles sem nome;
- ícones improvisados quando houver um ícone Fluent;
- variantes coloridas de ícones sem alternativa e validação em cores forçadas;
- uso da propriedade (`prop`) `title` ou de um `Tooltip` como única explicação de uma ação;
- chaves (`keys`) instáveis em `children` declarativos;
- acesso a objetos globais do navegador em fluxos de SSR;
- componentes encapsuladores que descartam `className`, referência (`ref`), manipuladores de eventos, atributos `aria-*` ou propriedades de slots.

Uma busca textual indica candidatos, não prova erro. Analise cada ocorrência no contexto.

## Testes por comportamento

Prefira React Testing Library ou a ferramenta existente e consulte por papel (`role`) e nome visível:

- renderização e estados controlados e não controlados;
- eventos usando a assinatura `(event, data)` real;
- navegação por teclado e foco inicial/final;
- abertura e fechamento de `Menu`, `Dialog`, `Popover` e `Toast`, inclusive conteúdo em portal;
- rótulo, dica, obrigatoriedade, estado inválido e mensagem do `Field`;
- estados de carregamento, vazio, erro, sucesso e desabilitado;
- seleção, ordenação e paginação quando presentes;
- tema e direção fornecidos pelo provedor;
- regressão do adaptador de roteamento ou de formulários.

Evite testes acoplados a classes atômicas, marcação interna, IDs gerados ou instantâneos enormes. Esses detalhes não fazem parte da API pública.

## Critérios de validação proporcionais

Execute os disponíveis e relacionados ao escopo:

1. formatação e análise estática (`lint`);
2. verificação de tipos do TypeScript;
3. testes unitários focados;
4. suíte de integração relevante;
5. `axe` ou verificador equivalente;
6. compilação de produção e análise do pacote gerado (`bundle`) quando dependências ou importações mudarem;
7. SSR e hidratação quando aplicáveis;
8. inspeção visual nos temas, estados e áreas de exibição (`viewports`) solicitados;
9. teclado, cores forçadas (`forced-colors`), ampliação, refluxo (`reflow`) e leitor de tela em fluxos críticos.

## Matriz de fidelidade

Antes de classificar o resultado, registre para cada item aplicável se foi validado, se não se aplica ou se permanece como exceção:

| Área | Evidência mínima |
| --- | --- |
| Componente | Componente estável correto, anatomia, tamanho, aparência, slots e composição conforme orientação oficial e versão instalada. |
| Estados | Repouso, `hover`, pressionado, foco, selecionado ou marcado, expandido, carregando, desabilitado, somente leitura, sucesso, aviso e erro aplicáveis. |
| Tokens e tema | Tokens de alias por função, temas solicitados, marca e cores forçadas; valores literais e extensões justificados. |
| Fundamentos | Tipografia, espaçamento, alinhamento, forma, traço, elevação e movimento comparados com a referência. |
| Iconografia | Pacote oficial, metáfora, variante, tamanho, cor, nome acessível e RTL corretos. |
| Conteúdo | Rótulos, ajuda, validação e estados claros, consistentes, localizáveis e sem dependência de posição ou cor. |
| Acessibilidade | Semântica, teclado, foco, contraste, área interativa, ampliação, refluxo, leitor de tela e anúncios conforme o risco. |
| Responsividade | Estrutura e conteúdo verificados nas áreas de exibição, densidades e direções solicitadas. |
| Qualidade técnica | Tipos, testes, compilação, SSR e pacote gerado aprovados quando aplicáveis. |

Uma captura do estado de repouso não valida interação, responsividade nem acessibilidade. Se houver artefato visual, compare os estados e as áreas de exibição disponíveis e registre diferenças intencionais. Não use “pixel perfect” sem referência mensurável e comparação reproduzível.

Se um critério amplo já falhava fora do escopo, diferencie a linha de base (`baseline`) da regressão e relate a evidência. Não modifique arquivos não relacionados apenas para deixar a árvore “verde”.

## Resultado de conformidade

Classifique somente o escopo solicitado:

- `CONFORME`: requisitos aplicáveis implementados e critérios relevantes aprovados.
- `CONFORME COM EXCEÇÕES`: resultado utilizável, com diferença de design aprovada, lacuna, API em pré-visualização ou instável, dívida de migração ou validação manual pendente explicitamente descrita.
- `NÃO CONFORME`: requisito essencial não atendido, regressão conhecida ou validação bloqueada que impede confiar no resultado.

Inclua arquivos alterados, comandos executados, resultados dos testes e exceções. Não afirme conformidade integral com as WCAG com base apenas no `axe`.
