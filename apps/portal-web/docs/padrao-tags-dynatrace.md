# Padrão de tags e rastreabilidade do Dynatrace

Versão da taxonomia: **1.0**  
Escopo: **Latest Dynatrace**, OneAgent, Kubernetes, OpenTelemetry, serverless, RUM, dashboards e alertas.

## Princípio

O orçamento é a origem administrativa da instrumentação, mas não substitui os identificadores técnicos do Dynatrace. A rastreabilidade é formada por três vínculos:

1. o ID imutável do orçamento, emitido pelo portal;
2. as Primary Grail Tags propagadas com a telemetria;
3. os IDs nativos das entidades, dos frontends, dos documentos e das configurações criadas no Dynatrace.

O contrato principal usa `primary_tags.*`. Esse modelo transporta o contexto para logs, métricas, spans, eventos, problemas e nós Smartscape. Auto-tags e entity tags ficam restritas à compatibilidade com ambientes Dynatrace Classic.

## Chaves canônicas

| Chave | Origem | Regra |
|---|---|---|
| `primary_tags.observability_quote_id` | ID preparado no rascunho e confirmado no envio | Obrigatória e imutável após o envio. Identifica o orçamento que autorizou o recurso ou artefato novo. |
| `primary_tags.instrumentation_id` | Escopo criado após a aprovação | Obrigatória na execução. Identifica um alvo lógico de instrumentação e nunca uma instância efêmera. |
| `primary_tags.business_unit` | Vertical de negócio | Contexto organizacional. |
| `primary_tags.product` | Produto informado no orçamento | Contexto de negócio livre, normalizado conforme esta taxonomia. Não é um valor de rateio DPS. |
| `primary_tags.application` | Nome do sistema | Sistema pai; não é o nome de um microsserviço. |
| `primary_tags.system_lifecycle` | Estágio do sistema | Enumeração `project` ou `production`. |
| `primary_tags.team` | Squad | Opcional. Deve representar o time operacional responsável. |
| `primary_tags.sdm_category` | Categoria Porto SDM | Contexto para incidentes e roteamento operacional. |
| `primary_tags.environment` | Ambiente do alvo | Exatamente um valor por conjunto: `development`, `staging` ou `production`. |
| `dt.cost.product` | Produto canônico de rateio | Condicional. Só é publicado depois que a revisão mapear o produto livre para um valor existente na lista de produtos permitidos (Product allow list) do DPS. |
| `dt.cost.costcenter` | Centro de custo canônico | Condicional. Só é publicado depois que a revisão mapear o dado do orçamento para um valor existente na lista de centros de custo permitidos (Cost center allow list) do DPS. |

`primary_tags.product` e `dt.cost.product` têm finalidades diferentes e podem coexistir: o primeiro preserva a classificação livre do orçamento; o segundo controla o rateio financeiro. Os valores de `dt.cost.product` e `dt.cost.costcenter` devem ser copiados exatamente das listas de valores permitidos (allowlists) vigentes. Eles nunca são derivados apenas pela normalização do texto digitado pelo solicitante. Enquanto não houver um mapeamento validado, o centro de custo informado permanece somente no orçamento e não é publicado na telemetria. Um host pode ter no máximo um produto e um centro de custo efetivos para rateio.

O manifesto-base adota no máximo nove atributos efetivos por alvo e a política corporativa limita o conjunto final a doze. Essa margem comporta os campos condicionais de custo e um AppID ou CMDB ID aprovado sem ultrapassar o teto interno. Isso não é um limite técnico do Dynatrace: o OneAgent aceita oficialmente até 20 Primary Grail Tags combinadas nos escopos de host e processo; atributos excedentes são descartados silenciosamente, sem aviso. A revisão técnica deve considerar também tags preexistentes, resolver o conjunto final antes da implantação e nunca depender desse descarte. A versão da taxonomia fica no manifesto do orçamento, e não como mais uma dimensão da telemetria.

