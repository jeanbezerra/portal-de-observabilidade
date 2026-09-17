import {
  Button,
  Checkbox,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  CheckmarkCircleRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { PageBreadcrumb } from "../../components/page-breadcrumb";
import {
  defaultJobGroups,
  type JobGroup,
} from "./job-group-model";
import { loadJobGroups } from "./job-group-storage";
import {
  scheduledJobs,
  triggerTypes,
  type JobDataEntry,
  type ScheduledJob,
  type TriggerType,
} from "./scheduled-jobs-model";

const jobsRoute = "/administracao/agendamentos/rotinas-agendadas";

type JobTypeOption = {
  id: string;
  name: string;
  description: string;
  jobClass: string;
  disallowConcurrent: boolean;
  persistJobData: boolean;
  interruptable: boolean;
};

const jobTypeOptions: JobTypeOption[] = [
  {
    id: "calendar-sync",
    name: "Sincronização de calendários",
    description:
      "Atualiza feriados e exceções operacionais usados pelos triggers.",
    jobClass: "br.com.porto.scheduler.jobs.CalendarSyncJob",
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: false,
  },
  {
    id: "billing-close",
    name: "Fechamento de faturamento",
    description:
      "Consolida lançamentos e publica o fechamento financeiro do período.",
    jobClass: "br.com.porto.scheduler.jobs.BillingCloseJob",
    disallowConcurrent: true,
    persistJobData: true,
    interruptable: true,
  },
  {
    id: "regulatory-report",
    name: "Relatório regulatório",
    description:
      "Gera e entrega relatórios periódicos para os destinos configurados.",
    jobClass: "br.com.porto.scheduler.jobs.RegulatoryReportJob",
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: true,
  },
  {
    id: "metric-compaction",
    name: "Compactação de métricas",
    description:
      "Compacta séries históricas conforme a política de retenção definida.",
    jobClass: "br.com.porto.scheduler.jobs.MetricCompactionJob",
    disallowConcurrent: false,
    persistJobData: true,
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

const triggerHints: Record<TriggerType, string> = {
  CronTrigger: "Use uma expressão cron do Quartz, por exemplo 0 0 8 ? * MON-FRI",
  SimpleTrigger: "Informe o intervalo e a repetição aceitos pela API",
  CalendarIntervalTrigger: "Informe a unidade e o intervalo de calendário",
  DailyTimeIntervalTrigger: "Informe a janela diária e o intervalo entre disparos",
};

type CreateJobDraft = {
  name: string;
  group: string;
  description: string;
  jobTypeId: string;
  durable: boolean;
  requestsRecovery: boolean;
  jobData: string;
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
  jobTypeId: "calendar-sync",
  durable: true,
  requestsRecovery: false,
  jobData: "{}",
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
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 320px",
    alignItems: "start",
    gap: tokens.spacingHorizontalXXL,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    "@media (max-width: 1200px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
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
  codeTextarea: {
    minHeight: "126px",
    fontFamily: tokens.fontFamilyMonospace,
  },
  typeDetails: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  typeDescription: {
    color: tokens.colorNeutralForeground2,
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
  summary: {
    position: "sticky",
    top: tokens.spacingVerticalXL,
    display: "grid",
    gap: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 1200px)": {
      position: "static",
    },
  },
  summaryTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  summaryList: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    margin: 0,
  },
  summaryItem: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ":last-child": {
      paddingBottom: 0,
      borderBottom: "none",
    },
  },
  summaryTerm: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  summaryValue: {
    margin: 0,
    overflowWrap: "anywhere",
    fontWeight: tokens.fontWeightSemibold,
  },
  confirmation: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "flex-start",
    color: tokens.colorNeutralForeground2,
  },
  confirmationIcon: {
    flexShrink: 0,
    marginTop: "2px",
    color: tokens.colorPaletteGreenForeground1,
  },
});

function isValidQuartzKey(value: string) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

function getJobDataError(value: string) {
  if (!value.trim()) return undefined;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return "Informe um objeto JSON com pares de chave e valor";
    }
  } catch {
    return "Corrija o JSON antes de criar a rotina";
  }

  return undefined;
}

function parseJobData(value: string): JobDataEntry[] {
  if (!value.trim()) return [];
  const parsed = JSON.parse(value) as Record<string, unknown>;

  return Object.entries(parsed).map(([key, entryValue]) => {
    const type: JobDataEntry["type"] =
      typeof entryValue === "boolean"
        ? "Boolean"
        : typeof entryValue === "number" && Number.isInteger(entryValue)
          ? "Integer"
          : typeof entryValue === "string"
            ? "String"
            : "JSON";

    return {
      key,
      type,
      value:
        typeof entryValue === "string"
          ? entryValue
          : JSON.stringify(entryValue),
    };
  });
}

