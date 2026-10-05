import {
  Button,
  Checkbox,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Select,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import { AddRegular } from "@fluentui/react-icons";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { PageBreadcrumb } from "../../components/page-breadcrumb";
import {
  defaultJobGroups,
  type JobGroup,
} from "./job-group-model";
import { loadJobGroups } from "./job-group-storage";
import {
  triggerTypes,
  type ScheduledJob,
  type TriggerType,
} from "./scheduled-jobs-model";
import {
  HttpRequestEditor,
  initialHttpRequestDraft,
  toHttpRequestConfiguration,
  validateHttpRequestDraft,
  type HttpRequestDraft,
} from "./http-request-editor";
import {
  createScheduledJob,
  getSchedulerServiceError,
  listJobTypes,
  listScheduledJobs,
  type JobTypeOption,
} from "./scheduler-service-client";

const jobsRoute = "/administracao/agendamentos/rotinas-agendadas";

const fallbackJobTypeOptions: JobTypeOption[] = [
  {
    id: "HTTP_REQUEST",
    name: "Requisição HTTP",
    description:
      "Aciona uma API interna ou externa com método, parâmetros, autenticação e corpo configuráveis.",
    type: "HTTP_REQUEST",
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: true,
  },
];

const misfireOptions: Record<TriggerType, { value: string; label: string }[]> = {
  CronTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar o próximo horário" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
    {
      value: "IGNORE_MISFIRE_POLICY",
      label: "Processar todos os disparos atrasados",
    },
  ],
  SimpleTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "FIRE_NOW", label: "Disparar agora" },
    {
      value: "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT",
      label: "Reagendar agora mantendo a contagem",
    },
    {
      value: "RESCHEDULE_NEXT_WITH_REMAINING_COUNT",
      label: "Reagendar no próximo intervalo com a contagem restante",
    },
  ],
  CalendarIntervalTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar o próximo intervalo" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
  ],
  DailyTimeIntervalTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar a próxima janela" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
  ],
};

type MisfirePolicyInformation = {
  title: string;
  description: string;
  example: string;
};

const misfirePolicyInformation: Record<
  TriggerType,
  Record<string, MisfirePolicyInformation>