O portal emite o `instrumentation_id` depois da aprovação no formato `INS-AAAAMMDD-SUFIXO-TIPO-NNN`, por exemplo `INS-20260911-A1B2C3D4E5-K8S-001`. Os tipos iniciais são `HOST`, `K8S`, `AG` (somente dedicado), `LAMBDA`, `AZFUNC`, `RUMWEB` e `RUMMOBILE`. Um identificador representa um alvo lógico estável; réplicas, pods, processos e instâncias efêmeras herdam o mesmo valor.

Enquanto o portal não estiver integrado ao catálogo corporativo, o ID do orçamento é a única chave empresarial imutável que ele pode emitir. Não derive um AppID ou CMDB ID do nome livre do sistema. Quando o identificador oficial estiver disponível, use exatamente uma chave — `primary_tags.appid` ou `primary_tags.cmdbid` — e reavalie o limite do conjunto antes de publicá-la.

## Normalização

- As chaves são em inglês, ASCII e `lower_snake_case` depois do prefixo reservado.
- O ID do orçamento é preservado exatamente como emitido, por exemplo `ORC-20260911-A1B2C3D4E5`.
- Nomes informados por pessoas viram valores técnicos em minúsculas, sem acentos e em `lower-kebab-case`.
- Por política corporativa, valores derivados de texto livre têm no máximo 63 caracteres. Valores maiores recebem um sufixo determinístico para reduzir colisões. Esse tamanho não deve ser apresentado como limite universal de valores do Dynatrace.
- Valores canônicos de `dt.cost.product` e `dt.cost.costcenter`, assim como identificadores nativos do Dynatrace ou do provedor de nuvem, são preservados exatamente como cadastrados e não passam por normalização.
- O valor legível original permanece no orçamento e no PDF; a normalização afeta somente a tag.
- Nome e e-mail do solicitante ou do gestor nunca são enviados à telemetria. São dados pessoais, mutáveis e de alta cardinalidade.
- O tipo da solicitação e o orçamento anterior não são tags de recurso. A relação pai-filho é mantida no portal, e cada artefato novo recebe o ID do orçamento que o autorizou.

## Aplicação por alvo

### Hosts e processos

Em um host dedicado, configure os atributos com `oneagentctl --set-host-tag`. Em host compartilhado, configure `DT_TAGS` no processo, pois o valor no processo prevalece sobre o valor no host. O portal gera os dois formatos.

O contrato requer OneAgent 1.333 ou posterior para o enriquecimento por Primary Grail Tags. A disponibilidade deve ser validada no tenant antes da execução. O limite oficial é de 20 Primary Grail Tags no conjunto combinado de host e processo; quando a mesma chave existir nos dois escopos, o valor do processo prevalece.

No `oneagentctl`, cada argumento `key=value` pode ter até 256 caracteres, incluindo o delimitador. O valor não pode conter espaços nem outro caractere `=`, e a chave não pode começar com `#`. A política corporativa de 63 caracteres para valores normalizados permanece mais restritiva e facilita o uso consistente entre os mecanismos.

### Kubernetes

Pré-requisitos do padrão: Dynatrace Operator 1.10 ou posterior, OneAgent 1.333 ou posterior, ActiveGate 1.343 ou posterior e `.spec.metadataEnrichment.enabled: true` no DynaKube. Mesmo em modos nos quais versões recentes do Operator possam habilitar o enriquecimento implicitamente, o manifesto corporativo deve declará-lo de forma explícita para tornar a intenção auditável.

Use anotações `metadata.dynatrace.com/<chave>` no namespace somente quando **todos** os workloads desse namespace compartilharem o mesmo valor. Quando houver produtos, sistemas, squads, orçamentos ou escopos diferentes, aplique as anotações em `spec.template.metadata.annotations` de cada workload. Um valor do pod prevalece sobre o namespace.

O limite de 63 caracteres do Kubernetes se aplica ao sufixo sanitizado da chave da anotação depois de `metadata.dynatrace.com/`; não é o limite geral do valor da tag. As anotações manuais de pod enriquecem a telemetria do workload, mas não cobrem métricas da plataforma Kubernetes nem eventos Kubernetes. Para esses sinais, use o enriquecimento no namespace ou outra configuração central compatível com o escopo real.