export function ScheduledJobCreatePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreateJobDraft>(initialDraft);
  const [availableGroups, setAvailableGroups] = useState<JobGroup[]>(() =>
    defaultJobGroups.filter((group) => group.active),
  );
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const activeGroups = loadJobGroups().filter((group) => group.active);
    setAvailableGroups(activeGroups);
    setDraft((current) =>
      activeGroups.some((group) => group.key === current.group)
        ? current
        : { ...current, group: activeGroups[0]?.key ?? "" },
    );
  }, []);

  const selectedJobType =
    jobTypeOptions.find((option) => option.id === draft.jobTypeId) ??
    jobTypeOptions[0];
  const normalizedName = draft.name.trim().toLocaleLowerCase("pt-BR");
  const normalizedGroup = draft.group.trim().toLocaleLowerCase("pt-BR");
  const jobKey =
    normalizedName && normalizedGroup
      ? `${normalizedGroup}.${normalizedName}`
      : "Definida após informar nome e grupo";
  const duplicate = scheduledJobs.some(
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
  const jobDataError = getJobDataError(draft.jobData);
  const triggerLabel = draft.createTrigger
    ? `${draft.triggerType} · ${draft.timeZone}`
    : "Sem trigger inicial";
  const jobBehavior = useMemo(() => {
    const behavior: string[] = [];
    behavior.push(
      selectedJobType.disallowConcurrent
        ? "Sem concorrência"
        : "Permite concorrência",
    );
    if (selectedJobType.persistJobData) behavior.push("Persiste JobDataMap");
    if (selectedJobType.interruptable) behavior.push("Aceita interrupção");
    return behavior.join(" · ");
  }, [selectedJobType]);

  function updateDraft(update: Partial<CreateJobDraft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (
      nameError ||
      groupError ||
      expressionError ||
      priorityError ||
      jobDataError
    ) {
      return;
    }

    const job: ScheduledJob = {
      id: jobKey,
      name: normalizedName,
      group: normalizedGroup,
      description:
        draft.description.trim() || "Rotina criada no portal administrativo.",
      jobClass: selectedJobType.jobClass,
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
      lastExecution: {
        result: "NONE",
        finishedAt: "Nunca executado",
        duration: "—",
        message: "Nenhuma execução registrada.",
      },
      jobData: parseJobData(draft.jobData),
    };

    navigate(jobsRoute, { state: { createdJob: job } });
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
          Defina o JobDetail e, se necessário, o primeiro Trigger. As informações
          estão separadas conforme os objetos que a API enviará ao Quartz.
        </p>
      </header>

      <MessageBar intent="info">
        <MessageBarBody>
          Mockup interativo: a rotina criada não será persistida na API.
        </MessageBarBody>
      </MessageBar>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {showErrors &&
          (nameError ||
            groupError ||
            expressionError ||
            priorityError ||
            jobDataError) ? (
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
                hint="Explique o resultado esperado e o impacto operacional"
              >
                <Textarea
                  className={styles.textarea}
                  value={draft.description}
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
                  Selecione uma implementação publicada e autorizada no catálogo
                  da API.
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
                {jobTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className={styles.typeDetails}>
              <Text weight="semibold">{selectedJobType.name}</Text>
              <Text className={styles.typeDescription}>
                {selectedJobType.description}
              </Text>
              <dl className={styles.detailsList}>
                <div className={styles.detailItem}>
                  <dt className={styles.detailTerm}>Classe Java</dt>
                  <dd className={styles.detailValue}>
                    <code className={styles.code}>{selectedJobType.jobClass}</code>
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
                  Comportamento e dados
                </h2>
                <p className={styles.sectionDescription}>
                  Configure a permanência do JobDetail, a recuperação de falhas e
                  os dados entregues ao handler.
                </p>
              </div>
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Comportamento do JobDetail</legend>
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

            <Field
              label="JobDataMap"
              hint="Informe um objeto JSON. Segredos devem ser referenciados por identificador, nunca gravados em texto puro"
              validationState={showErrors && jobDataError ? "error" : "none"}
              validationMessage={showErrors ? jobDataError : undefined}
            >
              <Textarea
                className={styles.codeTextarea}
                value={draft.jobData}
                onChange={(_, data) => updateDraft({ jobData: data.value })}
              />
            </Field>
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
                    onChange={(event) =>
                      updateDraft({
                        triggerType: event.target.value as TriggerType,
                        misfireInstruction: "SMART_POLICY",
                      })
                    }
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
            >
              Criar rotina
            </Button>
          </div>
        </form>

        <aside className={styles.summary} aria-labelledby="summary-title">
          <h2 id="summary-title" className={styles.summaryTitle}>
            Resumo da criação
          </h2>
          <dl className={styles.summaryList}>
            <div className={styles.summaryItem}>
              <dt className={styles.summaryTerm}>JobKey</dt>
              <dd className={styles.summaryValue}>
                <code className={styles.code}>{jobKey}</code>
              </dd>
            </div>
            <div className={styles.summaryItem}>
              <dt className={styles.summaryTerm}>Tipo de job</dt>
              <dd className={styles.summaryValue}>{selectedJobType.name}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt className={styles.summaryTerm}>Comportamento</dt>
              <dd className={styles.summaryValue}>{jobBehavior}</dd>
            </div>
            <div className={styles.summaryItem}>
              <dt className={styles.summaryTerm}>Agendamento</dt>
              <dd className={styles.summaryValue}>{triggerLabel}</dd>
            </div>
          </dl>
          <div className={styles.confirmation}>
            <CheckmarkCircleRegular
              className={styles.confirmationIcon}
              aria-hidden="true"
            />
            <Text size={200}>
              Ao confirmar, a API deverá persistir o JobDetail e o Trigger de
              forma atômica quando houver agendamento inicial.
            </Text>
          </div>
        </aside>
      </div>
    </div>
  );
}
