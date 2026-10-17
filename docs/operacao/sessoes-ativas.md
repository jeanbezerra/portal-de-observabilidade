# Gerenciamento de sessões ativas

O portal `/seguranca/sessoes` consulta o índice de sessões do identity-access-service no Redis. `session:read` permite consultar e `session:revoke` permite encerrar. O seletor de usuários requer `identity:read`; sem essa permissão, a navegação começa na própria conta. As permissões de sessão são administrativas e não implicam restrição de consulta apenas ao próprio usuário.

## Consulta e expiração

`GET /api/v1/security/sessions/overview?subject=...` retorna o instante do servidor e as sessões do usuário. A lista exclui sessões expiradas por inatividade ou pelo limite absoluto configurado. A expiração efetiva é o menor desses dois prazos. O endpoint anterior `GET /sessions?subject=...` continua retornando uma lista.

A tela oferece busca, filtros de sessão/provedor/atividade, seis ordenações, paginação, seleção por página e detalhes. Os dados são uma consulta pontual: atualizar é uma ação manual. O contador usa o relógio retornado pela API e tempo decorrido monotônico no navegador. O prazo mostrado pode ser renovado por atividade em outro acesso; quando o prazo da consulta é atingido, a tela pede atualização e não afirma que a sessão foi encerrada. Não há polling que mantenha uma página ociosa autenticada.

## Encerramento

`POST /api/v1/security/sessions/revoke` exige autenticação, CSRF e `session:revoke`. O corpo contém `subject`, de 1 a 100 referências SHA-256 em `references`, e um motivo: `USER_REQUEST`, `SUSPICIOUS_ACTIVITY`, `SHARED_DEVICE` ou `ADMINISTRATIVE`. Somente referências pertencentes ao usuário informado são consideradas. As ações “outras” e “todas” enviam as referências da consulta confirmada, preservando logins posteriores. Sessões ausentes são informadas em `alreadyEnded`.

Cada remoção gera `session.revoked` com ator, usuário afetado, referência pública, motivo e trace ID. A operação Redis e a publicação no banco de auditoria não formam uma transação distribuída: uma falha durante um lote pode produzir encerramento parcial. Uma nova consulta e o reenvio das referências permitem concluir a ação. Não há garantia de cancelamento de requisições que já estavam em execução. O cookie real não é exposto na API.

Encerrar o acesso atual limpa o estado do portal e comunica a saída às outras abas. Encerrar sessões não bloqueia novos logins, não revoga tokens de integrações e não encerra uma sessão independente no IdP. Bloqueio de conta permanece uma ação administrativa na área Usuários.

## Minimização de dados

Novos logins registram apenas classificações aproximadas de navegador, sistema e dispositivo, além do provedor usado. O User-Agent é recebido para classificação, mas seu valor integral, versões, IP, localização e identificadores de dispositivo não são armazenados por esta funcionalidade. Esses rótulos são informados pelo cliente e podem ser imprecisos ou falsificados; não constituem prova de identidade nem avaliação de risco.

Os metadados acompanham a sessão no Redis; sessões anteriores à atualização aparecem sem os rótulos indisponíveis. Os eventos de encerramento seguem a política de retenção da auditoria da organização. Esta funcionalidade não define prazo legal de retenção nem representa, isoladamente, conformidade com a LGPD.

## Validação da entrega

A implementação permanece no application service da feature Administração, com controller responsável por validação e autorização. A captura de rótulos no login pertence à configuração compartilhada de segurança, preservando a proteção contra fixação de sessão. Não houve alteração de schema nem inclusão de biblioteca na aplicação.

Fluent UI React:

- Versão e pacotes: React 19, Fluent UI React v9.74.7 e ícones oficiais v2.0.340, conforme lockfile.
- Componentes e composição: Card, Field, Combobox com Option, Input, Select, Checkbox, Table com cabeçalho/corpo, Dialog e confirmação destrutiva com formulário.
- Fidelidade visual e comportamental: largura disponível no desktop, quatro indicadores, filtros em duas colunas em telas intermediárias e cartões de sessão no celular. Seleção por página e motivos de encerramento confirmados antes da alteração.
- Tokens, tema, fundamentos e ícones: estilos com Griffel e tokens semânticos; tema claro existente preservado e cores forçadas verificadas.
- Conteúdo e localização: textos em português, horários de Brasília, distinção entre sessão ativa, atividade recente, inatividade e limite absoluto. Rótulos de dispositivo não são sinais de risco.
- Acessibilidade: nomes acessíveis, operação do seletor por teclado, retorno de foco dos detalhes, confirmação com aviso de encerramento próprio, refluxo em 390/320 px e axe sem violações nos estados examinados.
- Testes executados: 22 testes de frontend; typecheck, builds de produção Windows/Linux e verificação dos 88 assets por HTTP. Backend: 102 testes aprovados, um teste legado de Testcontainers ignorado por ausência de Docker; integração executada em PostgreSQL 18.6 e Redis reais em banco/namespace isolados. No WSL: autenticação, metadados, prazos, CSRF, isolamento por usuário, reenvio idempotente, revogação das outras sessões, encerramento próprio e aviso às abas, usando conta temporária removida após os testes. No navegador com API simulada: filtros combinados, seis ordenações, paginação, seleção, troca de usuário, estados vazio/erro e acesso somente leitura.
- Exceções ou bloqueios: não houve validação manual com leitor de tela. Os ensaios de acessibilidade automatizados e de teclado não substituem essa avaliação.
- Resultado: CONFORME COM EXCEÇÕES quanto ao escopo Fluent examinado; não representa certificação de acessibilidade ou de conformidade legal.

As escolhas de interação seguem as orientações oficiais de [Combobox](https://fluent2.microsoft.design/components/web/react/core/combobox/usage) e [Dialog](https://fluent2.microsoft.design/components/web/react/core/dialog/usage) do Fluent 2.

Revisão visual das ações: encerramento de sessões, exclusões, desabilitação de provedores e remoção de vínculos usam texto e borda com tokens de perigo; a confirmação destrutiva usa preenchimento vermelho e texto branco. Os estilos são compartilhados em `security-action-styles.ts`, preservando foco e aparência desabilitada do Fluent. Foram conferidos contraste de texto de pelo menos 4,5:1 em repouso, hover e pressionamento, confirmação, teclado e cores forçadas; os ensaios automatizados de acessibilidade permaneceram sem violações. A composição segue a orientação de [Button do Fluent 2](https://fluent2.microsoft.design/components/web/react/core/button/usage).