Não aplique sistema, orçamento ou produto em `DynaKube.spec.resourceAttributes` quando o cluster for compartilhado: esse escopo alcança todos os sinais do cluster, inclusive ActiveGate. Campos nativos como `k8s.cluster.name`, `k8s.namespace.name`, workload, pod e container não devem ser duplicados como tags corporativas.

### Serverless com OneAgent

Em AWS Lambda e Azure Functions instrumentadas por módulos de código (code modules) do OneAgent, use `DT_TAGS`, com pares `key=value` separados por espaço. Serverless não usa `oneagentctl`; os atributos devem fazer parte da configuração de implantação da função.

Além das `primary_tags.*`, informe em `DT_TAGS` os Primary Grail Fields que o OneAgent serverless não puder detectar automaticamente:

- AWS: `aws.account.id` e `aws.region`;
- Azure: `azure.subscription`, `azure.resource.group` e `azure.location`.

Preserve esses valores de AWS e Azure exatamente como fornecidos pelo provedor. Registre também no portal os identificadores nativos da função, como ARN ou ID do recurso (resource ID), para a correlação pós-provisionamento. O enriquecimento de **logs** de AWS Lambda por `DT_TAGS` exige OneAgent 1.337 ou posterior; em versões anteriores, não presuma que os atributos das spans também estarão presentes nos logs.

### OpenTelemetry

Para SDKs e Collector OpenTelemetry, use `OTEL_RESOURCE_ATTRIBUTES`, com pares `key=value` separados por vírgula. Não reutilize a sintaxe de `DT_TAGS`. Mantenha os atributos semânticos do recurso — por exemplo `cloud.provider`, `cloud.account.id`, `cloud.region`, `cloud.resource_id`, `faas.name` e `faas.id` — ao lado das `primary_tags.*` de rastreabilidade aplicáveis.

`service.name` identifica o componente técnico e `service.namespace` pode agrupar os componentes do sistema. Nenhum dos dois deve incluir ambiente, squad ou ID do orçamento. Continue usando os identificadores nativos do provedor, como conta, região, ARN, subscription, resource group, `faas.name` e `faas.id`.

### ActiveGate

Um ActiveGate compartilhado não recebe tags de orçamento, sistema ou produto. Essas tags criariam uma associação falsa para a telemetria de outros sistemas que passa pelo mesmo componente.

Para um ActiveGate standalone, não presuma herança de tags do host, do OneAgent ou de outro componente. Registre no portal o ID nativo, o grupo do ActiveGate (ActiveGate group) e a network zone e relacione esses identificadores ao orçamento e ao `instrumentation_id`. Qualquer enriquecimento explícito de um ActiveGate dedicado deve ser tratado como configuração separada, com escopo comprovado e validação posterior no Grail. `custom.properties` não é um mecanismo de tags corporativas.

## RUM Web e RUM Mobile

O ID do orçamento não substitui o Application ID nem entra no nome do frontend. Use nomes estáveis, como `<sistema>-web` e `<sistema>-mobile`. Quando houver mais de um frontend no mesmo canal, use `<sistema>-<canal>-<frontend-slug>`, com um slug funcional estável e sem ambiente no nome. Registre no portal:

- `frontend.name`, nome estável e identidade principal para filtros de RUM;
- `dt.smartscape.frontend`, ID estável recomendado para o frontend;
- `dt.rum.instrumentation.id`, necessário para a instrumentação, mas ainda experimental e inadequado como única chave persistida;
- a referência Classic `APPLICATION-*` ou `MOBILE_APPLICATION-*`, quando existir, também sem adotá-la como a única chave do modelo atual.

Uma propriedade de sessão com o ID do orçamento é possível, mas não é o padrão: ela precisaria ser enviada em todas as sessões, consumiria uma das propriedades configuradas e poderia aumentar o consumo de RUM. Para correlação administrativa, o vínculo do portal com os IDs do frontend é suficiente.

## Dashboards, detectores e alarmes

Dashboards são documentos e usam labels, não entity tags. A convenção é:

```text
label: quote-orc-20260911-a1b2c3d4e5
descrição: Dashboard vinculado ao orçamento ORC-20260911-A1B2C3D4E5
```

O portal deve armazenar o Document ID retornado. Em tiles de infraestrutura, OneAgent, Kubernetes, OpenTelemetry ou serverless enriquecidos, as consultas podem filtrar pela tag do orçamento:

