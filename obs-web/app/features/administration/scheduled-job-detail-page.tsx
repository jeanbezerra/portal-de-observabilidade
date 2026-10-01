import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Select,
  Spinner,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  CalendarClockRegular,
  CopyRegular,
  DeleteRegular,
  DocumentRegular,
  EditRegular,
  HistoryRegular,
  MoreHorizontalRegular,
  PauseRegular,
  PlayRegular,
  SaveRegular,
  ShieldCheckmarkRegular,
  StopRegular,
} from "@fluentui/react-icons";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useNavigate, useSearchParams } from "react-router";

import { PageBreadcrumb } from "../../components/page-breadcrumb";
import {
  HttpRequestEditor,
  toHttpRequestConfiguration,
  toHttpRequestDraft,
  validateHttpRequestDraft,
  type HttpRequestDraft,
} from "./http-request-editor";
import { DeleteScheduledJobDialog } from "./scheduled-job-editor-dialogs";
import {
  getJobTriggerState,
  getPrimaryTrigger,
  triggerTypes,
  type JobTrigger,
  type ScheduledJob,
  type TriggerType,
} from "./scheduled-jobs-model";
import {
  getScheduledJob,
  getSchedulerApiError,
  listExecutionHistory,
  listTimeZones,
  removeScheduledJob,
  runJobAction,
  updateScheduledJobConfiguration,
  updateScheduledJobTrigger,
  type ExecutionHistoryEntry,
} from "./scheduler-api-client";
import {
  ExecutionResultBadge,
  ExecutionStatus,
  JobOperationalStatus,
  TriggerStateBadge,
} from "./scheduled-job-status";
import type { TimeZoneEntry } from "./time-zone-model";

const jobsRoute = "/administracao/agendamentos/rotinas-agendadas";
type DetailTab =
  | "overview"
  | "metadata"
  | "executions"
  | "job-type"
  | "schedule";
type JobAction = "pause" | "resume" | "trigger" | "interrupt" | "duplicate";

type ScheduleDraft = {
  triggerType: TriggerType;
  expression: string;
  timeZone: string;
  calendar: string;
  misfireInstruction: string;
  priority: number;
};

const triggerTypeLabels: Record<TriggerType, string> = {
  CronTrigger: "Expressão cron",
  SimpleTrigger: "Intervalo simples",
  CalendarIntervalTrigger: "Intervalo de calendário",
  DailyTimeIntervalTrigger: "Intervalo diário",
};

const triggerExpressionDefaults: Record<TriggerType, string> = {
  CronTrigger: "0 0 8 ? * MON-FRI",
  SimpleTrigger: "INTERVAL 5 MINUTES · REPEAT FOREVER",
  CalendarIntervalTrigger: "1 DAY",
  DailyTimeIntervalTrigger: "MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
};

const fallbackTimeZones = ["America/Sao_Paulo", "America/Manaus", "UTC"];
const calendarOptions = [
  { value: "Sem calendário de exclusão", label: "Nenhum" },
  { value: "feriados-nacionais-br", label: "Feriados nacionais — Brasil" },
  { value: "feriados-bancarios-br", label: "Feriados bancários — Brasil" },
];

const misfireOptions: Record<TriggerType, { value: string; label: string }[]> = {
  CronTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar o próximo horário" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
    { value: "IGNORE_MISFIRE_POLICY", label: "Tentar recuperar todos os disparos" },
  ],
  SimpleTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "FIRE_NOW", label: "Disparar agora" },
    {
      value: "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT",
      label: "Reagendar agora mantendo a quantidade de repetições",
    },
    {
      value: "RESCHEDULE_NEXT_WITH_REMAINING_COUNT",
      label: "Reagendar no próximo intervalo com as repetições restantes",
    },
    { value: "IGNORE_MISFIRE_POLICY", label: "Tentar recuperar todos os disparos" },
  ],
  CalendarIntervalTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar o próximo intervalo" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
    { value: "IGNORE_MISFIRE_POLICY", label: "Tentar recuperar todos os disparos" },
  ],
  DailyTimeIntervalTrigger: [
    { value: "SMART_POLICY", label: "Política inteligente do Quartz" },
    { value: "DO_NOTHING", label: "Ignorar e aguardar a próxima janela" },
    { value: "FIRE_ONCE_NOW", label: "Disparar uma vez agora" },
    { value: "IGNORE_MISFIRE_POLICY", label: "Tentar recuperar todos os disparos" },
  ],
};