> = {
  CronTrigger: {
    SMART_POLICY: {
      title: "Política inteligente para agenda cron",
      description:
        "Deixa o Quartz aplicar o comportamento padrão do CronTrigger. Quando um horário é perdido, ele faz um único disparo de recuperação assim que o scheduler volta e depois retoma a expressão cron normal. Não cria uma execução para cada horário perdido.",
      example:
        "Uma rotina prevista para 08:00 fica indisponível até 08:10. Ela executa uma vez às 08:10 e volta a seguir os próximos horários da expressão cron.",
    },
    DO_NOTHING: {
      title: "Ignorar o disparo perdido",
      description:
        "Descarta os horários que passaram enquanto o scheduler não podia executar a rotina. Nenhuma recuperação é feita; o trigger aguarda o próximo horário futuro calculado pela expressão cron.",
      example:
        "A execução das 08:00 foi perdida e o próximo horário é 09:00. Ao voltar às 08:10, a rotina não executa e aguarda 09:00.",
    },
    FIRE_ONCE_NOW: {
      title: "Recuperar com um único disparo imediato",
      description:
        "Executa a rotina uma vez assim que o scheduler puder processá-la, independentemente de quantos horários tenham sido perdidos. Depois desse disparo, a agenda cron volta ao ritmo normal.",
      example:
        "Os horários de 08:00, 08:15 e 08:30 foram perdidos. Quando o serviço volta às 08:40, ocorre uma execução imediata e a próxima segue a expressão cron.",
    },
    IGNORE_MISFIRE_POLICY: {
      title: "Processar todos os disparos atrasados",
      description:
        "Ignora o mecanismo de consolidação de atrasos do Quartz. Cada ocorrência perdida continua elegível para execução, o que pode gerar várias chamadas em sequência e aumentar a carga no destino.",
      example:
        "Uma rotina executada a cada 15 minutos fica parada por uma hora. Ao voltar, até quatro disparos atrasados podem ser processados em sequência.",
    },
  },
  SimpleTrigger: {
    SMART_POLICY: {
      title: "Política inteligente para repetição simples",
      description:
        "Deixa o Quartz escolher a recuperação conforme a quantidade de repetições configurada. Em uma execução única, dispara agora; em repetições, preserva ou recalcula a agenda sem enfileirar automaticamente todos os atrasos.",
      example:
        "Em um trigger que repete para sempre a cada 5 minutos, o Quartz recalcula a continuidade da agenda a partir do estado atual em vez de gerar uma rajada com todas as ocorrências perdidas.",
    },
    FIRE_NOW: {
      title: "Disparar imediatamente",
      description:
        "Executa a ocorrência perdida assim que o scheduler volta a funcionar. As repetições seguintes continuam conforme as regras do SimpleTrigger.",
      example:
        "A execução prevista para 10:00 não ocorreu. Se o serviço voltar às 10:03, a rotina executa imediatamente às 10:03.",
    },
    RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT: {
      title: "Reagendar agora mantendo a contagem original",
      description:
        "Move o início da continuidade para o momento atual e mantém a quantidade de repetições originalmente configurada. Isso pode prolongar o término da agenda porque os disparos perdidos não reduzem a contagem.",
      example:
        "Um trigger configurado com quatro repetições perde duas ocorrências. Ele recomeça agora e ainda preserva a contagem de repetições definida na criação.",
    },
    RESCHEDULE_NEXT_WITH_REMAINING_COUNT: {
      title: "Aguardar o próximo intervalo com a contagem restante",
      description:
        "Não executa imediatamente. Calcula o próximo horário futuro e desconta da agenda as repetições que já deveriam ter ocorrido, preservando apenas a quantidade restante.",
      example:
        "De dez ocorrências, três foram perdidas durante uma indisponibilidade. A rotina aguarda o próximo intervalo e segue apenas com as ocorrências restantes.",
    },
  },
  CalendarIntervalTrigger: {
    SMART_POLICY: {
      title: "Política inteligente para intervalo de calendário",
      description:
        "Usa o comportamento padrão do Quartz para recuperar uma ocorrência perdida uma vez e depois volta a calcular datas pelo intervalo de calendário, respeitando unidades como dia, semana ou mês.",
      example:
        "Uma rotina diária perde o horário de hoje. Ao voltar, executa uma vez e a próxima ocorrência continua sendo calculada para o dia seguinte.",
    },
    DO_NOTHING: {
      title: "Ignorar a ocorrência e aguardar o próximo intervalo",
      description:
        "Descarta a ocorrência perdida e avança diretamente para a próxima data válida do intervalo de calendário. Não há execução de recuperação.",
      example:
        "Uma rotina mensal perde a execução de setembro. Ela não executa ao voltar e aguarda a data correspondente de outubro.",
    },
    FIRE_ONCE_NOW: {
      title: "Executar uma vez agora e continuar o calendário",
      description:
        "Faz um único disparo de recuperação assim que possível e mantém os próximos cálculos com base no intervalo de calendário configurado.",
      example:
        "Uma rotina semanal perde a segunda-feira. Quando o serviço volta na terça, executa uma vez e depois continua na próxima data semanal calculada.",
    },
  },
  DailyTimeIntervalTrigger: {
    SMART_POLICY: {
      title: "Política inteligente para janela diária",
      description:
        "Aplica o comportamento padrão do Quartz para recuperar uma ocorrência uma vez e retomar os intervalos válidos dentro dos dias e da janela diária configurados.",
      example:
        "Uma rotina de segunda a sexta, das 08:00 às 18:00, perde um disparo. Ao voltar dentro da janela, executa uma vez e retoma os próximos intervalos válidos.",
    },
    DO_NOTHING: {
      title: "Ignorar e aguardar a próxima ocorrência da janela",
      description:
        "Descarta os disparos perdidos e espera o próximo intervalo que ainda esteja dentro dos dias e horários permitidos. Se a janela já terminou, aguarda a próxima janela válida.",
      example:
        "O serviço volta às 18:10, depois do fim da janela. A rotina não executa e aguarda a abertura da próxima janela às 08:00 de um dia permitido.",
    },
    FIRE_ONCE_NOW: {
      title: "Executar uma vez agora e retomar a janela",
      description:
        "Consolida os disparos perdidos em uma única execução imediata. Depois, o trigger volta a respeitar os próximos intervalos dos dias e horários configurados.",
      example:
        "Três intervalos foram perdidos durante a manhã. Quando o scheduler volta, executa uma vez e continua no próximo intervalo válido da janela diária.",
    },
  },
};

