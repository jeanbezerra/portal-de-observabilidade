# Aplicações web

Este diretório reúne as aplicações frontend implantáveis do produto. Cada pasta
filha representa uma unidade que pode ser construída, versionada e publicada de
forma independente.

```text
apps/
├── portal-web/       # portal principal com React Router, SSR e BFF
├── status-web/       # futura SPA pública ou interna de status operacional
└── <dominio>-web/    # futuro frontend de domínio, quando houver autonomia real
```

Hoje, somente `portal-web` existe. Os demais nomes ilustram a convenção e não
devem ser criados antes de existir um caso de uso, uma equipe responsável e um
ciclo de implantação próprios.

## Convenções

- Use `<finalidade>-web` para aplicações e mantenha os nomes curtos e estáveis.
- Cada aplicação é dona de seu `package.json`, lockfile, `Dockerfile`, assets,
  rotas, testes e configuração de execução.
- Uma aplicação não importa código-fonte diretamente de outra aplicação.
- Código reutilizável só deve migrar para um futuro `packages/<capacidade>`
  quando houver ao menos dois consumidores reais e uma API pública definida.
- Serviços backend permanecem em `services/`; contratos entre frontend e
  backend devem ser explícitos e versionados.

## Evolução para microfrontends

`portal-web` continua sendo o shell SSR e o BFF específico da experiência do
portal. Um domínio deve virar microfrontend apenas quando precisar de autonomia
de equipe, release e implantação. A divisão de pastas prepara esse caminho sem
acoplar a solução agora a Module Federation, monorepo tooling ou outro runtime
de composição.

Quando surgir a segunda aplicação ou o primeiro pacote compartilhado, a equipe
deve avaliar workspaces NPM, Nx ou Turborepo com base nos builds e pipelines
reais. Até lá, os comandos continuam locais a cada aplicação, por exemplo:

```shell
cd apps/portal-web
npm ci
npm run build
```
