# Novo projeto com React Router Framework Mode

[Voltar ao setup principal](./README.md#fluxo-b--obs-web-ainda-está-vazio)

Use esta estratégia para o portal quando houver roteamento, renderização no servidor, carregamento de dados por rota ou possibilidade de crescimento além de uma SPA simples. O Framework Mode usa Vite internamente, mas acrescenta convenções de framework, rotas tipadas, divisão de código e estratégias de renderização. O template oficial habilita SSR por padrão.

## Perfil padronizado

| Decisão | Padrão do projeto | Como é atendido |
| --- | --- | --- |
| Arquitetura | React Router Framework Mode | Template oficial mantido pela equipe do React Router. |
| Diretório | Diretório atual | `.` como argumento posicional. |
| Gerenciador | NPM | `--package-manager npm`; deve gerar `package-lock.json`. |
| Ambiente de execução | Node.js `>=22.22.0` e NPM `>=10` | Declarado em `package.json`; `.nvmrc` registra a versão usada na criação. |
| Instalação | Manual e visível | `--no-install`, seguido por `npm install`. |
| Interação | Sem perguntas | `--yes`. |
| Git | Não criar repositório interno | `--no-git-init`, pois `obs-web` pertence ao repositório principal. |
| Configuração para agentes de IA | Não gerar | `--no-agent-skills`; isso não remove a skill Fluent UI mantida no repositório. |
| Linguagem | TypeScript | O template oficial é TypeScript. |
| TypeScript estrito | Ativado | O template declara `strict: true`; não o desative. |
| Roteamento | Integrado e tipado | Configurado em `app/routes.ts` com tipos gerados. |
| SSR | Ativado | `react-router.config.ts` deve manter `ssr: true`. |
| Componentes | Módulos React em `.tsx` | React não possui equivalente a `standalone` ou `NgModule`. |
| Templates externos | Não se aplica | JSX faz parte dos módulos `.tsx`; não existe `inline-template`. |
| Estilos | Fluent/Griffel primeiro; SCSS Modules como apoio | Instale `sass-embedded`; não use SCSS para copiar ou sobrescrever detalhes internos do Fluent. |
| Estilos inline | Evitar valores visuais literais | Use `makeStyles`, `mergeClasses`, `shorthands` e tokens Fluent. |
| Zone.js | Não se aplica | React não utiliza Zone.js. |
| Projeto mínimo | Limpeza controlada após gerar | O gerador não possui `--minimal`; remova a demonstração sem apagar a estrutura de SSR, rotas e tratamento de erros. |

## 1. Confirmar os pré-requisitos

Execute dentro de `obs-web`:

```console
node --version
npm --version
```

O React Router v8 requer Node.js `22.22.0` ou superior. Prefira a versão LTS indicada pelo repositório. Confirme também que o diretório está vazio.

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

O comando abaixo funciona no PowerShell, CMD e Bash:

```console
npm create react-router@latest . -- --yes --template remix-run/react-router-templates/default --no-install --package-manager npm --no-git-init --no-agent-skills
npm install
```

Não acrescente `--overwrite`. O template utilizado é explícito para documentar a origem do projeto; `--package-manager npm` impede a escolha acidental de outro gerenciador; `--no-install` separa a geração da instalação e evita falhas do gerador ao iniciar o NPM no Windows; `--no-git-init` evita um repositório Git aninhado; e `--no-agent-skills` equivale à decisão de não gerar configurações de IA junto com a aplicação.

Confirme a estrutura e os scripts gerados:

```console
npm pkg set engines.node=">=22.22.0" engines.npm=">=10"
node -e "require('node:fs').writeFileSync('.nvmrc', process.versions.node + '\n')"
npm pkg get scripts
npm ls react react-dom react-router @react-router/dev vite --depth=0
```

O resultado deve incluir os scripts `dev`, `build`, `start` e `typecheck`. O arquivo `.nvmrc` registra exatamente a versão usada pelo desenvolvedor; a equipe deve atualizá-lo conscientemente junto com `package.json` e `package-lock.json` quando mudar a versão do Node.js.

## 3. Alinhar o template ao Fluent UI

O template oficial padrão inclui Tailwind CSS para sua página de demonstração. O portal usa Fluent UI React v9 e Griffel como sistema visual; mantenha apenas um sistema para componentes e remova Tailwind:

```console
npm uninstall @tailwindcss/vite tailwindcss
npm install @fluentui/react-components @fluentui/react-icons
npm install --save-dev sass-embedded
npm install --save-dev --save-exact prettier@3.9.6
```

Depois, faça estas alterações no VS Code:

1. em `vite.config.ts`, remova a importação de `@tailwindcss/vite` e deixe `plugins: [reactRouter()]`;
2. remova `@import "tailwindcss"`, `@theme`, `@apply` e classes utilitárias da demonstração;
3. troque `app/app.css` por `app/app.scss` e atualize sua importação em `app/root.tsx`;
4. defina `lang="pt-BR"` no elemento `<html>` se português do Brasil for o idioma inicial do produto;
5. remova fontes remotas, logotipos e conteúdo de demonstração que não tenham sido aprovados para o portal;
6. preserve `Meta`, `Links`, `Outlet`, `ScrollRestoration`, `Scripts` e o tratamento de erro fornecidos pelo framework.

Para renomear a folha de estilos, use somente o comando do seu terminal.

PowerShell:

```powershell
Move-Item -LiteralPath ".\app\app.css" -Destination ".\app\app.scss"
```

CMD:

```bat
move app\app.css app\app.scss
```

Ubuntu Bash:

```bash
mv app/app.css app/app.scss
```

SCSS é reservado a estilos globais mínimos e a arquivos `*.module.scss` de layout específico da aplicação. Para componentes, variantes, temas, cores, tipografia, espaçamento, bordas, elevação e movimento, siga a [orientação de estilos e temas da skill Fluent UI](../codex/skills/fluent-ui-react/references/styling-theming.md).

## 4. Configurar análise estática

Na versão revisada deste guia, o template do React Router não cria ESLint. Confirme primeiro:

```console
npm ls eslint --depth=0
```

Se o pacote não estiver instalado e não existir `eslint.config.*`, inicialize a configuração local:

```console
npm init @eslint/config@latest
```

Nas perguntas do inicializador, selecione TypeScript, React, módulos ECMAScript, execução no navegador e no Node.js, configuração `eslint.config.*` e instalação local com NPM. Se o template já fornecer ESLint, preserve e revise a configuração existente em vez de executar o inicializador novamente. Em seguida, acrescente a verificação estática de acessibilidade e padronize os scripts:

```console
npm install --save-dev eslint-plugin-jsx-a11y
npm pkg set scripts.lint="eslint . --max-warnings=0"
npm pkg set scripts.format="prettier . --write"
npm pkg set scripts.format:check="prettier . --check"
```

Inclua a configuração recomendada de `eslint-plugin-jsx-a11y` no arquivo gerado. O lint ajuda a detectar problemas estáticos, mas não substitui testes com teclado, foco, contraste, ampliação, refluxo e leitor de tela.

Não instale ESLint ou Prettier globalmente.

## 5. Estabelecer a raiz Fluent e o SSR

Antes de desenvolver telas:

- envolva a aplicação com `FluentProvider` no limite raiz apropriado e use o mesmo tema inicial no servidor e no cliente;
- importe componentes estáveis de `@fluentui/react-components` e ícones de `@fluentui/react-icons`;
- use tokens semânticos e APIs Griffel, sem cores, fontes, raios ou sombras literais quando houver token adequado;
- mantenha semântica HTML, nomes acessíveis, teclado, foco visível, contraste, cores forçadas, ampliação e refluxo;
- implemente a integração SSR do Griffel com renderizador coerente entre servidor e cliente e estilos presentes no HTML inicial.

SSR não está concluído apenas porque `ssr: true` está configurado. Siga o [guia de SSR e hidratação da skill Fluent UI](../codex/skills/fluent-ui-react/references/ssr-advanced.md) e valide ausência de divergências de hidratação e de conteúdo sem estilo na primeira pintura. Não habilite transformações opcionais do Griffel durante a compilação sem medir a necessidade e confirmar compatibilidade.

## 6. Validar

```console
npm run lint
npm run typecheck
npm exec --no -- prettier . --check
npm run build
npm run dev
```

Abra a URL informada no terminal e verifique navegação direta para cada rota, atualização da página, estados de erro, teclado, foco e console do navegador. No Ubuntu Remote, encaminhe a porta pela visualização **Ports** do VS Code.

Depois de executar `npm run build`, valide também o servidor de produção:

```console
npm run start
```

Antes do primeiro commit, confirme:

- `react-router.config.ts` mantém `ssr: true`;
- `tsconfig.json` mantém `strict: true`;
- `package-lock.json` existe e não há lockfile de outro gerenciador;
- Tailwind e os artefatos visuais da demonstração foram removidos;
- o tema e os estilos Fluent aparecem já na primeira pintura do SSR;
- não há erro de hidratação no console;
- não foram usadas APIs Fluent `unstable`, `preview`, alfa ou importações profundas sem aprovação.

## Referências oficiais

- [Instalação do React Router Framework Mode](https://reactrouter.com/start/framework/installation)
- [Modos do React Router](https://reactrouter.com/start/modes)
- [Template oficial do React Router](https://github.com/remix-run/react-router-templates/tree/main/default)
- [Fluent UI React v9](https://react.fluentui.dev/)
- [Fluent 2 Design System](https://fluent2.microsoft.design/)
- [SCSS no Vite](https://vite.dev/guide/features#css-pre-processors)
