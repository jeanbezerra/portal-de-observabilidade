# Setup de desenvolvimento: Windows e Ubuntu 26.04 remoto

Este roteiro prepara um ambiente do zero para desenvolver o portal com React em um destes cenários:

- diretamente no Windows, usando **PowerShell** ou **Prompt de Comando (CMD)**;
- em um host **Ubuntu 26.04 LTS**, usando Bash e o VS Code **Remote - SSH** a partir do Windows.

O próprio desenvolvedor deve executar os comandos no terminal do ambiente correspondente. No modo remoto, o VS Code fica no Windows, mas Node.js, NPM, Git, o código e as dependências do projeto ficam no Ubuntu.

O gerenciador de pacotes do projeto é exclusivamente o **NPM**. Não use Yarn, pnpm ou Bun e não crie lockfiles desses gerenciadores.

> React não é instalado globalmente na máquina. `react`, `react-dom`, ESLint, Prettier, Vite e as demais ferramentas ficam instalados localmente no projeto e registrados em `package.json` e `package-lock.json`.

## 1. Identificar o terminal

Use uma destas opções:

- PowerShell: pressione `Win`, digite `PowerShell` e abra o aplicativo;
- CMD: pressione `Win`, digite `cmd` e abra o **Prompt de Comando**;
- terminal integrado do VS Code: use **Terminal > New Terminal** depois de instalar o editor.
- Ubuntu Remote: use o terminal Bash aberto dentro da janela remota do VS Code ou a sessão `ssh` iniciada no Windows.

Os blocos `console` funcionam no PowerShell e no CMD. Os blocos `bash` são exclusivos do Ubuntu. Não execute comandos `sudo`, `apt` ou `nvm` no Windows.

## 2. Preparar o Windows

Confirme se o Windows Package Manager está disponível:

```console
winget --version
```

Instale os pré-requisitos com os identificadores exatos do WinGet:

```console
winget install --id Git.Git --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id Microsoft.VisualStudioCode --exact --source winget --accept-source-agreements --accept-package-agreements
winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-source-agreements --accept-package-agreements
```

O pacote `OpenJS.NodeJS.LTS` instala uma versão LTS do Node.js e inclui o NPM. Não instale o NPM separadamente. Se todo o desenvolvimento ocorrer no Ubuntu Remote, o Node.js do Windows não executará o projeto, mas pode permanecer instalado para tarefas locais.

