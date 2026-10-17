# Auditoria de segurança e LGPD

A área `/seguranca/auditoria` consulta os eventos emitidos pelo Identity Access
Service. Ela apoia investigação, rastreabilidade e prestação de contas; sua
implementação não certifica conformidade da organização com a LGPD.

## Consulta e evidências

- A tela utiliza a largura disponível, com resumo da consulta, filtros em grade,
  tabela com rolagem própria e cabeçalho fixo. Os filtros podem ser recolhidos.
- Filtros: busca geral, início e fim, resultado, tipo de evento, usuário
  (identificador, nome ou login atual), recurso, provedor, trace ID e UUID do evento.
  Evento, provedor e identificadores usam correspondência exata; usuário e recurso
  aceitam trechos literais. `platform` representa eventos sem provedor.
- Ordenação no servidor por data, evento, usuário, recurso, provedor ou resultado,
  crescente/decrescente, com desempate por data e UUID. O usuário é ordenado pelo
  nome atual, quando disponível. A paginação aceita até 100 registros por página.
- Datas apresentadas em Brasília; persistência e evidências usam instantes UTC.
  Sem período informado, a consulta abrange os últimos 30 dias. Isso é um filtro,
  não uma política de retenção ou descarte.
- A resposta devolve os filtros efetivamente aplicados e um instante de corte
  (`snapshotAt`), reutilizados ao paginar e exportar. Cada consulta usa uma
  transação PostgreSQL `REPEATABLE READ` para manter total e linhas consistentes.
  O corte temporal não é um snapshot persistido: inserções retroativas, alterações
  no cadastro e intervenções no banco podem afetar uma consulta futura.
- Nomes e logins na tela são enriquecimentos do cadastro atual. O identificador
  original do autor permanece no evento. Não se apresenta o nome atual como uma
  informação histórica imutável.

## Exportações

`POST /api/v1/security/audit/export` recebe os mesmos parâmetros da consulta e um
corpo `{ "format": "json", "purpose": "Investigação autorizada ...", "includeActorNames": false }`.

Exige `audit:read`, `audit:export`, sessão válida e CSRF. A permissão `audit:export`
é independente da consulta e é concedida ao perfil `OBS_ADMIN` pela migration V003.
Outros perfis precisam recebê-la explicitamente. Incluir nomes/logins atuais exige
também `identity:read`; eles são omitidos por padrão. Os identificadores originais
continuam sendo dados potencialmente pessoais, e não dados anonimizados.

| Formato | Conteúdo | Limite por geração |
| --- | --- | --- |
| CSV | UTF-8 com BOM, separador `;`, campos entre aspas e metadados JSON em cada linha | 10.000 eventos |
| XLSX | Aba `Eventos`, filtro e cabeçalho congelado; aba `Evidência` com contexto da geração | 10.000 eventos |
| JSON | Objeto `metadata` e array `events`, adequado a integrações | 10.000 eventos |
| PDF | Relatório paginado, filtros, finalidade, identificação e referência em cada página | 1.000 eventos |

O arquivo inclui todo o conjunto filtrado, na ordenação escolhida, e ignora o
offset e o tamanho de página da tela. Não há truncamento silencioso: acima do
limite, a API recusa a geração e pede refinamento dos filtros. Há uma geração por
vez por instância para limitar consumo de memória.

A finalidade tem de 10 a 500 caracteres. A confirmação de uso autorizado orienta
o operador; ela não constitui consentimento do titular nem substitui uma base
legal de tratamento. Não informe senhas, tokens ou dados pessoais desnecessários.

Cada geração concluída registra `audit.exported` e um recibo em
`audit_export_receipt`: referência, solicitante, instante, formato, finalidade,
quantidade, filtros/opções e SHA-256 dos dados. O recibo comprova a geração pelo
serviço, não o download, o recebimento ou o uso posterior pelo destinatário.

O SHA-256 é calculado sobre o array de eventos serializado em JSON UTF-8 pelo
mesmo serviço. Para conferir um JSON exportado, serialize o seu array `events`
com a mesma representação e compare com `metadata.datasetSha256`. Não se deve
calcular o hash do arquivo inteiro esperando o mesmo resultado. Esse hash ajuda
a conferir os dados; não é assinatura digital, carimbo de tempo confiável ou
garantia contra um administrador capaz de alterar dados e recibos.