const misfireInformation: Record<string, { title: string; description: string; example: string }> = {
  SMART_POLICY: {
    title: "O Quartz escolhe o comportamento mais adequado",
    description:
      "A biblioteca avalia o tipo do agendamento e aplica sua regra padrão. É uma escolha segura quando não existe uma exigência operacional específica.",
    example:
      "Exemplo: após uma indisponibilidade curta, o Quartz pode executar uma vez para recuperar o atraso e depois retomar o calendário normal.",
  },
  DO_NOTHING: {
    title: "O disparo perdido não é recuperado",
    description:
      "Nenhuma execução é criada para o horário que passou. A rotina aguarda a próxima ocorrência válida do calendário.",
    example:
      "Exemplo: uma rotina das 08:00 volta às 08:20; o disparo das 08:00 é descartado e ela aguarda o próximo horário configurado.",
  },
  FIRE_ONCE_NOW: {
    title: "Executa uma única vez assim que possível",
    description:
      "Vários horários perdidos são consolidados em uma execução de recuperação. Depois disso, o calendário normal continua.",
    example:
      "Exemplo: três disparos ficaram para trás durante uma manutenção; ao retornar, ocorre apenas uma execução imediata.",
  },
  FIRE_NOW: {
    title: "Executa imediatamente e continua o intervalo",
    description:
      "O trigger simples dispara assim que o scheduler percebe o atraso e recalcula as próximas repetições.",
    example:
      "Exemplo: uma execução atrasada em dois minutos ocorre agora, sem esperar o próximo intervalo completo.",
  },
  RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT: {
    title: "Reinicia agora sem reduzir a quantidade configurada",
    description:
      "O próximo disparo acontece imediatamente e a contagem original de repetições é preservada a partir desse novo ponto.",
    example:
      "Exemplo: um trigger com dez repetições reinicia agora e ainda pode executar as dez repetições previstas.",
  },
  RESCHEDULE_NEXT_WITH_REMAINING_COUNT: {
    title: "Aguarda o próximo intervalo e preserva apenas o que restou",
    description:
      "Não há disparo imediato. O trigger retoma no próximo intervalo válido e desconta as repetições que já deveriam ter ocorrido.",
    example:
      "Exemplo: se duas de dez repetições foram perdidas, o trigger aguarda o próximo intervalo e mantém as oito restantes.",
  },
  IGNORE_MISFIRE_POLICY: {
    title: "Tenta cumprir o calendário original sem tratar o atraso",
    description:
      "O Quartz não aplica uma política de consolidação. Dependendo do calendário, várias execuções podem ocorrer em sequência para alcançar o horário atual.",
    example:
      "Exemplo: cinco disparos atrasados podem ser liberados rapidamente após a retomada. Use apenas quando o destino suporta esse volume.",
  },
};

function toDraft(trigger: JobTrigger): ScheduleDraft {
  return {
    triggerType: trigger.type,
    expression: trigger.expression,
    timeZone: trigger.timeZone,
    calendar: trigger.calendar,
    misfireInstruction: trigger.misfireInstruction,
    priority: trigger.priority,
  };
}

function triggerIdentity(trigger: JobTrigger) {
  return JSON.stringify([trigger.group, trigger.key]);
}

function isDetailTab(value: string | null): value is DetailTab {
  return (
    value === "overview" ||
    value === "metadata" ||
    value === "executions" ||
    value === "job-type" ||
    value === "schedule"
  );
}