Se o `winget` não estiver disponível, instale o **App Installer** pela Microsoft Store ou use os instaladores oficiais do [Git](https://git-scm.com/download/win), [VS Code](https://code.visualstudio.com/download) e [Node.js LTS](https://nodejs.org/en/download).

Feche todos os terminais e abra um novo terminal para atualizar o `PATH`. Verifique a instalação:

```console
git --version
code --version
node --version
npm --version
```

Todos os quatro comandos devem mostrar uma versão sem apresentar erro.

Quando o repositório passar a declarar uma versão do Node em `.nvmrc`, `.node-version` ou `package.json#engines`, use a versão indicada pelo projeto em vez de escolher outra versão livremente.

## 3. Acessar o repositório no Windows

Siga esta seção somente para desenvolvimento local no Windows. Para Ubuntu Remote, prossiga para as seções 5 e 6.

Se o repositório já estiver clonado no Windows, entre na raiz dele.

No PowerShell:

```powershell
Set-Location "C:\caminho\para\portal-de-observabilidade"
```

No CMD:

```bat
cd /d "C:\caminho\para\portal-de-observabilidade"
```

Confirme que está no diretório correto e abra o projeto no VS Code:

```console
dir
code .
```

A raiz aberta deve conter pelo menos os diretórios `obs-web`, `obs-api`, `obs-db` e `dev-setup`.

## 4. Instalar as extensões do VS Code

Execute no PowerShell ou no CMD:

```console
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension EditorConfig.EditorConfig
code --install-extension ms-vscode-remote.remote-ssh
```

| Extensão | Finalidade |
| --- | --- |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Mostra no editor os problemas encontrados pelo ESLint local do projeto. |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Formata JavaScript, TypeScript, JSX, JSON, CSS e Markdown com o Prettier local. |
| [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) | Mantém codificação, indentação e finais de linha coerentes quando o projeto possuir `.editorconfig`. |
| [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) | Abre o repositório e executa extensões de workspace no host Ubuntu por SSH. |

Reinicie o VS Code depois da instalação:

```console
code .
```

Evite instalar pacotes genéricos de extensões ou coleções de snippets sem necessidade. O VS Code já oferece suporte nativo a JavaScript, TypeScript, JSX, depuração e importações automáticas.

## 5. Preparar o Ubuntu 26.04 LTS remoto

Execute esta seção no shell Bash do host Ubuntu. Se o SSH ainda não estiver ativo, use primeiro o console fornecido pela máquina virtual ou pelo provedor de nuvem.

### Confirmar o sistema

```bash
cat /etc/os-release
uname -m
```

Confirme que a saída identifica Ubuntu 26.04 LTS e uma arquitetura suportada. Hosts `x86_64` oferecem a maior compatibilidade com extensões que possuem código nativo.

### Instalar os pacotes do sistema

```bash
sudo apt update
sudo apt install -y git curl ca-certificates tar build-essential libssl-dev openssh-server
```

Esses pacotes fornecem Git, certificados HTTPS, utilitários exigidos pelo VS Code Server, servidor SSH e ferramentas para dependências NPM que precisem compilar código nativo.

Habilite o serviço SSH e confirme seu estado:

```bash
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
```

O resultado deve indicar `active (running)`. Não abra portas no firewall sem seguir a política de rede da organização; o acesso SSH deve ser liberado apenas para as origens autorizadas.

### Instalar Node.js LTS e NPM com NVM

Instale o NVM no usuário de desenvolvimento, sem `sudo`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
source ~/.bashrc
command -v nvm
```

O último comando deve imprimir `nvm`. Em seguida, instale e selecione a versão LTS do Node.js:

```bash
nvm install --lts
nvm alias default 'lts/*'
nvm use --lts
node --version
npm --version
```

O Node.js instalado pelo NVM já inclui o NPM. Não use `sudo npm`, não instale NPM pelo `apt` e não misture a instalação do NVM com um Node.js de sistema.

Quando o projeto possuir `.nvmrc`, entre na raiz do repositório e use:

```bash
nvm install
nvm use
```

### Acessar o repositório no Ubuntu

Se o repositório já estiver clonado no host, entre na raiz e confira seu conteúdo:

```bash
cd /caminho/para/portal-de-observabilidade
pwd
ls
git status
```

A raiz deve conter `obs-web`, `obs-api`, `obs-db` e `dev-setup`. Clone o repositório no Ubuntu, e não no sistema de arquivos do Windows, quando o código for executado pelo host remoto.

## 6. Conectar o VS Code ao Ubuntu por SSH

Execute os comandos desta seção no Windows.

Confirme que o cliente OpenSSH está disponível:

```console
ssh -V
```

Se o comando não existir, instale o recurso no PowerShell aberto como administrador:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

Ou use o CMD aberto como administrador:

```bat
dism /Online /Add-Capability /CapabilityName:OpenSSH.Client~~~~0.0.1.0
```

Teste a conexão substituindo `SEU_USUARIO` e `SEU_HOST` pelos valores fornecidos para o ambiente:

```console
ssh SEU_USUARIO@SEU_HOST
```

Na primeira conexão, compare a impressão digital apresentada pelo SSH com a informação fornecida pela equipe responsável antes de aceitá-la. Não prossiga enquanto o comando não abrir um shell no Ubuntu. Para encerrar o teste, execute:

```bash
exit
```

Se a organização não tiver fornecido uma chave SSH, gere uma no Windows:

```console
ssh-keygen -t ed25519 -a 100
```

Proteja a chave privada com uma senha. A instalação da chave pública no servidor deve seguir o processo autorizado pela organização; nunca envie o arquivo `id_ed25519` privado. Teste novamente com `ssh SEU_USUARIO@SEU_HOST` depois que a chave pública for cadastrada.

No VS Code, pressione `Ctrl+Shift+P`, execute **Remote-SSH: Connect to Host...** e informe o mesmo `SEU_USUARIO@SEU_HOST`. Selecione **Linux** quando o VS Code solicitar a plataforma. O VS Code instalará e atualizará seu servidor no Ubuntu automaticamente.

Depois da conexão:

1. confirme no canto inferior esquerdo que a janela mostra `SSH: SEU_HOST`;
2. use **File > Open Folder** e abra `/caminho/para/portal-de-observabilidade` no Ubuntu;
3. abra **Terminal > New Terminal** e confirme o ambiente:

```bash
cat /etc/os-release
node --version
npm --version
pwd
```

As extensões não são sincronizadas automaticamente com o host remoto. No terminal integrado da janela SSH, instale as extensões que executam no workspace remoto:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension EditorConfig.EditorConfig
```

Mantenha `ms-vscode-remote.remote-ssh` instalado apenas no VS Code local do Windows. Se o comando `code --install-extension` remoto não estiver disponível, use a aba **Extensions** da janela SSH e escolha **Install in SSH: SEU_HOST** para cada extensão de workspace.

## 7. Instalar o React Developer Tools

Para aplicações Web, instale o [React Developer Tools](https://react.dev/learn/react-developer-tools) diretamente no Chrome, Edge ou Firefox. A extensão adiciona as abas **Components** e **Profiler** às ferramentas do navegador.

Não execute `npm install --global react-devtools` no fluxo Web comum. A versão global é destinada principalmente a navegadores sem extensão compatível e exige configuração adicional.

## 8. Preparar `obs-web`

Execute esta seção no ambiente em que a aplicação rodará: Windows local ou terminal Bash da janela Ubuntu Remote. Não instale as dependências nos dois sistemas para compartilhar o mesmo diretório `node_modules`.

Entre no diretório da aplicação:

```console
cd obs-web
```

Escolha apenas um dos fluxos abaixo.

### Fluxo A — o projeto já possui `package.json` e `package-lock.json`

Instale exatamente as dependências registradas no lockfile:

```console
npm ci
npm run dev
```

`npm ci` recria `node_modules` a partir de `package-lock.json`. Se ele informar divergência entre `package.json` e o lockfile, não edite nem apague o lockfile manualmente; confirme a branch ou a alteração de dependências com a equipe.

### Fluxo B — `obs-web` ainda está vazio

Escolha a estratégia antes de gerar qualquer arquivo. O [React Router Framework Mode](./react-router-framework.md) é o padrão recomendado para o portal porque já estrutura roteamento, rotas tipadas, carregamento de dados, divisão de código e SSR; escolha o [Vite para SPA](./vite-spa.md) somente quando a aplicação for exclusivamente cliente, não precisar de SSR e a equipe aceitar configurar roteamento e recursos de framework separadamente. As duas estratégias usam React, TypeScript, Node.js, NPM, Vite no processo de desenvolvimento e Microsoft Fluent UI React v9, mas não devem ser combinadas nem executadas uma depois da outra no mesmo diretório.

Abra o guia escolhido e execute todos os passos dele. Não use `--overwrite`: se `obs-web` já contiver arquivos, volte ao Fluxo A ou confirme a origem desses arquivos com a equipe.

## 9. Iniciar e validar a aplicação

Ainda dentro de `obs-web`, inicie o servidor de desenvolvimento:

```console
npm run dev
```

O terminal mostrará o endereço local da aplicação. Mantenha esse processo aberto e use `Ctrl+C` para encerrá-lo.

No Ubuntu Remote, mantenha o servidor de desenvolvimento escutando apenas no host remoto. O VS Code normalmente detecta a porta, geralmente `5173`, e oferece o encaminhamento para o Windows. Se isso não ocorrer, abra a visualização **Ports**, selecione **Forward a Port** e informe a porta mostrada no terminal. Não use `--host 0.0.0.0` sem autorização para expor o servidor de desenvolvimento à rede.

Antes de entregar uma alteração, execute:

```console
npm run lint
npm run --if-present typecheck
npm exec --no -- prettier . --check
npm run build
```

Para aplicar a formatação do Prettier conscientemente:

```console
npm exec --no -- prettier . --write
```

O argumento `--write` altera os arquivos. Revise as modificações antes de fazer commit.

Para executar localmente a compilação de produção, use o comando correspondente à estratégia escolhida.

React Router Framework Mode:

```console
npm run start
```

Vite para SPA:

```console
npm run preview
```

## 10. Rotina com NPM

Execute os comandos no diretório que contém o `package.json` correspondente.

| Objetivo | Comando |
| --- | --- |
| Instalar um clone com lockfile | `npm ci` |
| Adicionar dependência de produção | `npm install <pacote>` |
| Adicionar ferramenta de desenvolvimento | `npm install --save-dev <pacote>` |
| Remover uma dependência | `npm uninstall <pacote>` |
| Executar um script | `npm run <script>` |
| Executar uma ferramenta local sem download temporário | `npm exec --no -- <ferramenta> <argumentos>` |
| Verificar pacotes desatualizados | `npm outdated` |
| Auditar dependências | `npm audit` |

Regras obrigatórias:

- use somente Node.js e NPM;
- não crie `yarn.lock`, `pnpm-lock.yaml` ou `bun.lock`;
- não instale React, Vite, ESLint ou Prettier globalmente;
- mantenha `package.json` e `package-lock.json` na mesma alteração;
- não edite o `package-lock.json` manualmente;
- não execute `npm audit fix --force` sem revisar possíveis alterações incompatíveis;
- não versione o diretório `node_modules`.

## 11. Solução de problemas

### `node`, `npm`, `git` ou `code` não é reconhecido

Feche e reabra o terminal. Se ainda falhar, reinicie o Windows e execute novamente os comandos de verificação da seção 2.

### O PowerShell bloqueia `npm.ps1`

Não reduza a política de segurança global da máquina. Abra o CMD ou use `npm.cmd` para confirmar o diagnóstico:

```console
npm.cmd --version
```

No CMD, os comandos normais continuam sendo `npm`, `npm ci` e `npm run dev`.

### O NPM não encontrou `package.json`

Confirme que o terminal está em `obs-web`:

PowerShell:

```powershell
Get-Location
Test-Path .\package.json
```

CMD:

```bat
cd
if exist package.json (echo package.json encontrado) else (echo package.json nao encontrado)
```

### O `create-react-router` copiou o template, mas falhou ao instalar dependências

Não execute o gerador novamente e não use `--overwrite`. Se `package.json` existir, mas `package-lock.json` e `node_modules` ainda não existirem, conclua a etapa que falhou:

```console
npm install
```

Em algumas versões do `create-react-router` no Windows, o gerador pode copiar o template corretamente e falhar ao iniciar o processo filho do NPM. O guia de criação evita esse caminho usando `--no-install` e executando `npm install` separadamente. Se a instalação manual também falhar, use o novo log indicado pelo NPM; ele conterá a causa real da instalação.

### `npm ci` informa divergência no lockfile

Confirme se a branch está atualizada. Se a alteração de dependências for intencional, use `npm install`, revise `package.json` e `package-lock.json` e execute novamente as validações.

### Erro de certificado, proxy ou registro corporativo

Não desative a validação SSL. Consulte a configuração oficial da organização e verifique o registro atual:

```console
npm config get registry
```

### ESLint ou Prettier não funciona no VS Code

Com o terminal em `obs-web`, confirme as ferramentas locais:

```console
npm ls eslint prettier --depth=0
npm exec --no -- eslint --version
npm exec --no -- prettier --version
```

Se `npm ls` apontar uma dependência ausente, corrija o `package.json` com a equipe antes de prosseguir. Depois, no VS Code, execute **Developer: Reload Window** pela paleta de comandos. Não resolva o problema instalando essas ferramentas globalmente.

### O Windows não consegue conectar ao Ubuntu

No Windows, obtenha o diagnóstico detalhado do SSH:

```console
ssh -vvv SEU_USUARIO@SEU_HOST
```

No console do Ubuntu, confira o serviço e os utilitários exigidos pelo VS Code Server:

```bash
sudo systemctl status ssh --no-pager
command -v bash
command -v tar
command -v curl
ldd --version
```

Valide endereço, usuário, chave, porta, grupo de segurança e firewall com a equipe responsável. Não desative a validação de identidade do host nem abra o SSH para toda a Internet como correção rápida.

### `nvm` não é reconhecido no Ubuntu

Recarregue a configuração do Bash e verifique novamente:

```bash
source ~/.bashrc
command -v nvm
```

Se continuar ausente, revise a saída do instalador e as últimas linhas de `~/.bashrc`. Não tente corrigir instalando Node.js e NPM globalmente com `sudo apt`.

### NPM apresenta `EACCES` no Ubuntu

Confirme que Node.js e NPM pertencem à instalação do NVM:

```bash
whoami
command -v node
command -v npm
npm config get prefix
```

Os caminhos devem apontar para o diretório do NVM no usuário atual. Não use `sudo npm` nem altere recursivamente as permissões de `/usr`, `/home` ou da raiz do projeto.

### A aplicação remota iniciou, mas não abre no Windows

Confirme no Ubuntu a porta informada pelo Vite:

```bash
ss -ltnp | grep 5173
```

Depois, encaminhe essa porta pela visualização **Ports** do VS Code. Use a URL local apresentada pelo encaminhamento, que pode ter uma porta diferente da porta remota.

## 12. Checklist de onboarding

- [ ] Git, VS Code, Node.js LTS e NPM respondem no terminal.
- [ ] A raiz `portal-de-observabilidade` está aberta no VS Code.
- [ ] ESLint, Prettier e EditorConfig estão instalados no VS Code.
- [ ] Para Ubuntu Remote, o SSH está ativo e `ssh SEU_USUARIO@SEU_HOST` funciona no Windows.
- [ ] Para Ubuntu Remote, a janela mostra `SSH: SEU_HOST` e as extensões de workspace estão instaladas no host.
- [ ] Para Ubuntu Remote, Node.js e NPM são fornecidos pelo NVM sem uso de `sudo npm`.
- [ ] React Developer Tools está instalado no navegador.
- [ ] A estratégia de projeto foi registrada: React Router Framework Mode ou Vite para SPA.
- [ ] `obs-web/package.json` e `obs-web/package-lock.json` existem.
- [ ] As dependências foram instaladas com `npm ci` ou `npm install` no fluxo de criação.
- [ ] `npm run dev` inicia a aplicação.
- [ ] `npm run lint`, Prettier e `npm run build` são aprovados.
- [ ] Nenhuma dependência do projeto foi instalada globalmente.

## Referências oficiais

- [Comando `winget install`](https://learn.microsoft.com/windows/package-manager/winget/install)
- [Notas de versão do Ubuntu 26.04 LTS](https://documentation.ubuntu.com/release-notes/26.04/)
- [VS Code Remote Development por SSH](https://code.visualstudio.com/docs/remote/ssh)
- [Pré-requisitos Linux do VS Code Remote](https://code.visualstudio.com/docs/remote/linux)
- [Instalação e uso do NVM](https://github.com/nvm-sh/nvm)
- [Instalação do React](https://react.dev/learn/installation)
- [React Router em Framework Mode](https://reactrouter.com/start/framework/installation)
- [Modos de uso do React Router](https://reactrouter.com/start/modes)
- [Criação de projeto com Vite](https://vite.dev/guide/)
- [Skill Fluent UI React do repositório](../codex/skills/fluent-ui-react/SKILL.md)
- [Instalação local de pacotes com NPM](https://docs.npmjs.com/downloading-and-installing-packages-locally/)
- [Execução de ferramentas locais com `npm exec`](https://docs.npmjs.com/cli/npm-exec/)
- [Instalação do Prettier](https://prettier.io/docs/install/)
- [Extensões recomendadas no VS Code](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