function limitText(value: string, maximumLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maximumLength) return normalized;
  return `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

const triggerHints: Record<TriggerType, string> = {
  CronTrigger: "Use uma expressão cron do Quartz, por exemplo 0 0 8 ? * MON-FRI",
  SimpleTrigger:
    "Use, por exemplo, INTERVAL 5 MINUTES · REPEAT FOREVER",
  CalendarIntervalTrigger: "Use, por exemplo, 1 DAY ou 2 WEEKS",
  DailyTimeIntervalTrigger:
    "Use, por exemplo, MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
};

const triggerExpressionDefaults: Record<TriggerType, string> = {
  CronTrigger: "0 0 8 ? * MON-FRI",
  SimpleTrigger: "INTERVAL 5 MINUTES · REPEAT FOREVER",
  CalendarIntervalTrigger: "1 DAY",
  DailyTimeIntervalTrigger:
    "MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
};

type CreateJobDraft = {
  name: string;
  group: string;
  description: string;
  jobTypeId: string;
  durable: boolean;
  requestsRecovery: boolean;
  httpRequest: HttpRequestDraft;
  createTrigger: boolean;
  triggerType: TriggerType;
  expression: string;
  timeZone: string;
  calendar: string;
  misfireInstruction: string;
  priority: string;
};

const initialDraft: CreateJobDraft = {
  name: "",
  group: "plataforma",
  description: "",
  jobTypeId: "HTTP_REQUEST",
  durable: true,
  requestsRecovery: false,
  httpRequest: initialHttpRequestDraft,
  createTrigger: true,
  triggerType: "CronTrigger",
  expression: "0 0 8 ? * MON-FRI",
  timeZone: "America/Sao_Paulo",
  calendar: "feriados-nacionais-br",
  misfireInstruction: "SMART_POLICY",
  priority: "5",
};

const useStyles = makeStyles({
  page: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: tokens.spacingVerticalXL,
    maxWidth: "1320px",
    minWidth: 0,
    margin: "0 auto",
  },
  header: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  title: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
    "@media (max-width: 520px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "760px",
    margin: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  layout: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  form: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    minWidth: 0,
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    minWidth: 0,
    padding: tokens.spacingHorizontalXL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 600px)": {
      padding: tokens.spacingHorizontalL,
    },
  },
  sectionHeader: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr)",
    gap: tokens.spacingHorizontalM,
    alignItems: "start",
  },
  step: {
    display: "grid",
    placeItems: "center",
    width: "32px",
    height: "32px",
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  sectionCopy: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  sectionDescription: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  textarea: {
    minHeight: "92px",
  },
  typeDetails: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  detailsList: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    margin: 0,
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  detailItem: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  detailTerm: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  detailValue: {
    margin: 0,
  },
  code: {
    overflowWrap: "anywhere",
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  fieldset: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: 0,
  },
  legend: {
    marginBottom: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  optionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalM,
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  option: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  optionDescription: {
    paddingLeft: "28px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  triggerControl: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalL,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  misfireInformation: {
    gridColumn: "1 / -1",
  },
  misfireInformationBody: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  misfireParagraph: {
    margin: 0,
    lineHeight: tokens.lineHeightBase300,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    "@media (max-width: 520px)": {
      alignItems: "stretch",
      flexDirection: "column-reverse",
    },
  },
});

function isValidQuartzKey(value: string) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

export function ScheduledJobCreatePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreateJobDraft>(initialDraft);
  const [availableGroups, setAvailableGroups] = useState<JobGroup[]>(() =>
    defaultJobGroups.filter((group) => group.active),
  );
  const [availableJobTypes, setAvailableJobTypes] = useState<JobTypeOption[]>(
    fallbackJobTypeOptions,
  );
  const [existingJobs, setExistingJobs] = useState<ScheduledJob[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([loadJobGroups(), listJobTypes(), listScheduledJobs()])
      .then(([groups, jobTypes, jobs]) => {
        if (!active) return;
        const activeGroups = groups.filter((group) => group.active);
        setAvailableGroups(activeGroups);
        setAvailableJobTypes(jobTypes);
        setExistingJobs(jobs);
        setDraft((current) => ({
          ...current,
          group: activeGroups.some((group) => group.key === current.group)
            ? current.group
            : (activeGroups[0]?.key ?? ""),
          jobTypeId: jobTypes.some((type) => type.id === current.jobTypeId)
            ? current.jobTypeId
            : (jobTypes[0]?.id ?? ""),
        }));
      })
      .catch((error: unknown) => {
        if (active) {
          setSubmitError(
            getSchedulerServiceError(
              error,
              "Não foi possível carregar os dados necessários para criar a rotina.",
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedJobType =
    availableJobTypes.find((option) => option.id === draft.jobTypeId) ??
    availableJobTypes[0] ??
    fallbackJobTypeOptions[0];
  const jobTypeDescription =
    limitText(selectedJobType.description, 500) ||
    "Este tipo de job não possui uma descrição cadastrada.";
  const selectedMisfirePolicy =
    misfirePolicyInformation[draft.triggerType][draft.misfireInstruction] ??
    misfirePolicyInformation[draft.triggerType].SMART_POLICY;
  const normalizedName = draft.name.trim().toLocaleLowerCase("pt-BR");
  const normalizedGroup = draft.group.trim().toLocaleLowerCase("pt-BR");
  const jobKey =
    normalizedName && normalizedGroup
      ? `${normalizedGroup}.${normalizedName}`
      : "Definida após informar nome e grupo";
  const duplicate = existingJobs.some(
    (job) => job.name === normalizedName && job.group === normalizedGroup,
  );
  const nameError = !draft.name.trim()
    ? "Informe o nome da rotina"
    : !isValidQuartzKey(normalizedName)
      ? "Use letras minúsculas, números, ponto, hífen ou sublinhado"
      : duplicate
        ? "Já existe uma rotina com este nome e grupo"
        : undefined;
  const groupError = !draft.group.trim()
    ? "Informe o grupo da rotina"
    : !isValidQuartzKey(normalizedGroup)
      ? "Use letras minúsculas, números, ponto, hífen ou sublinhado"
      : !availableGroups.some((group) => group.key === normalizedGroup)
        ? "Selecione um grupo ativo cadastrado"
        : undefined;
  const expressionError =
    draft.createTrigger && !draft.expression.trim()
      ? "Informe a regra do agendamento"
      : undefined;
  const priorityNumber = Number(draft.priority);
  const priorityError =
    draft.createTrigger &&
    (!Number.isInteger(priorityNumber) || draft.priority.trim() === "")
      ? "Informe uma prioridade inteira"
      : undefined;
  const httpRequestErrors = validateHttpRequestDraft(draft.httpRequest);
  const jobBehavior = useMemo(() => {
    const behavior: string[] = [];
    behavior.push(
      selectedJobType.disallowConcurrent
        ? "Sem concorrência"
        : "Permite concorrência",
    );
    if (selectedJobType.interruptable) behavior.push("Aceita interrupção");
    return behavior.join(" · ");
  }, [selectedJobType]);

  function updateDraft(update: Partial<CreateJobDraft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setSubmitError("");

    if (
      nameError ||
      groupError ||
      expressionError ||
      priorityError ||
      httpRequestErrors.length > 0
    ) {
      return;
    }

    const job: ScheduledJob = {
      id: jobKey,
      name: normalizedName,
      group: normalizedGroup,
      description:
        draft.description.trim() || "Rotina criada no portal administrativo.",
      type: selectedJobType.type,
      httpRequest: toHttpRequestConfiguration(draft.httpRequest),
      durable: draft.durable,
      requestsRecovery: draft.requestsRecovery,
      disallowConcurrent: selectedJobType.disallowConcurrent,
      persistJobData: selectedJobType.persistJobData,
      interruptable: selectedJobType.interruptable,
      triggers: draft.createTrigger
        ? [
            {
              key: `${normalizedName}-trigger`,
              group: normalizedGroup,
              type: draft.triggerType,
              state: "NORMAL",
              schedule: `${draft.triggerType}: ${draft.expression.trim()}`,
              expression: draft.expression.trim(),
              timeZone: draft.timeZone,
              calendar: draft.calendar || "Sem calendário de exclusão",
              nextFireTime: "Calculado pela API após persistir",
              previousFireTime: "Nunca disparado",
              startAt: "Imediatamente após a criação",
              endAt: "Sem término",
              priority: priorityNumber,
              misfireInstruction: draft.misfireInstruction,
            },
          ]
        : [],
      executionCounts: {
        successCount: 0,
        failureCount: 0,
      },
      lastExecution: {
        result: "NONE",
        finishedAt: "Nunca executado",
        duration: "—",
        message: "Nenhuma execução registrada.",
      },
    };

    setIsSubmitting(true);
    try {
      const createdJob = await createScheduledJob(job);
      navigate(jobsRoute, { state: { createdJob } });
    } catch (error) {
      setSubmitError(
        getSchedulerServiceError(
          error,
          "Não foi possível criar a rotina. Revise os dados e tente novamente.",
        ),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: "Rotinas agendadas", href: jobsRoute },
          { label: "Criar rotina" },
        ]}
      />

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Criar rotina</h1>
        </div>
        <p className={styles.lead}>
          Defina a requisição HTTP e, se necessário, o primeiro Trigger. O mesmo
          executor atende APIs internas e externas sem uma nova implementação Java.
        </p>
      </header>

      <MessageBar intent="info">
        <MessageBarBody>
          Tokens e senhas devem usar referências no formato env:NOME_DA_VARIAVEL.
          O valor do segredo não será salvo na definição da rotina.
        </MessageBarBody>
      </MessageBar>

      {submitError ? (
        <MessageBar intent="error" role="alert">
          <MessageBarBody>{submitError}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {showErrors &&
          (nameError ||
            groupError ||
            expressionError ||
            priorityError ||
            httpRequestErrors.length > 0) ? (
            <MessageBar intent="error" role="alert">
              <MessageBarBody>
                Revise os campos indicados antes de criar a rotina.
              </MessageBarBody>
            </MessageBar>
          ) : null}

          <section className={styles.section} aria-labelledby="identity-title">
            <div className={styles.sectionHeader}>
              <span className={styles.step} aria-hidden="true">
                1
              </span>
              <div className={styles.sectionCopy}>
                <h2 id="identity-title" className={styles.sectionTitle}>
                  Identificação
                </h2>
                <p className={styles.sectionDescription}>
                  Nome e grupo formam a JobKey única usada nos comandos do
                  scheduler.
                </p>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <Field
                label="Nome da rotina"
                required
                hint="Exemplo: sincronizar-calendarios"
                validationState={showErrors && nameError ? "error" : "none"}
                validationMessage={showErrors ? nameError : undefined}
              >
                <Input
                  value={draft.name}
                  onChange={(_, data) => updateDraft({ name: data.value })}
                />
              </Field>
              <Field
                label="Grupo da rotina"
                required
                hint="Selecione um grupo ativo cadastrado em Grupos de rotinas"
                validationState={showErrors && groupError ? "error" : "none"}
                validationMessage={showErrors ? groupError : undefined}
              >
                <Select
                  value={draft.group}
                  disabled={availableGroups.length === 0}
                  onChange={(event) =>
                    updateDraft({ group: event.target.value })
                  }
                >
                  {availableGroups.length === 0 ? (
                    <option value="">Nenhum grupo ativo</option>
                  ) : null}
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.key}>
                      {group.name} ({group.key})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                className={styles.fullWidth}
                label="Descrição"
                hint="Explique o resultado esperado e o impacto operacional em até 500 caracteres"
              >
                <Textarea
                  className={styles.textarea}
                  value={draft.description}
                  maxLength={500}
                  resize="vertical"
                  onChange={(_, data) =>
                    updateDraft({ description: data.value })
                  }
                />
              </Field>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="job-type-title">
            <div className={styles.sectionHeader}>
              <span className={styles.step} aria-hidden="true">
                2
              </span>
              <div className={styles.sectionCopy}>
                <h2 id="job-type-title" className={styles.sectionTitle}>
                  Tipo de job
                </h2>
                <p className={styles.sectionDescription}>
                  Selecione um tipo pré-definido de Job para configurar o novo
                  agendamento.
                </p>
              </div>
            </div>

            <Field label="Tipo de job" required>
              <Select
                value={draft.jobTypeId}
                onChange={(event) =>
                  updateDraft({ jobTypeId: event.target.value })
                }
              >
                  {availableJobTypes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className={styles.typeDetails}>
              <dl className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <dt className={styles.detailTerm}>Executor</dt>
                  <dd className={styles.detailValue}>
                    <code className={styles.code}>{selectedJobType.type}</code>
                  </dd>
                </div>
                <div className={styles.detailItem}>
                  <dt className={styles.detailTerm}>Concorrência</dt>
                  <dd className={styles.detailValue}>
                    {selectedJobType.disallowConcurrent
                      ? "Uma execução por JobKey"
                      : "Execuções paralelas permitidas"}
                  </dd>
                </div>
                <div className={styles.detailItem}>
                  <dt className={styles.detailTerm}>Recursos do handler</dt>
                  <dd className={styles.detailValue}>{jobBehavior}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="job-detail-title">
            <div className={styles.sectionHeader}>
              <span className={styles.step} aria-hidden="true">
                3
              </span>
              <div className={styles.sectionCopy}>
                <h2 id="job-detail-title" className={styles.sectionTitle}>
                  {selectedJobType.name}
                </h2>
                <p className={styles.sectionDescription}>
                  {jobTypeDescription}
                </p>
              </div>
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Características do Job</legend>
              <div className={styles.optionGrid}>
                <div className={styles.option}>
                  <Checkbox
                    label="Manter sem triggers"
                    checked={draft.durable}
                    disabled={!draft.createTrigger}
                    onChange={(_, data) =>
                      updateDraft({ durable: Boolean(data.checked) })
                    }
                  />
                  <Text className={styles.optionDescription}>
                    Preserva o JobDetail quando nenhum Trigger estiver associado.
                    É obrigatório quando a rotina nasce sem agendamento.
                  </Text>
                </div>
                <div className={styles.option}>
                  <Checkbox
                    label="Solicitar recuperação"
                    checked={draft.requestsRecovery}
                    onChange={(_, data) =>
                      updateDraft({ requestsRecovery: Boolean(data.checked) })
                    }
                  />
                  <Text className={styles.optionDescription}>
                    Permite reexecução em modo de recuperação após falha da
                    instância que processava o job.
                  </Text>
                </div>
              </div>
            </fieldset>

            <HttpRequestEditor
              draft={draft.httpRequest}
              showErrors={showErrors}
              onChange={(update) =>
                updateDraft({
                  httpRequest: { ...draft.httpRequest, ...update },
                })
              }
            />
          </section>

          <section className={styles.section} aria-labelledby="schedule-title">
            <div className={styles.sectionHeader}>
              <span className={styles.step} aria-hidden="true">
                4
              </span>
              <div className={styles.sectionCopy}>
                <h2 id="schedule-title" className={styles.sectionTitle}>
                  Agendamento inicial
                </h2>
                <p className={styles.sectionDescription}>
                  Crie o primeiro Trigger agora ou mantenha o JobDetail durável
                  para associar um agendamento depois.
                </p>
              </div>
            </div>

            <div className={styles.triggerControl}>
              <Checkbox
                label="Criar trigger inicial"
                checked={draft.createTrigger}
                onChange={(_, data) => {
                  const createTrigger = Boolean(data.checked);
                  updateDraft({
                    createTrigger,
                    durable: createTrigger ? draft.durable : true,
                  });
                }}
              />
              <Text className={styles.optionDescription}>
                Quando selecionado, a API cria o JobDetail e o Trigger na mesma
                operação transacional.
              </Text>
            </div>

            {draft.createTrigger ? (
              <div className={styles.fieldGrid}>
                <Field label="Tipo de trigger" required>
                  <Select
                    value={draft.triggerType}
                    onChange={(event) => {
                      const triggerType = event.target.value as TriggerType;
                      updateDraft({
                        triggerType,
                        expression: triggerExpressionDefaults[triggerType],
                        misfireInstruction: "SMART_POLICY",
                      });
                    }}
                  >
                    {triggerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Prioridade"
                  required
                  hint="5 é o padrão; valores maiores vencem o desempate"
                  validationState={
                    showErrors && priorityError ? "error" : "none"
                  }
                  validationMessage={showErrors ? priorityError : undefined}
                >
                  <Input
                    type="number"
                    value={draft.priority}
                    onChange={(_, data) =>
                      updateDraft({ priority: data.value })
                    }
                  />
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Regra do agendamento"
                  required
                  hint={triggerHints[draft.triggerType]}
                  validationState={
                    showErrors && expressionError ? "error" : "none"
                  }
                  validationMessage={showErrors ? expressionError : undefined}
                >
                  <Input
                    value={draft.expression}
                    onChange={(_, data) =>
                      updateDraft({ expression: data.value })
                    }
                  />
                </Field>
                <Field label="Fuso horário" required>
                  <Select
                    value={draft.timeZone}
                    onChange={(event) =>
                      updateDraft({ timeZone: event.target.value })
                    }
                  >
                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    <option value="America/Manaus">America/Manaus</option>
                    <option value="UTC">UTC</option>
                  </Select>
                </Field>
                <Field label="Calendário de exclusão">
                  <Select
                    value={draft.calendar}
                    onChange={(event) =>
                      updateDraft({ calendar: event.target.value })
                    }
                  >
                    <option value="">Nenhum</option>
                    <option value="feriados-nacionais-br">
                      Feriados nacionais — Brasil
                    </option>
                    <option value="feriados-bancarios-br">
                      Feriados bancários — Brasil
                    </option>
                  </Select>
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Política para disparos perdidos"
                  hint="Define o que o Quartz fará quando o horário previsto não puder ser processado"
                >
                  <Select
                    value={draft.misfireInstruction}
                    onChange={(event) =>
                      updateDraft({ misfireInstruction: event.target.value })
                    }
                  >
                    {misfireOptions[draft.triggerType].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <section
                  className={styles.misfireInformation}
                  aria-labelledby="misfire-information-title"
                >
                  <MessageBar intent="info">
                    <MessageBarBody className={styles.misfireInformationBody}>
                      <MessageBarTitle id="misfire-information-title">
                        {selectedMisfirePolicy.title}
                      </MessageBarTitle>
                      <p className={styles.misfireParagraph}>
                        {selectedMisfirePolicy.description}
                      </p>
                      <p className={styles.misfireParagraph}>
                        <strong>Exemplo:</strong> {selectedMisfirePolicy.example}
                      </p>
                    </MessageBarBody>
                  </MessageBar>
                </section>
              </div>
            ) : (
              <MessageBar intent="warning">
                <MessageBarBody>
                  A rotina será criada pausada operacionalmente, sem próxima
                  execução. O JobDetail ficará armazenado por ser durável.
                </MessageBarBody>
              </MessageBar>
            )}
          </section>

          <div className={styles.actions} aria-label="Ações do formulário">
            <Button as="a" href={jobsRoute} appearance="secondary" size="large">
              Cancelar
            </Button>
            <Button
              appearance="primary"
              size="large"
              type="submit"
              icon={<AddRegular />}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Criando rotina..." : "Criar rotina"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