function formatInstant(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return "Em andamento";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    minWidth: 0,
  },
  statePanel: {
    display: "grid",
    placeItems: "center",
    gap: tokens.spacingVerticalL,
    minHeight: "360px",
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
  },
  header: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    padding: tokens.spacingHorizontalXXL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    "@media (max-width: 680px)": {
      padding: tokens.spacingHorizontalL,
    },
  },
  headerTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalXXL,
    "@media (max-width: 980px)": {
      flexDirection: "column",
    },
  },
  titleBlock: {
    display: "grid",
    gap: tokens.spacingVerticalS,
    minWidth: 0,
  },
  eyebrow: {
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflowWrap: "anywhere",
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    overflowWrap: "anywhere",
    "@media (max-width: 600px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  description: {
    maxWidth: "820px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    "@media (max-width: 980px)": {
      justifyContent: "flex-start",
    },
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 1020px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  statusCard: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalS,
    minWidth: 0,
    padding: tokens.spacingHorizontalL,
  },
  statusCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
  },
  statusValue: {
    fontWeight: tokens.fontWeightSemibold,
    overflowWrap: "anywhere",
  },
  tabsFrame: {
    minWidth: 0,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    overflowX: "auto",
  },
  tabs: {
    minWidth: "max-content",
  },
  editTabStart: {
    marginLeft: tokens.spacingHorizontalL,
  },
  panel: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    minWidth: 0,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.8fr)",
    gap: tokens.spacingHorizontalXL,
    alignItems: "start",
    "@media (max-width: 960px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    minWidth: 0,
  },
  sectionSurface: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    minWidth: 0,
    padding: tokens.spacingHorizontalXL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 600px)": {
      padding: tokens.spacingHorizontalL,
    },
  },
  sectionHeading: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
  definitionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalM,
    margin: 0,
    "@media (max-width: 620px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  definitionItem: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  term: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  value: {
    margin: 0,
    overflowWrap: "anywhere",
  },
  policyList: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  triggerList: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  triggerCard: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  triggerHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  key: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflowWrap: "anywhere",
  },
  form: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    "@media (max-width: 680px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  stickySummary: {
    position: "sticky",
    top: tokens.spacingVerticalL,
    "@media (max-width: 960px)": {
      position: "static",
    },
  },
  informationBody: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  informationParagraph: {
    margin: 0,
  },
  tableFrame: {
    minWidth: 0,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  table: {
    minWidth: "720px",
  },
  wideTable: {
    minWidth: "1040px",
  },
  emptyTable: {
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground2,
    textAlign: "center",
  },
  codeBlock: {
    maxHeight: "360px",
    margin: 0,
    padding: tokens.spacingHorizontalL,
    overflow: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  warningText: {
    color: tokens.colorStatusDangerForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  resultStack: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
});

function DefinitionItem({ term, children }: { term: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <div className={styles.definitionItem}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

function StatusCard({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <Card appearance="outline" className={styles.statusCard}>
      <div className={styles.statusCardHeader}>
        {icon}
        <Text size={200}>{label}</Text>
      </div>
      <div className={styles.statusValue}>{children}</div>
    </Card>
  );
}

function ExecutionBadge({ result }: { result: ExecutionHistoryEntry["result"] }) {
  if (result === "SUCCESS") return <Badge appearance="tint" color="success">Sucesso</Badge>;
  if (result === "FAILED") return <Badge appearance="tint" color="danger">Falha</Badge>;
  if (result === "RECOVERED") return <Badge appearance="tint" color="informative">Recuperada</Badge>;
  if (result === "INTERRUPTION_REQUESTED") return <Badge appearance="tint" color="warning">Interrupção solicitada</Badge>;
  return <Badge appearance="tint" color="informative">Executando</Badge>;
}

export function ScheduledJobDetailPage({ group, name }: { group: string; name: string }) {
  const styles = useStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIdPrefix = useId();
  const [job, setJob] = useState<ScheduledJob>();
  const [history, setHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [timeZones, setTimeZones] = useState<TimeZoneEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ intent: "success" | "info" | "warning" | "error"; message: string }>();
  const [busyAction, setBusyAction] = useState<JobAction | "refresh">();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTriggerId, setSelectedTriggerId] = useState("");
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>();
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [httpDraft, setHttpDraft] = useState<HttpRequestDraft>();
  const [httpBaseline, setHttpBaseline] = useState<HttpRequestDraft>();
  const [showHttpErrors, setShowHttpErrors] = useState(false);
  const [isSavingHttp, setIsSavingHttp] = useState(false);
  const requestedTab = searchParams.get("tab");
  const selectedTab: DetailTab = isDetailTab(requestedTab) ? requestedTab : "overview";

  async function loadPage(showNotice = false, replaceContent = false) {
    setLoadError("");
    if (replaceContent) setIsLoading(true);
    try {
      const [loadedJob, executions, loadedTimeZones] = await Promise.all([
        getScheduledJob(group, name),
        listExecutionHistory(200),
        listTimeZones().catch(() => []),
      ]);
      setJob(loadedJob);
      setTimeZones(loadedTimeZones);
      if (loadedJob.httpRequest) {
        const draft = toHttpRequestDraft(loadedJob.httpRequest);
        setHttpDraft(draft);
        setHttpBaseline(draft);
        setShowHttpErrors(false);
      } else {
        setHttpDraft(undefined);
        setHttpBaseline(undefined);
      }
      setHistory(
        executions.filter(
          (execution) => execution.jobGroup === group && execution.jobName === name,
        ),
      );
      if (showNotice) {
        setNotice({ intent: "info", message: "Os dados da rotina e das execuções foram atualizados." });
      }
    } catch (error) {
      const message = getSchedulerApiError(error, "Não foi possível carregar esta rotina.");
      if (replaceContent) setLoadError(message);
      else setNotice({ intent: "error", message });
    } finally {
      setIsLoading(false);
      setBusyAction(undefined);
    }
  }

  useEffect(() => {
    setJob(undefined);
    setHistory([]);
    void loadPage(false, true);
  }, [group, name]);

  useEffect(() => {
    if (!job?.triggers.length) {
      setSelectedTriggerId("");
      setScheduleDraft(undefined);
      return;
    }
    const selectedStillExists = job.triggers.some(
      (trigger) => triggerIdentity(trigger) === selectedTriggerId,
    );
    if (!selectedStillExists) setSelectedTriggerId(triggerIdentity(job.triggers[0]));
  }, [job, selectedTriggerId]);

  const selectedTrigger = useMemo(
    () => job?.triggers.find((trigger) => triggerIdentity(trigger) === selectedTriggerId),
    [job, selectedTriggerId],
  );

  useEffect(() => {
    setScheduleDraft(selectedTrigger ? toDraft(selectedTrigger) : undefined);
  }, [selectedTrigger]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PageBreadcrumb items={[{ label: "Início", href: "/" }, { label: "Rotinas agendadas", href: jobsRoute }, { label: name }]} />
        <div className={styles.statePanel}><Spinner label="Carregando detalhes da rotina" /></div>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className={styles.page}>
        <PageBreadcrumb items={[{ label: "Início", href: "/" }, { label: "Rotinas agendadas", href: jobsRoute }, { label: name }]} />
        <section className={styles.statePanel} aria-labelledby="job-load-error-title">
          <h1 id="job-load-error-title" className={styles.sectionTitle}>Não foi possível abrir a rotina</h1>
          <MessageBar intent="error"><MessageBarBody>{loadError || "A rotina não foi encontrada."}</MessageBarBody></MessageBar>
          <div className={styles.actions}>
            <Button appearance="secondary" as="a" href={jobsRoute}>Voltar para rotinas</Button>
            <Button appearance="primary" icon={<ArrowClockwiseRegular />} onClick={() => void loadPage(false, true)}>Tentar novamente</Button>
          </div>
        </section>
      </div>
    );
  }

  const currentJob = job;
  const primaryTrigger = getPrimaryTrigger(currentJob);
  const triggerState = getJobTriggerState(currentJob);
  const isPaused =
    currentJob.triggers.length > 0 &&
    currentJob.triggers.every((trigger) => trigger.state === "PAUSED");
  const triggerNowDisabled = Boolean(
    busyAction || (currentJob.disallowConcurrent && currentJob.activeExecution),
  );
  const misfireCopy = scheduleDraft
    ? misfireInformation[scheduleDraft.misfireInstruction] ?? misfireInformation.SMART_POLICY
    : undefined;
  const scheduleIsDirty = Boolean(
    selectedTrigger &&
      scheduleDraft &&
      (selectedTrigger.type !== scheduleDraft.triggerType ||
        selectedTrigger.expression !== scheduleDraft.expression ||
        selectedTrigger.timeZone !== scheduleDraft.timeZone ||
        selectedTrigger.calendar !== scheduleDraft.calendar ||
        selectedTrigger.misfireInstruction !== scheduleDraft.misfireInstruction ||
        selectedTrigger.priority !== scheduleDraft.priority),
  );
  const httpIsDirty = Boolean(
    httpDraft &&
      httpBaseline &&
      JSON.stringify(httpDraft) !== JSON.stringify(httpBaseline),
  );
  const availableTimeZones = [
    ...new Set([
      ...timeZones
        .filter((timeZone) => timeZone.active)
        .map((timeZone) => timeZone.timeZone),
      ...fallbackTimeZones,
      ...(scheduleDraft?.timeZone ? [scheduleDraft.timeZone] : []),
    ]),
  ];
  const availableCalendars = [
    ...calendarOptions,
    ...(scheduleDraft?.calendar &&
    !calendarOptions.some((option) => option.value === scheduleDraft.calendar)
      ? [{ value: scheduleDraft.calendar, label: `${scheduleDraft.calendar} (legado)` }]
      : []),
  ];

  function selectTab(tab: DetailTab) {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }

  async function executeAction(action: JobAction, successMessage: string) {
    setBusyAction(action);
    setNotice(undefined);
    try {
      const updatedJob = await runJobAction(currentJob, action);
      if (action === "duplicate") {
        setNotice({ intent: "success", message: `${successMessage} A cópia é “${updatedJob.name}” e foi mantida pausada para revisão.` });
      } else {
        setJob(updatedJob);
        setNotice({ intent: "success", message: successMessage });
      }
    } catch (error) {
      setNotice({
        intent: "error",
        message: getSchedulerApiError(error, "Não foi possível concluir a operação."),
      });
    } finally {
      setBusyAction(undefined);
    }
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrigger || !scheduleDraft) return;
    if (!scheduleDraft.expression.trim()) {
      setNotice({ intent: "error", message: "Informe a expressão ou o intervalo do agendamento." });
      return;
    }
    if (scheduleDraft.priority < 1 || scheduleDraft.priority > 10) {
      setNotice({ intent: "error", message: "A prioridade precisa estar entre 1 e 10." });
      return;
    }
    setIsSavingSchedule(true);
    setNotice(undefined);
    try {
      const updatedTrigger = await updateScheduledJobTrigger(currentJob, {
        ...selectedTrigger,
        type: scheduleDraft.triggerType,
        expression: scheduleDraft.expression.trim(),
        timeZone: scheduleDraft.timeZone.trim(),
        calendar: scheduleDraft.calendar.trim(),
        misfireInstruction: scheduleDraft.misfireInstruction,
        priority: scheduleDraft.priority,
      });
      setJob((value) =>
        value
          ? {
              ...value,
              triggers: value.triggers.map((trigger) =>
                triggerIdentity(trigger) === selectedTriggerId ? updatedTrigger : trigger,
              ),
            }
          : value,
      );
      setNotice({ intent: "success", message: `Agendamento “${selectedTrigger.key}” atualizado.` });
    } catch (error) {
      setNotice({
        intent: "error",
        message: getSchedulerApiError(error, "Não foi possível salvar o agendamento."),
      });
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function saveHttpConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!httpDraft) return;
    const errors = validateHttpRequestDraft(httpDraft);
    setShowHttpErrors(true);
    if (errors.length > 0) {
      setNotice({
        intent: "error",
        message: "Revise os campos indicados antes de salvar a configuração HTTP.",
      });
      return;
    }

    setIsSavingHttp(true);
    setNotice(undefined);
    try {
      const updatedJob = await updateScheduledJobConfiguration(
        currentJob,
        toHttpRequestConfiguration(httpDraft),
      );
      const updatedDraft = updatedJob.httpRequest
        ? toHttpRequestDraft(updatedJob.httpRequest)
        : undefined;
      setJob(updatedJob);
      setHttpDraft(updatedDraft);
      setHttpBaseline(updatedDraft);
      setShowHttpErrors(false);
      setNotice({
        intent: "success",
        message:
          "Configuração HTTP atualizada. A alteração será usada nos próximos disparos.",
      });
    } catch (error) {
      setNotice({
        intent: "error",
        message: getSchedulerApiError(
          error,
          "Não foi possível salvar a configuração HTTP.",
        ),
      });
    } finally {
      setIsSavingHttp(false);
    }
  }

  async function deleteJob(jobToDelete: ScheduledJob) {
    try {
      await removeScheduledJob(jobToDelete);
      navigate(jobsRoute, { replace: true });
      return undefined;
    } catch (error) {
      return getSchedulerApiError(error, `Não foi possível excluir “${jobToDelete.name}”.`);
    }
  }

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Administração" },
          { label: "Rotinas agendadas", href: jobsRoute },
          { label: currentJob.name },
        ]}
      />

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleBlock}>
            <Text className={styles.eyebrow}>{currentJob.group}.{currentJob.name}</Text>
            <h1 className={styles.title}>{currentJob.name}</h1>
            <Text className={styles.description}>{currentJob.description || "Rotina sem descrição."}</Text>
          </div>
          <div className={styles.actions} aria-label="Ações da rotina">
            <Button
              appearance="primary"
              icon={<PlayRegular />}
              disabled={triggerNowDisabled}
              onClick={() => void executeAction("trigger", "Disparo imediato solicitado.")}
            >
              {busyAction === "trigger" ? "Solicitando..." : "Disparar agora"}
            </Button>
            {currentJob.triggers.length > 0 ? (
              <Button
                appearance="secondary"
                icon={isPaused ? <PlayRegular /> : <PauseRegular />}
                disabled={Boolean(busyAction)}
                onClick={() =>
                  void executeAction(
                    isPaused ? "resume" : "pause",
                    isPaused ? "Os disparos foram retomados." : "Os próximos disparos foram pausados.",
                  )
                }
              >
                {isPaused ? "Retomar" : "Pausar"}
              </Button>
            ) : null}
            {currentJob.activeExecution ? (
              <Button
                appearance="secondary"
                icon={<StopRegular />}
                disabled={Boolean(busyAction) || !currentJob.interruptable}
                onClick={() => void executeAction("interrupt", "A interrupção foi solicitada ao handler.")}
              >
                Interromper
              </Button>
            ) : null}
            <Button
              appearance="subtle"
              icon={<ArrowClockwiseRegular />}
              aria-label="Atualizar dados da rotina"
              disabled={Boolean(busyAction)}
              onClick={() => {
                setBusyAction("refresh");
                void loadPage(true);
              }}
            />
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle" icon={<MoreHorizontalRegular />} aria-label="Mais ações" />
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem icon={<CopyRegular />} onClick={() => void executeAction("duplicate", "Rotina duplicada.")}>Duplicar como pausada</MenuItem>
                  <MenuItem icon={<DeleteRegular />} onClick={() => setShowDeleteDialog(true)}>Excluir rotina</MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </div>

        <div className={styles.statusGrid}>
          <StatusCard icon={<ShieldCheckmarkRegular aria-hidden="true" />} label="Status operacional">
            <JobOperationalStatus execution={currentJob.activeExecution} triggerState={triggerState} />
          </StatusCard>
          <StatusCard icon={<CalendarClockRegular aria-hidden="true" />} label="Próxima execução">
            {primaryTrigger?.nextFireTime ?? "Rotina sob demanda"}
          </StatusCard>
          <StatusCard icon={<HistoryRegular aria-hidden="true" />} label="Último resultado">
            <div className={styles.resultStack}>
              <ExecutionResultBadge result={currentJob.lastExecution.result} />
              <Text size={200} className={styles.secondary}>{currentJob.lastExecution.finishedAt}</Text>
            </div>
          </StatusCard>
          <StatusCard icon={<DocumentRegular aria-hidden="true" />} label="Agendamentos">
            {currentJob.triggers.length} {currentJob.triggers.length === 1 ? "agendamento" : "agendamentos"} · {currentJob.type}
          </StatusCard>
        </div>
      </header>

      {notice ? (
        <MessageBar intent={notice.intent} aria-live="polite">
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={styles.tabsFrame}>
        <TabList
          className={styles.tabs}
          selectedValue={selectedTab}
          onTabSelect={(_, data) => selectTab(data.value as DetailTab)}
          aria-label="Consulta e alteração da rotina agendada"
        >
          <Tab id={`${tabIdPrefix}-overview`} value="overview">Visão geral</Tab>
          <Tab id={`${tabIdPrefix}-metadata`} value="metadata">Metadados do job</Tab>
          <Tab id={`${tabIdPrefix}-executions`} value="executions">Execuções ({history.length})</Tab>
          <Tab className={styles.editTabStart} icon={<EditRegular />} id={`${tabIdPrefix}-job-type`} value="job-type">
            Job Type · {currentJob.type === "HTTP_REQUEST" ? "HTTP" : currentJob.type}
          </Tab>
          <Tab icon={<EditRegular />} id={`${tabIdPrefix}-schedule`} value="schedule">Agendamento ({currentJob.triggers.length})</Tab>
        </TabList>
      </div>

      {selectedTab === "overview" ? (
        <div
          className={styles.panel}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${tabIdPrefix}-overview`}
        >
          <div className={styles.twoColumns}>
            <section className={styles.sectionSurface} aria-labelledby="operational-state-title">
              <div className={styles.sectionHeading}>
                <h2 id="operational-state-title" className={styles.sectionTitle}>Estado operacional</h2>
                <Text className={styles.secondary}>Resumo do estado atual e do próximo acionamento da rotina.</Text>
              </div>
              <JobOperationalStatus execution={currentJob.activeExecution} triggerState={triggerState} />
              <dl className={styles.definitionGrid}>
                <DefinitionItem term="Tipo do job"><Text className={styles.key}>{currentJob.type}</Text></DefinitionItem>
                <DefinitionItem term="Agendamento principal">{primaryTrigger?.schedule ?? "Sob demanda"}</DefinitionItem>
                <DefinitionItem term="Próximo disparo">{primaryTrigger?.nextFireTime ?? "Não programado"}</DefinitionItem>
                <DefinitionItem term="Triggers vinculados">{currentJob.triggers.length}</DefinitionItem>
              </dl>
            </section>

            <section className={styles.sectionSurface} aria-labelledby="current-execution-title">
              <div className={styles.sectionHeading}>
                <h2 id="current-execution-title" className={styles.sectionTitle}>Execução atual</h2>
                <Text className={styles.secondary}>Contexto em processamento neste momento.</Text>
              </div>
              <ExecutionStatus execution={currentJob.activeExecution} />
              {currentJob.activeExecution ? (
                <dl className={styles.definitionGrid}>
                  <DefinitionItem term="Início real">{currentJob.activeExecution.actualFireTime}</DefinitionItem>
                  <DefinitionItem term="Tempo decorrido">{currentJob.activeExecution.elapsed}</DefinitionItem>
                  <DefinitionItem term="Instância Quartz">{currentJob.activeExecution.schedulerInstance}</DefinitionItem>
                  <DefinitionItem term="Pod"><Text className={styles.key}>{currentJob.activeExecution.podName}</Text></DefinitionItem>
                  <DefinitionItem term="Refire count">{currentJob.activeExecution.refireCount}</DefinitionItem>
                  <DefinitionItem term="Recuperação">{currentJob.activeExecution.recovering ? "Sim" : "Não"}</DefinitionItem>
                </dl>
              ) : null}
            </section>
          </div>

          <section className={styles.sectionSurface} aria-labelledby="last-result-overview-title">
            <div className={styles.sectionHeading}>
              <h2 id="last-result-overview-title" className={styles.sectionTitle}>Última execução concluída</h2>
              <Text className={styles.secondary}>Resultado mais recente persistido para esta rotina.</Text>
            </div>
            <ExecutionResultBadge result={currentJob.lastExecution.result} />
            <dl className={styles.definitionGrid}>
              <DefinitionItem term="Finalizada em">{currentJob.lastExecution.finishedAt}</DefinitionItem>
              <DefinitionItem term="Duração">{currentJob.lastExecution.duration}</DefinitionItem>
              <DefinitionItem term="Mensagem">{currentJob.lastExecution.message || "Sem mensagem adicional"}</DefinitionItem>
            </dl>
          </section>
        </div>
      ) : null}

      {selectedTab === "metadata" ? (
        <div
          className={styles.panel}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${tabIdPrefix}-metadata`}
        >
          <section className={styles.sectionSurface} aria-labelledby="job-characteristics-title">
            <div className={styles.sectionHeading}>
              <h2 id="job-characteristics-title" className={styles.sectionTitle}>Características do job</h2>
              <Text className={styles.secondary}>Identificação persistida e políticas que controlam o comportamento da rotina.</Text>
            </div>
            <dl className={styles.definitionGrid}>
              <DefinitionItem term="Job key"><Text className={styles.key}>{currentJob.id}</Text></DefinitionItem>
              <DefinitionItem term="Tipo do job"><Text className={styles.key}>{currentJob.type}</Text></DefinitionItem>
              <DefinitionItem term="Grupo">{currentJob.group}</DefinitionItem>
              <DefinitionItem term="Descrição">{currentJob.description || "Não informada"}</DefinitionItem>
              <DefinitionItem term="Durabilidade">{currentJob.durable ? "Permanece mesmo sem triggers" : "É removido se ficar sem triggers"}</DefinitionItem>
              <DefinitionItem term="Recuperação">{currentJob.requestsRecovery ? "Solicita recuperação após falha da instância" : "Sem recuperação automática"}</DefinitionItem>
            </dl>
            <div className={styles.policyList} aria-label="Políticas do handler">
              <Badge appearance="tint" color={currentJob.disallowConcurrent ? "informative" : "subtle"}>{currentJob.disallowConcurrent ? "Concorrência bloqueada" : "Concorrência permitida"}</Badge>
              <Badge appearance="tint" color={currentJob.persistJobData ? "informative" : "subtle"}>{currentJob.persistJobData ? "Persiste dados após execução" : "Não persiste dados após execução"}</Badge>
              <Badge appearance="tint" color={currentJob.interruptable ? "success" : "subtle"}>{currentJob.interruptable ? "Aceita interrupção" : "Não interrompível"}</Badge>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="triggers-overview-title">
            <div className={styles.sectionHeading}>
              <h2 id="triggers-overview-title" className={styles.sectionTitle}>Agendamentos associados</h2>
              <Text className={styles.secondary}>Todos os triggers vinculados ao mesmo job.</Text>
            </div>
            {currentJob.triggers.length > 0 ? (
              <div className={styles.triggerList}>
                {currentJob.triggers.map((trigger) => (
                  <article className={styles.triggerCard} key={triggerIdentity(trigger)}>
                    <div className={styles.triggerHeader}>
                      <div>
                        <Text weight="semibold">{trigger.schedule}</Text><br />
                        <Text className={styles.key}>{trigger.group}.{trigger.key}</Text>
                      </div>
                      <TriggerStateBadge state={trigger.state} />
                    </div>
                    <dl className={styles.definitionGrid}>
                      <DefinitionItem term="Tipo">{triggerTypeLabels[trigger.type]}</DefinitionItem>
                      <DefinitionItem term="Próxima execução">{trigger.nextFireTime}</DefinitionItem>
                      <DefinitionItem term="Último disparo">{trigger.previousFireTime}</DefinitionItem>
                      <DefinitionItem term="Fuso horário">{trigger.timeZone}</DefinitionItem>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <MessageBar intent="info"><MessageBarBody>Esta rotina é durável e está disponível somente para disparos manuais.</MessageBarBody></MessageBar>
            )}
          </section>
        </div>
      ) : null}

      {selectedTab === "schedule" ? (
        <div
          className={styles.panel}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${tabIdPrefix}-schedule`}
        >
          {selectedTrigger && scheduleDraft ? (
            <div className={styles.twoColumns}>
              <section className={styles.sectionSurface} aria-labelledby="schedule-editor-title">
                <div className={styles.sectionHeading}>
                  <h2 id="schedule-editor-title" className={styles.sectionTitle}>Editar agendamento</h2>
                  <Text className={styles.secondary}>Altere quando e como o Quartz deve disparar este trigger.</Text>
                </div>
                {currentJob.triggers.length > 1 ? (
                  <Field label="Trigger selecionado">
                    <Select value={selectedTriggerId} onChange={(event) => setSelectedTriggerId(event.target.value)}>
                      {currentJob.triggers.map((trigger) => (
                        <option key={triggerIdentity(trigger)} value={triggerIdentity(trigger)}>{trigger.group}.{trigger.key}</option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                <form className={styles.form} onSubmit={saveSchedule}>
                  <div className={styles.formGrid}>
                    <Field label="Tipo de agendamento" required>
                      <Select
                        value={scheduleDraft.triggerType}
                        onChange={(event) =>
                          setScheduleDraft((value) =>
                            value
                              ? {
                                  ...value,
                                  triggerType: event.target.value as TriggerType,
                                  expression:
                                    triggerExpressionDefaults[
                                      event.target.value as TriggerType
                                    ],
                                  misfireInstruction: "SMART_POLICY",
                                }
                              : value,
                          )
                        }
                      >
                        {triggerTypes.map((type) => <option key={type} value={type}>{triggerTypeLabels[type]}</option>)}
                      </Select>
                    </Field>
                    <Field label="Prioridade" hint="Valores maiores são processados primeiro quando dois disparos ocorrem juntos." required>
                      <Input type="number" min={1} max={10} value={String(scheduleDraft.priority)} onChange={(_, data) => setScheduleDraft((value) => value ? { ...value, priority: Number(data.value) } : value)} />
                    </Field>
                    <Field className={styles.fullWidth} label="Expressão ou intervalo" hint="Use a sintaxe correspondente ao tipo de agendamento selecionado." required>
                      <Input value={scheduleDraft.expression} onChange={(_, data) => setScheduleDraft((value) => value ? { ...value, expression: data.value } : value)} />
                    </Field>
                    <Field label="Fuso horário" hint="Identificador IANA, por exemplo America/Sao_Paulo." required>
                      <Select value={scheduleDraft.timeZone} onChange={(event) => setScheduleDraft((value) => value ? { ...value, timeZone: event.target.value } : value)}>
                        {availableTimeZones.map((timeZone) => {
                          const catalogEntry = timeZones.find((entry) => entry.timeZone === timeZone);
                          return (
                            <option key={timeZone} value={timeZone}>
                              {catalogEntry ? `${catalogEntry.label} — ${timeZone}` : timeZone}
                            </option>
                          );
                        })}
                      </Select>
                    </Field>
                    <Field label="Calendário de exclusão" hint="Selecione o calendário que deve impedir disparos em datas específicas.">
                      <Select value={scheduleDraft.calendar} onChange={(event) => setScheduleDraft((value) => value ? { ...value, calendar: event.target.value } : value)}>
                        {availableCalendars.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field className={styles.fullWidth} label="Política para disparos perdidos" required>
                      <Select value={scheduleDraft.misfireInstruction} onChange={(event) => setScheduleDraft((value) => value ? { ...value, misfireInstruction: event.target.value } : value)}>
                        {misfireOptions[scheduleDraft.triggerType].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {misfireCopy ? (
                    <MessageBar intent="info">
                      <MessageBarBody className={styles.informationBody}>
                        <MessageBarTitle>{misfireCopy.title}</MessageBarTitle>
                        <p className={styles.informationParagraph}>{misfireCopy.description}</p>
                        <p className={styles.informationParagraph}>{misfireCopy.example}</p>
                      </MessageBarBody>
                    </MessageBar>
                  ) : null}
                  <div className={styles.formActions}>
                    <Button type="button" appearance="secondary" disabled={!scheduleIsDirty || isSavingSchedule} onClick={() => setScheduleDraft(toDraft(selectedTrigger))}>Descartar alterações</Button>
                    <Button type="submit" appearance="primary" icon={<SaveRegular />} disabled={!scheduleIsDirty || isSavingSchedule}>{isSavingSchedule ? "Salvando..." : "Salvar agendamento"}</Button>
                  </div>
                </form>
              </section>

              <aside className={styles.stickySummary}>
                <section className={styles.sectionSurface} aria-labelledby="schedule-status-title">
                  <div className={styles.sectionHeading}>
                    <h2 id="schedule-status-title" className={styles.sectionTitle}>Estado do trigger</h2>
                    <Text className={styles.key}>{selectedTrigger.group}.{selectedTrigger.key}</Text>
                  </div>
                  <TriggerStateBadge state={selectedTrigger.state} />
                  <dl className={styles.definitionGrid}>
                    <DefinitionItem term="Regra atual">{selectedTrigger.schedule}</DefinitionItem>
                    <DefinitionItem term="Próximo disparo">{selectedTrigger.nextFireTime}</DefinitionItem>
                    <DefinitionItem term="Disparo anterior">{selectedTrigger.previousFireTime}</DefinitionItem>
                    <DefinitionItem term="Início">{selectedTrigger.startAt}</DefinitionItem>
                    <DefinitionItem term="Término">{selectedTrigger.endAt}</DefinitionItem>
                    <DefinitionItem term="Prioridade">{selectedTrigger.priority}</DefinitionItem>
                  </dl>
                </section>
              </aside>
            </div>
          ) : (
            <section className={styles.sectionSurface}>
              <MessageBar intent="info"><MessageBarBody>Esta rotina não possui um trigger editável. Ela pode ser disparada manualmente.</MessageBarBody></MessageBar>
            </section>
          )}
        </div>
      ) : null}

      {selectedTab === "job-type" ? (
        <div
          className={styles.panel}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${tabIdPrefix}-job-type`}
        >
          {currentJob.type === "HTTP_REQUEST" && currentJob.httpRequest && httpDraft ? (
            <section className={styles.sectionSurface} aria-labelledby="http-configuration-title">
              <div className={styles.sectionHeading}>
                <h2 id="http-configuration-title" className={styles.sectionTitle}>Editar Job Type — HTTP</h2>
                <Text className={styles.secondary}>
                  Ajuste destino, autenticação, parâmetros, body, segurança e política de novas tentativas.
                </Text>
              </div>
              <MessageBar intent="info">
                <MessageBarBody>
                  A identidade e o tipo do job permanecem os mesmos. As alterações passam a valer nos próximos disparos e não afetam uma execução que já esteja em andamento.
                </MessageBarBody>
              </MessageBar>
              <form className={styles.form} onSubmit={saveHttpConfiguration}>
                <HttpRequestEditor
                  draft={httpDraft}
                  showErrors={showHttpErrors}
                  onChange={(update) =>
                    setHttpDraft((value) => value ? { ...value, ...update } : value)
                  }
                />
                <div className={styles.formActions}>
                  <Button
                    type="button"
                    appearance="secondary"
                    disabled={!httpIsDirty || isSavingHttp}
                    onClick={() => {
                      setHttpDraft(httpBaseline);
                      setShowHttpErrors(false);
                      setNotice(undefined);
                    }}
                  >
                    Descartar alterações
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    icon={<SaveRegular />}
                    disabled={!httpIsDirty || isSavingHttp}
                  >
                    {isSavingHttp ? "Salvando..." : "Salvar configuração HTTP"}
                  </Button>
                </div>
              </form>
            </section>
          ) : (
            <section className={styles.sectionSurface}>
              <MessageBar intent="warning">
                <MessageBarBody>
                  Esta rotina usa uma definição legada e não possui uma configuração HTTP editável.
                </MessageBarBody>
              </MessageBar>
            </section>
          )}
        </div>
      ) : null}

      {selectedTab === "executions" ? (
        <div
          className={styles.panel}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${tabIdPrefix}-executions`}
        >
          <div className={styles.twoColumns}>
            <section className={styles.sectionSurface} aria-labelledby="active-execution-title">
              <div className={styles.sectionHeading}>
                <h2 id="active-execution-title" className={styles.sectionTitle}>Execução ativa</h2>
                <Text className={styles.secondary}>Estado em tempo real informado pelo scheduler.</Text>
              </div>
              <ExecutionStatus execution={currentJob.activeExecution} />
              {currentJob.activeExecution ? (
                <dl className={styles.definitionGrid}>
                  <DefinitionItem term="Fire instance ID"><Text className={styles.key}>{currentJob.activeExecution.fireInstanceId}</Text></DefinitionItem>
                  <DefinitionItem term="Disparo previsto">{currentJob.activeExecution.scheduledFireTime}</DefinitionItem>
                  <DefinitionItem term="Início real">{currentJob.activeExecution.actualFireTime}</DefinitionItem>
                  <DefinitionItem term="Tempo decorrido">{currentJob.activeExecution.elapsed}</DefinitionItem>
                  <DefinitionItem term="Instância">{currentJob.activeExecution.schedulerInstance}</DefinitionItem>
                  <DefinitionItem term="Pod"><Text className={styles.key}>{currentJob.activeExecution.podName}</Text></DefinitionItem>
                </dl>
              ) : null}
            </section>
            <section className={styles.sectionSurface} aria-labelledby="last-execution-title">
              <div className={styles.sectionHeading}>
                <h2 id="last-execution-title" className={styles.sectionTitle}>Última execução concluída</h2>
                <Text className={styles.secondary}>Resultado mais recente persistido no histórico.</Text>
              </div>
              <ExecutionResultBadge result={currentJob.lastExecution.result} />
              <dl className={styles.definitionGrid}>
                <DefinitionItem term="Finalizada em">{currentJob.lastExecution.finishedAt}</DefinitionItem>
                <DefinitionItem term="Duração">{currentJob.lastExecution.duration}</DefinitionItem>
                <DefinitionItem term="Mensagem">{currentJob.lastExecution.message || "Sem mensagem adicional"}</DefinitionItem>
              </dl>
            </section>
          </div>

          <section className={styles.section} aria-labelledby="execution-history-title">
            <div className={styles.sectionHeading}>
              <h2 id="execution-history-title" className={styles.sectionTitle}>Histórico de execuções</h2>
              <Text className={styles.secondary}>Eventos desta rotina encontrados entre as 200 execuções mais recentes do scheduler.</Text>
            </div>
            <div className={styles.tableFrame}>
              <Table className={styles.wideTable} size="small" aria-label="Histórico de execuções da rotina">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Resultado</TableHeaderCell>
                    <TableHeaderCell>Início</TableHeaderCell>
                    <TableHeaderCell>Conclusão</TableHeaderCell>
                    <TableHeaderCell>Duração</TableHeaderCell>
                    <TableHeaderCell>Trigger</TableHeaderCell>
                    <TableHeaderCell>Instância</TableHeaderCell>
                    <TableHeaderCell>Mensagem</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell className={styles.emptyTable} colSpan={7}>Nenhuma execução registrada para esta rotina</TableCell></TableRow>
                  ) : (
                    history.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell><ExecutionBadge result={execution.result} /></TableCell>
                        <TableCell>{formatInstant(execution.actualFireTime)}</TableCell>
                        <TableCell>{formatInstant(execution.finishedAt)}</TableCell>
                        <TableCell>{formatDuration(execution.durationMillis)}</TableCell>
                        <TableCell><Text className={styles.key}>{execution.triggerGroup && execution.triggerName ? `${execution.triggerGroup}.${execution.triggerName}` : "Disparo manual"}</Text></TableCell>
                        <TableCell>{execution.schedulerInstance}</TableCell>
                        <TableCell>{execution.message || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      ) : null}

      <DeleteScheduledJobDialog
        job={showDeleteDialog ? currentJob : undefined}
        onClose={() => setShowDeleteDialog(false)}
        onDelete={deleteJob}
      />
    </div>
  );
}
