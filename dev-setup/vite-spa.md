# Novo projeto React SPA com Vite

[Voltar ao setup principal](./README.md#fluxo-b--obs-web-ainda-está-vazio)

Use esta alternativa apenas para uma aplicação executada integralmente no navegador, sem SSR, carregadores de dados (`loaders`) ou ações (`actions`) no servidor e sem as convenções completas de um framework React. O Vite fornece o ambiente de desenvolvimento e a compilação, mas decisões como roteamento, carregamento de dados e estratégia de implantação continuam sob responsabilidade da equipe.

## Perfil padronizado

| Decisão | Padrão do projeto | Como é atendido |
| --- | --- | --- |
| Arquitetura | React SPA somente cliente | Template `react-ts` do Vite. |
| Diretório | Diretório atual | `.` como argumento posicional. |
| Gerenciador | NPM | O gerador é invocado por `npm create` e a instalação usa `npm install`. |
| Ambiente de execução | Node.js `>=22.22.0` e NPM `>=10` | Declarado em `package.json`; `.nvmrc` registra a versão usada na criação. |
| Instalação | Etapa explícita | `--no-immediate`, seguido por `npm install`. |
| Interação | Sem perguntas | `--no-interactive`. |
| Linguagem | TypeScript | `--template react-ts`. |
| TypeScript estrito | Ativado | Preserve as opções estritas dos arquivos `tsconfig*.json` gerados. |
| Lint | ESLint | `--eslint`; não use o linter alternativo oferecido pelo gerador. |
| Roteamento | Não incluído | Adicione React Router separadamente somente se a SPA precisar de rotas no cliente. |
| SSR | Desativado | Esta estratégia não entrega SSR. Use o guia de React Router Framework Mode quando SSR for requisito. |
| Configuração para agentes de IA | Não gerada | O template `react-ts` não acrescenta configuração de IA. |
| Componentes | Módulos React em `.tsx` | React não possui equivalente a `standalone` ou `NgModule`. |
| Templates externos | Não se aplica | JSX faz parte dos módulos `.tsx`; não existe `inline-template`. |
| Estilos | Fluent/Griffel primeiro; SCSS Modules como apoio | `sass-embedded` habilita `.scss` e `.module.scss`. |
| Estilos inline | Evitar valores visuais literais | Use `makeStyles`, `mergeClasses`, `shorthands` e tokens Fluent. |
| Zone.js | Não se aplica | React não utiliza Zone.js. |
| Projeto mínimo | Template básico | Remova logotipos, contadores e estilos da demonstração depois de validar a geração. |

## 1. Confirmar os pré-requisitos

Execute dentro de `obs-web`:

```console
node --version
npm --version
```

Use a versão LTS indicada pelo repositório. Confirme também que o diretório está vazio.

PowerShell:

```powershell
Get-ChildItem -Force
```

CMD:

```bat
dir /a
```

Ubuntu Bash:

```bash
ls -la
```

Não prossiga se houver `package.json`, código-fonte ou arquivos que seriam substituídos.

## 2. Criar o projeto

Os comandos abaixo funcionam no PowerShell, CMD e Bash:

```console
npm create vite@latest . -- --template react-ts --eslint --no-interactive --no-immediate
npm install
```

Não acrescente `--overwrite`. O Vite não oferece um parâmetro `--package-manager`; o uso de `npm create` seguido de `npm install` padroniza o NPM e deve criar `package-lock.json`. `--no-immediate` impede que o gerador instale dependências e inicie o servidor antes da etapa explícita.

Confirme a estrutura e as dependências:

```console
npm pkg set engines.node=">=22.22.0" engines.npm=">=10"
node -e "require('node:fs').writeFileSync('.nvmrc', process.versions.node + '\n')"
npm pkg get scripts
npm ls react react-dom vite eslint --depth=0
```

O resultado deve incluir os scripts `dev`, `build`, `lint` e `preview`. O arquivo `.nvmrc` registra exatamente a versão usada pelo desenvolvedor; a equipe deve atualizá-lo conscientemente junto com `package.json` e `package-lock.json` quando mudar a versão do Node.js.

## 3. Instalar Fluent UI, SCSS e Prettier

```console
npm install @fluentui/react-components @fluentui/react-icons
npm install --save-dev sass-embedded
npm install --save-dev --save-exact prettier@3.9.6
npm install --save-dev eslint-plugin-jsx-a11y
npm pkg set scripts.format="prettier . --write"
npm pkg set scripts.format:check="prettier . --check"
```

Inclua a configuração recomendada de `eslint-plugin-jsx-a11y` em `eslint.config.*`. Não instale ESLint ou Prettier globalmente.

Remova os logotipos, o contador e os estilos da demonstração. Use SCSS apenas para estilos globais mínimos e arquivos `*.module.scss` de layout específico. Componentes, variantes, temas, cores, tipografia, espaçamento, bordas, elevação e movimento devem seguir a [orientação de estilos e temas da skill Fluent UI](../codex/skills/fluent-ui-react/references/styling-theming.md).

## 4. Decidir sobre roteamento

Não instale um roteador por hábito. Para uma tela única, mantenha a SPA sem roteamento. Se a aplicação precisar somente de rotas no navegador, instale React Router e registre essa decisão arquitetural:

```console
npm install react-router
```

Use os modos Declarative ou Data conforme a necessidade. Se houver SSR, carregamento no servidor, ações de rota (`actions`) ou estratégia de renderização por rota, interrompa este fluxo e recrie o projeto com o [React Router Framework Mode](./react-router-framework.md); não tente transformar silenciosamente o template SPA em um framework.

## 5. Estabelecer a raiz Fluent

Antes de desenvolver telas:

- envolva a aplicação com `FluentProvider` no ponto de entrada e selecione somente os temas pedidos pelo produto;
- importe componentes estáveis de `@fluentui/react-components` e ícones de `@fluentui/react-icons`;
- use tokens semânticos e APIs Griffel, sem cores, fontes, raios ou sombras literais quando houver token adequado;
- mantenha semântica HTML, nomes acessíveis, teclado, foco visível, contraste, cores forçadas, ampliação e refluxo;
- não use APIs Fluent `unstable`, `preview`, alfa ou importações profundas sem necessidade aprovada.

O lint ajuda a detectar problemas estáticos, mas não substitui testes com teclado, foco, contraste, ampliação, refluxo e leitor de tela. Consulte a [orientação de acessibilidade da skill Fluent UI](../codex/skills/fluent-ui-react/references/accessibility.md).

## 6. Validar

```console
npm run lint
npm exec --no -- prettier . --check
npm run build
npm run dev
```

Abra a URL informada no terminal e verifique navegação, estados de erro, teclado, foco e console do navegador. No Ubuntu Remote, encaminhe a porta pela visualização **Ports** do VS Code.

Depois de executar `npm run build`, visualize a compilação:

```console
npm run preview
```

Antes do primeiro commit, confirme:

- as opções estritas do TypeScript permanecem habilitadas;
- `package-lock.json` existe e não há lockfile de outro gerenciador;
- a demonstração do Vite foi removida;
- `FluentProvider`, tokens semânticos e ícones oficiais formam a base visual;
- a decisão de permanecer sem SSR está documentada.

## Referências oficiais

- [Criação de projetos com Vite](https://vite.dev/guide/#scaffolding-your-first-vite-project)
- [Recursos CSS e SCSS do Vite](https://vite.dev/guide/features#css-pre-processors)
- [React Router em modo Declarative](https://reactrouter.com/start/declarative/installation)
- [Fluent UI React v9](https://react.fluentui.dev/)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)