```dql
| filter primary_tags.observability_quote_id == "ORC-20260911-A1B2C3D4E5"
```

Essa regra não deve ser generalizada para RUM Web ou Mobile. Tiles de RUM usam `frontend.name` ou `dt.smartscape.frontend`. `session_properties.observability_quote_id` só pode ser consultada quando a propriedade opcional tiver sido previamente configurada e enviada pelo frontend.

Detectores DQL não possuem um campo de tags. Para cada detector, armazene o Settings `objectId` e use:

```text
source: portal-observabilidade
externalId: portal-observabilidade/orc-20260911-a1b2c3d4e5/anomaly/<detector-slug>
event property: observability.quote.id=ORC-20260911-A1B2C3D4E5
```

Detectores sobre infraestrutura e OpenTelemetry enriquecidos filtram por `primary_tags.*`; detectores sobre RUM filtram por `frontend.name` ou `dt.smartscape.frontend`. Um workflow disparado por Davis event pode filtrar diretamente `observability.quote.id`, incluído nas propriedades do evento. Quando o workflow for disparado por problema, essa propriedade precisa primeiro ser mapeada para um campo customizado do problema.

## Registro pós-provisionamento

Depois da aprovação, o portal deve manter uma relação muitos-para-muitos entre orçamento, escopo de instrumentação e objeto Dynatrace. Para cada objeto criado, registre:

- tipo e ambiente do alvo;
- ID nativo do recurso ou frontend;
- Document ID, Settings `objectId`, Workflow ID ou outro ID de configuração;
- data, executor e versão da configuração;
- resultado de uma consulta de verificação pela tag do orçamento.

Em uma adição, aplique o orçamento filho somente ao novo recurso ou artefato autorizado. Não sobrescreva a tag original de um host quando o orçamento filho contratar apenas um dashboard, um detector ou RUM.

## Verificação mínima

Após instrumentar, confirme a presença da correlação em mais de um sinal:

```dql
fetch spans
| filter primary_tags.observability_quote_id == "ORC-20260911-A1B2C3D4E5"
| fields timestamp, service.name, primary_tags.application,
    primary_tags.environment, primary_tags.observability_quote_id
| limit 20
```

Repita a verificação para logs, entidades Smartscape e eventos aplicáveis. O trabalho só deve ser encerrado depois de os IDs nativos retornados pelo Dynatrace serem vinculados ao orçamento.

## Referências oficiais

- [Primary Grail fields and tags](https://docs.dynatrace.com/docs/manage/tags/primary-tags)
- [Primary tags through OneAgent](https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/oneagent-attribute-enrichment)
- [OneAgent domain enrichment and its 20-tag limit](https://docs.dynatrace.com/docs/manage/tags/tags-domain-oneagent)
- [OneAgent configuration via command-line interface](https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/oneagent-configuration-via-command-line-interface)
- [Kubernetes tagging and enrichment](https://docs.dynatrace.com/docs/manage/tags/tags-domain-k8s)
- [Kubernetes metadata enrichment](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/guides/metadata-automation/metadata-enrichment)
- [Cost Allocation allowlists](https://docs.dynatrace.com/docs/manage-your-costs/allocate/plan-and-set-up)
- [AWS Lambda log enrichment](https://docs.dynatrace.com/docs/ingest-from/amazon-web-services/integrate-into-aws/aws-lambda-integration/collector)
- [Service naming](https://docs.dynatrace.com/docs/observe/application-observability/services/service-detection/service-naming)
- [RUM Semantic Dictionary](https://docs.dynatrace.com/docs/semantic-dictionary/model/rum/user-events)
- [Dashboards Document API](https://docs.dynatrace.com/docs/analyze-explore-automate/dashboards-and-notebooks/document-api)
- [Anomaly detector settings schema](https://docs.dynatrace.com/docs/dynatrace-api/environment-api/settings/schemas/builtin-davis-anomaly-detectors)
- [Custom problem fields](https://docs.dynatrace.com/docs/dynatrace-intelligence/problems-app/problems-app-custom-problem-field-examples)