CSV neutraliza fórmulas iniciadas por `=`, `+`, `-`, `@` e controles relevantes,
inclusive após espaços iniciais. XLSX grava células como texto, sem fórmulas
geradas a partir dos valores. JSON mantém os valores originais. PDF preserva
caracteres que a fonte não representa como `[U+XXXX]`, e controles como escapes,
evitando perda silenciosa de informação. Os cabeçalhos técnicos de CSV/XLSX/JSON
são estáveis: `event_id`/`id`, `occurred_at_utc`/`occurredAt`, `event_type`/`eventType`,
`actor_subject`/`actorSubject`, `actor_username`/`actorUsername`,
`actor_display_name`/`actorDisplayName`, `target`, `provider_id`/`providerId`,
`outcome`, `trace_id`/`traceId` e `source_context`/`sourceContext`.

As respostas de consulta/exportação pelo portal usam `Cache-Control: no-store`.
Downloads são arquivos locais: passam a depender dos controles de armazenamento,
compartilhamento e descarte da estação e da organização.

## Controles e decisões de governança

| Referência | Entregue nesta área | Decisão/controle organizacional necessário |
| --- | --- | --- |
| Art. 6º: finalidade, adequação e necessidade | Finalidade registrada; nomes atuais opcionais; dados de credenciais não são parte do contrato de exportação | Definir finalidades legítimas, bases legais e pessoas autorizadas; revisar campos/contextos emitidos pelas aplicações |
| Art. 6º: qualidade e transparência | Datas com fuso, identificadores originais, origem dos nomes atuais e consulta reproduzível por parâmetros | Manter avisos de privacidade, inventário de dados e canais para exercício de direitos |
| Art. 6º: segurança, prevenção e responsabilização; art. 46 | RBAC, CSRF, exportação auditada, limites, proteção de planilhas e respostas sem cache | HTTPS corporativo, criptografia/gestão de chaves, restrição dos bancos/backups e monitoramento de acessos |
| Art. 37: registros das operações de tratamento | Evidências operacionais de ações de segurança e de geração de arquivos | Manter o registro organizacional das operações de tratamento; esta trilha técnica não o substitui |
| Arts. 15 e 16: término/conservação | Não foi criado descarte automático nem exclusão pela interface | Aprovar tabela de temporalidade, hipóteses de conservação, bloqueios por investigação e processo de descarte, incluindo backups e arquivos exportados |
| Proteção de evidências | API de auditoria sem edição/exclusão; referência e hash para conferência | Segregar administradores, proteger contra alteração no banco e considerar armazenamento externo imutável/assinaturas quando a política exigir |
| Cobertura e resposta a incidentes | Eventos de autenticação, autorização e administração já emitidos pelo serviço de identidade | Expandir cobertura dos demais serviços, assegurar relógios sincronizados e integrar com SIEM/alertas e processo de resposta a incidentes |

Respostas HTTP 401/403 emitidas diretamente pelos filtros de segurança não são,
por si só, um evento desta tabela. A cobertura corporativa deve incluir também
esses acessos negados e falhas de CSRF nos mecanismos de monitoramento e auditoria
do ambiente; a tela não deve ser tratada como uma coleta completa de todo o tráfego.

Não se deve ativar logging DEBUG de segurança/HTTP/SQL em produção sem revisão:
filtros, corpos e cabeçalhos podem conter identificadores pessoais ou segredos.
Não se registram IPs ou agentes de navegador adicionais apenas por conveniência;
se necessários à investigação, devem ter finalidade, proteção e retenção definidas.

## Fontes

- [ANPD — Perguntas frequentes](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes): princípios, responsabilidades, término e duração do tratamento.
- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm): arts. 6º, 15, 16, 37 e 46.
- [OWASP — Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): atributos, exclusão de segredos, proteção e registro de exportações.
- [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final): referência técnica para controles de auditoria; não constitui uma exigência adicional da LGPD.

Validação técnica: PostgreSQL 18.6 no WSL, banco e usuário isolados para testes,
consultas combinadas, ordenação/paginação, exportação integral, conferência de
hash, abertura de XLSX/PDF, CSRF, segregação de permissões e limites de volume.
Foram aprovados 98 testes de backend e 20 de frontend. Um teste legado baseado em
Testcontainers foi pulado por indisponibilidade de Docker; a integração desta
entrega foi executada com PostgreSQL e Redis reais. A consulta representativa de
10.001 eventos foi examinada com `EXPLAIN (ANALYZE, BUFFERS)`; isso não constitui
benchmark de uma base corporativa de produção.
