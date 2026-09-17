import {
  Button,
  Card,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSelectionCell,
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowSync24Regular,
  CalendarClock24Regular,
  ChevronLeftRegular,
  ChevronRightRegular,
  CopyRegular,
  DeleteRegular,
  DismissRegular,
  EditRegular,
  ErrorCircle24Regular,
  MoreHorizontalRegular,
  PauseCircle24Regular,
  PauseRegular,
  PlayCircle24Regular,
  PlayRegular,
  SearchRegular,
  StopRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { PageBreadcrumb } from "../../components/page-breadcrumb";
import {
  DeleteScheduledJobDialog,
  ScheduleEditorDialog,
  type ScheduleDraft,
} from "./scheduled-job-editor-dialogs";
import { ScheduledJobDetailsDialog } from "./scheduled-job-details-dialog";
import {
  cloneScheduledJob,
  getJobTriggerState,
  getPrimaryTrigger,
  scheduledJobs as initialScheduledJobs,
  triggerTypes,
  type ScheduledJob,
  type TriggerState,
  type TriggerType,
} from "./scheduled-jobs-model";
import {
  ExecutionResultBadge,
  getExecutionResultLabel,
  getJobOperationalStatusLabel,
  JobOperationalStatus,
} from "./scheduled-job-status";

const allGroups = "Todos os grupos" as const;
const allStates = "Todos os estados" as const;
const allTriggerTypes = "Todos os tipos" as const;
const pageSizeOptions = [15, 45, 100] as const;

type StateFilter = TriggerState | typeof allStates | "RUNNING";
type TriggerTypeFilter = TriggerType | typeof allTriggerTypes;
type PageSize = (typeof pageSizeOptions)[number];
type PaginationItem = number | "start-ellipsis" | "end-ellipsis";
type SummaryTone = "neutral" | "brand" | "warning" | "danger";
type SortColumn =
  | "status"
  | "name"
  | "group"
  | "schedule"
  | "nextExecution"
  | "lastResult";
type SortDirection = "ascending" | "descending";
type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

const triggerTypeLabels: Record<TriggerType, string> = {
  CronTrigger: "Expressão cron",
  SimpleTrigger: "Intervalo simples",
  CalendarIntervalTrigger: "Intervalo de calendário",
  DailyTimeIntervalTrigger: "Intervalo diário",
};

function getPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    totalPages,
  ];
}

const jobCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

const monthIndexes: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

function parseDisplayedDate(value: string) {
  const normalized = normalizeSearch(value);
  const match = normalized.match(
    /^(\d{1,2})\s+([a-z]{3})\.?\s+(\d{4}),\s+(\d{2}):(\d{2})$/,
  );
  if (!match) return undefined;

  const [, day, month, year, hour, minute] = match;
  const monthIndex = monthIndexes[month];
  if (monthIndex === undefined) return undefined;

  return Date.UTC(
    Number(year),
    monthIndex,
    Number(day),
    Number(hour),
    Number(minute),
  );
}

function compareNextExecutions(first: string, second: string) {
  const firstDate = parseDisplayedDate(first);
  const secondDate = parseDisplayedDate(second);

  if (firstDate !== undefined && secondDate !== undefined) {
    return firstDate - secondDate;
  }
  if (firstDate !== undefined) return -1;
  if (secondDate !== undefined) return 1;
  return jobCollator.compare(first, second);
}

function compareJobs(
  first: ScheduledJob,
  second: ScheduledJob,
  column: SortColumn,
) {
  const firstTrigger = getPrimaryTrigger(first);
  const secondTrigger = getPrimaryTrigger(second);

  if (column === "status") {
    return jobCollator.compare(
      getJobOperationalStatusLabel({
        execution: first.activeExecution,
        triggerState: getJobTriggerState(first),
      }),
      getJobOperationalStatusLabel({
        execution: second.activeExecution,
        triggerState: getJobTriggerState(second),
      }),
    );
  }
  if (column === "name") {
    return jobCollator.compare(first.name, second.name);
  }
  if (column === "group") {
    return jobCollator.compare(first.group, second.group);
  }
  if (column === "schedule") {
    return jobCollator.compare(
      firstTrigger?.schedule ?? "Sem agendamento",
      secondTrigger?.schedule ?? "Sem agendamento",
    );
  }
  if (column === "nextExecution") {
    return compareNextExecutions(
      firstTrigger?.nextFireTime ?? "Não agendada",
      secondTrigger?.nextFireTime ?? "Não agendada",
    );
  }
  return jobCollator.compare(
    getExecutionResultLabel(first.lastExecution.result),
    getExecutionResultLabel(second.lastExecution.result),
  );
}

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalXL,
    "@media (max-width: 840px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  headerCopy: {
    minWidth: 0,
  },
  title: {
    marginTop: 0,
    marginBottom: 0,
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
    letterSpacing: "-0.02em",
    "@media (max-width: 600px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "880px",
    marginTop: tokens.spacingVerticalS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
    flexShrink: 0,
    "@media (max-width: 840px)": {
      justifyContent: "start",
    },
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    },
    "@media (max-width: 700px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 440px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  summaryCard: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    padding: tokens.spacingHorizontalL,
    borderTopWidth: tokens.strokeWidthThickest,
  },
  summaryCardNeutral: {
    borderTopColor: tokens.colorNeutralStrokeAccessible,
  },
  summaryCardBrand: {
    borderTopColor: tokens.colorBrandStroke1,
  },
  summaryCardWarning: {
    borderTopColor: tokens.colorStatusWarningBorderActive,
  },
  summaryCardDanger: {
    borderTopColor: tokens.colorStatusDangerBorderActive,
  },
  summaryCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  summaryIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "40px",
    height: "40px",
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
  },
  summaryIconNeutral: {
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  summaryIconBrand: {
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  summaryIconWarning: {
    color: tokens.colorStatusWarningForeground3,
    backgroundColor: tokens.colorStatusWarningBackground1,
  },
  summaryIconDanger: {
    color: tokens.colorStatusDangerForeground1,
    backgroundColor: tokens.colorStatusDangerBackground1,
  },
  summaryValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  summaryCopy: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  summaryLabel: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  summaryDescription: {
    color: tokens.colorNeutralForeground2,
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    minWidth: 0,
  },
  sectionHeading: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 720px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  sectionDescription: {
    maxWidth: "900px",
    marginTop: tokens.spacingVerticalXS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
  },
  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 1.2fr) minmax(180px, 0.55fr) minmax(190px, 0.6fr) minmax(210px, 0.65fr) auto",
    gap: tokens.spacingHorizontalM,
    alignItems: "end",
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 1180px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 600px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  bulkActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    flexWrap: "wrap",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  bulkSummary: {
    display: "grid",
    gap: "2px",
  },
  bulkButtons: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    flexWrap: "wrap",
  },
  tablePanel: {
    minWidth: 0,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    width: "100%",
    minWidth: "1240px",
  },
  tableRow: {
    backgroundColor: tokens.colorNeutralBackground1,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    "&:focus-within": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableRowSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    "&:hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
    "&:focus-within": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: tokens.spacingHorizontalXS,
    minWidth: "136px",
    whiteSpace: "nowrap",
  },
  actionsHeader: {
    position: "sticky",
    zIndex: 2,
    right: 0,
    width: "156px",
    minWidth: "156px",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `-${tokens.strokeWidthThin} 0 0 ${tokens.colorNeutralStroke2}`,
  },
  actionsCell: {
    position: "sticky",
    zIndex: 1,
    right: 0,
    width: "156px",
    minWidth: "156px",
    backgroundColor: "inherit",
    boxShadow: `-${tokens.strokeWidthThin} 0 0 ${tokens.colorNeutralStroke2}`,
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalXL,
    flexWrap: "wrap",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 900px)": {
      alignItems: "start",
      flexDirection: "column",
    },
  },
  paginationSummary: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: tokens.spacingHorizontalL,
    flexWrap: "wrap",
    "@media (max-width: 900px)": {
      justifyContent: "start",
    },
  },
  pageSizeControl: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    whiteSpace: "nowrap",
  },
  pageSizeLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  pageSizeSelect: {
    width: "72px",
    minWidth: "72px",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  pageNumbers: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXXS,
  },
  pageButton: {
    minWidth: "32px",
  },
  paginationEllipsis: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "24px",
    color: tokens.colorNeutralForeground2,
  },
  empty: {
    display: "grid",
    placeItems: "center",
    gap: tokens.spacingVerticalM,
    minHeight: "240px",
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
  },
});

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function SummaryCard({
  value,
  label,
  description,
  icon,
  tone,
}: {
  value: number;
  label: string;
  description: string;
  icon: ReactNode;
  tone: SummaryTone;
}) {
  const styles = useStyles();
  const cardToneClass = {
    neutral: styles.summaryCardNeutral,
    brand: styles.summaryCardBrand,
    warning: styles.summaryCardWarning,
    danger: styles.summaryCardDanger,
  }[tone];
  const iconToneClass = {
    neutral: styles.summaryIconNeutral,
    brand: styles.summaryIconBrand,
    warning: styles.summaryIconWarning,
    danger: styles.summaryIconDanger,
  }[tone];

  return (
    <Card
      appearance="outline"
      className={mergeClasses(styles.summaryCard, cardToneClass)}
    >
      <div className={styles.summaryCardHeader}>
        <span
          aria-hidden="true"
          className={mergeClasses(styles.summaryIcon, iconToneClass)}
        >
          {icon}
        </span>
        <Text className={styles.summaryValue}>{value}</Text>
      </div>
      <div className={styles.summaryCopy}>
        <Text className={styles.summaryLabel}>{label}</Text>
        <Text size={200} className={styles.summaryDescription}>
          {description}
        </Text>
      </div>
    </Card>
  );
}

export function ScheduledJobsPage() {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ScheduledJob[]>(() =>
    initialScheduledJobs.map((job) => ({
      ...job,
      triggers: job.triggers.map((trigger) => ({ ...trigger })),
      jobData: job.jobData.map((entry) => ({ ...entry })),
      activeExecution: job.activeExecution
        ? { ...job.activeExecution }
        : undefined,
    })),
  );
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>(allGroups);
  const [stateFilter, setStateFilter] = useState<StateFilter>(allStates);
  const [triggerTypeFilter, setTriggerTypeFilter] =
    useState<TriggerTypeFilter>(allTriggerTypes);
  const [notice, setNotice] = useState<{
    intent: "success" | "warning" | "info" | "error";
    message: string;
  }>();
  const [jobToEdit, setJobToEdit] = useState<ScheduledJob>();
  const [jobToDelete, setJobToDelete] = useState<ScheduledJob>();
  const [lastUpdated, setLastUpdated] = useState("agora");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [sort, setSort] = useState<SortState>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(15);

  useEffect(() => {
    const createdJob = (
      location.state as { createdJob?: ScheduledJob } | null
    )?.createdJob;
    if (!createdJob) return;

    setJobs((current) =>
      current.some((job) => job.id === createdJob.id)
        ? current
        : [...current, createdJob],
    );
    setNotice({
      intent: "success",
      message: `Rotina “${createdJob.name}” criada no mockup. Na integração, a API ${createdJob.triggers.length > 0 ? "salvará a rotina e seu agendamento em uma única operação" : "salvará a rotina como sob demanda"}.`,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const groups = useMemo(
    () => [...new Set(jobs.map((job) => job.group))].sort(),
    [jobs],
  );

  const visibleJobs = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    const filteredJobs = jobs.filter((job) => {
      const trigger = getPrimaryTrigger(job);
      const state = getJobTriggerState(job);
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearch(
          [
            job.name,
            job.group,
            job.description,
            job.jobClass,
            trigger?.key ?? "",
          ].join(" "),
        ).includes(normalizedSearch);
      const matchesGroup =
        groupFilter === allGroups || job.group === groupFilter;
      const matchesState =
        stateFilter === allStates ||
        (stateFilter === "RUNNING"
          ? Boolean(job.activeExecution)
          : state === stateFilter);
      const matchesType =
        triggerTypeFilter === allTriggerTypes ||
        trigger?.type === triggerTypeFilter;

      return matchesSearch && matchesGroup && matchesState && matchesType;
    });

    if (!sort) return filteredJobs;

    const direction = sort.direction === "ascending" ? 1 : -1;
    return filteredJobs.sort(
      (first, second) => compareJobs(first, second, sort.column) * direction,
    );
  }, [groupFilter, jobs, search, sort, stateFilter, triggerTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageJobs = visibleJobs.slice(
    pageStartIndex,
    pageStartIndex + pageSize,
  );
  const firstVisibleJob = pageJobs.length > 0 ? pageStartIndex + 1 : 0;
  const lastVisibleJob = pageStartIndex + pageJobs.length;
  const paginationItems = getPaginationItems(currentPage, totalPages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  const runningCount = jobs.filter((job) => job.activeExecution).length;
  const pausedCount = jobs.filter(
    (job) => getJobTriggerState(job) === "PAUSED",
  ).length;
  const errorCount = jobs.filter(
    (job) => getJobTriggerState(job) === "ERROR",
  ).length;
  const onDemandCount = jobs.filter(
    (job) => getJobTriggerState(job) === "NONE",
  ).length;
  const filtersAreActive =
    search.trim().length > 0 ||
    groupFilter !== allGroups ||
    stateFilter !== allStates ||
    triggerTypeFilter !== allTriggerTypes;
  const selectedVisibleJobs = visibleJobs.filter((job) =>
    selectedJobIds.has(job.id),
  );
  const selectedPageJobs = pageJobs.filter((job) =>
    selectedJobIds.has(job.id),
  );
  const allPageJobsAreSelected =
    pageJobs.length > 0 && selectedPageJobs.length === pageJobs.length;
  const somePageJobsAreSelected =
    selectedPageJobs.length > 0 && !allPageJobsAreSelected;
  const pausableSelectedCount = selectedVisibleJobs.filter(
    (job) =>
      job.triggers.length > 0 && getJobTriggerState(job) !== "PAUSED",
  ).length;
  const executableSelectedCount = selectedVisibleJobs.filter(
    (job) => !(job.disallowConcurrent && job.activeExecution),
  ).length;
  const interruptibleSelectedCount = selectedVisibleJobs.filter(
    (job) => job.activeExecution && job.interruptable,
  ).length;

  function updateJob(jobId: string, updater: (job: ScheduledJob) => ScheduledJob) {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? updater(job) : job)),
    );
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function toggleAllPageJobs() {
    const pageIds = pageJobs.map((job) => job.id);
    setSelectedJobIds((current) => {
      const next = new Set(current);
      if (pageIds.every((jobId) => current.has(jobId))) {
        pageIds.forEach((jobId) => next.delete(jobId));
      } else {
        pageIds.forEach((jobId) => next.add(jobId));
      }
      return next;
    });
  }

  function toggleSort(column: SortColumn) {
    setPage(1);
    setSort((current) => ({
      column,
      direction:
        current?.column === column && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  function getSortDirection(column: SortColumn) {
    return sort?.column === column ? sort.direction : undefined;
  }

  function handlePauseSelected() {
    const pausableIds = new Set(
      selectedVisibleJobs
        .filter(
          (job) =>
            job.triggers.length > 0 && getJobTriggerState(job) !== "PAUSED",
        )
        .map((job) => job.id),
    );

    setJobs((current) =>
      current.map((job) =>
        pausableIds.has(job.id)
          ? {
              ...job,
              triggers: job.triggers.map((trigger) => ({
                ...trigger,
                state: "PAUSED",
                nextFireTime: "Pausado",
              })),
            }
          : job,
      ),
    );
    const pausedMessage =
      pausableIds.size === 1
        ? "1 rotina teve os novos disparos pausados."
        : `${pausableIds.size} rotinas tiveram os novos disparos pausados.`;
    setNotice({
      intent: "warning",
      message: `${pausedMessage} A API pausará os próximos disparos de cada rotina; execuções já iniciadas continuarão normalmente.`,
    });
  }

  function handleTriggerSelected() {
    const executableIds = new Set(
      selectedVisibleJobs
        .filter((job) => !(job.disallowConcurrent && job.activeExecution))
        .map((job) => job.id),
    );
    const requestedAt = Date.now();

    setJobs((current) =>
      current.map((job, index) =>
        executableIds.has(job.id)
          ? {
              ...job,
              activeExecution: {
                state: "RUNNING",
                fireInstanceId: `manual-lote-${requestedAt}-${index}`,
                schedulerInstance: "Aguardando aquisição",
                podName: "Aguardando aquisição por uma instância",
                scheduledFireTime: "Disparo manual em lote",
                actualFireTime: "agora",
                elapsed: "menos de 1 s",
                refireCount: 0,
                recovering: false,
              },
            }
          : job,
      ),
    );

    const skippedCount = selectedVisibleJobs.length - executableIds.size;
    const requestedMessage =
      executableIds.size === 1
        ? "Disparo imediato solicitado para 1 rotina."
        : `Disparo imediato solicitado para ${executableIds.size} rotinas.`;
    const skippedMessage =
      skippedCount === 1
        ? "1 rotina em execução e sem concorrência foi ignorada."
        : `${skippedCount} rotinas em execução e sem concorrência foram ignoradas.`;
    setNotice({
      intent: skippedCount > 0 ? "warning" : "success",
      message: `${requestedMessage} ${skippedCount > 0 ? skippedMessage : "A API acompanhará cada nova execução."}`,
    });
  }

  function handleInterruptSelected() {
    const interruptibleIds = new Set(
      selectedVisibleJobs
        .filter((job) => job.activeExecution && job.interruptable)
        .map((job) => job.id),
    );

    setJobs((current) =>
      current.map((job) =>
        interruptibleIds.has(job.id) && job.activeExecution
          ? {
              ...job,
              activeExecution: {
                ...job.activeExecution,
                state: "INTERRUPTION_REQUESTED",
              },
            }
          : job,
      ),
    );
    const interruptionMessage =
      interruptibleIds.size === 1
        ? "Interrupção solicitada para 1 execução."
        : `Interrupção solicitada para ${interruptibleIds.size} execuções.`;
    setNotice({
      intent: "warning",
      message: `${interruptionMessage} A API encaminhará o comando ao nó responsável; a conclusão depende de cada rotina aceitar a interrupção.`,
    });
  }

  function handleTriggerNow(job: ScheduledJob) {
    if (job.disallowConcurrent && job.activeExecution) {
      setNotice({
        intent: "warning",
        message: `“${job.name}” já está em execução e não permite concorrência. Nenhum novo disparo foi criado.`,
      });
      return;
    }

    updateJob(job.id, (current) => ({
      ...current,
      activeExecution: {
        state: "RUNNING",
        fireInstanceId: `manual-${Date.now()}`,
        schedulerInstance: "Aguardando aquisição",
        podName: "Aguardando aquisição por uma instância",
        scheduledFireTime: "Disparo manual",
        actualFireTime: "agora",
        elapsed: "menos de 1 s",
        refireCount: 0,
        recovering: false,
      },
    }));
    setNotice({
      intent: "success",
      message: `Disparo imediato solicitado para “${job.name}”. A API enviará o comando e acompanhará a nova execução.`,
    });
  }

  function handlePause(job: ScheduledJob) {
    updateJob(job.id, (current) => ({
      ...current,
      triggers: current.triggers.map((trigger) => ({
        ...trigger,
        state: "PAUSED",
        nextFireTime: "Pausado",
      })),
    }));
    setNotice({
      intent: "warning",
      message: `Novos disparos de “${job.name}” foram pausados. Execuções já iniciadas continuam normalmente.`,
    });
  }

  function handleResume(job: ScheduledJob) {
    updateJob(job.id, (current) => ({
      ...current,
      triggers: current.triggers.map((trigger) => ({
        ...trigger,
        state: "NORMAL",
        nextFireTime: "Recalculado pela API",
      })),
    }));
    setNotice({
      intent: "success",
      message: `Os disparos de “${job.name}” foram retomados. A próxima execução será recalculada automaticamente.`,
    });
  }

  function handleInterrupt(job: ScheduledJob) {
    if (!job.activeExecution || !job.interruptable) return;

    updateJob(job.id, (current) => ({
      ...current,
      activeExecution: current.activeExecution
        ? { ...current.activeExecution, state: "INTERRUPTION_REQUESTED" }
        : undefined,
    }));
    setNotice({
      intent: "warning",
      message: `Interrupção solicitada para “${job.name}”. A API encaminhará o comando ao nó responsável; o término depende de a rotina aceitar a interrupção.`,
    });
  }

  function handleDuplicate(job: ScheduledJob) {
    const duplicatedJob = cloneScheduledJob(job);
    setJobs((current) => [...current, duplicatedJob]);
    setNotice({
      intent: "success",
      message: `Cópia “${duplicatedJob.name}” criada e mantida pausada para revisão.`,
    });
  }

  function handleSaveSchedule(job: ScheduledJob, draft: ScheduleDraft) {
    updateJob(job.id, (current) => ({
      ...current,
      triggers: current.triggers.map((trigger, index) =>
        index === 0
          ? {
              ...trigger,
              type: draft.triggerType,
              expression: draft.expression,
              schedule: `Agendamento atualizado: ${draft.expression}`,
              timeZone: draft.timeZone,
              calendar: draft.calendar,
              misfireInstruction: draft.misfireInstruction,
              priority: draft.priority,
              nextFireTime: "Recalculado pela API",
            }
          : trigger,
      ),
    }));
    setJobToEdit(undefined);
    setNotice({
      intent: "success",
      message: `Agendamento de “${job.name}” atualizado. A API substituirá somente a configuração deste agendamento.`,
    });
  }

  function handleDelete(job: ScheduledJob) {
    setJobs((current) => current.filter((item) => item.id !== job.id));
    setSelectedJobIds((current) => {
      const next = new Set(current);
      next.delete(job.id);
      return next;
    });
    setJobToDelete(undefined);
    setNotice({
      intent: "success",
      message: `Rotina “${job.name}” removida do mockup com seus agendamentos associados.`,
    });
  }

  function clearFilters() {
    setSearch("");
    setGroupFilter(allGroups);
    setStateFilter(allStates);
    setTriggerTypeFilter(allTriggerTypes);
    setPage(1);
  }

  function handleRefresh() {
    setLastUpdated(
      new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()),
    );
    setNotice({
      intent: "info",
      message:
        "Dados atualizados. Na integração, a API consultará rotinas, agendamentos e execuções ativas em todos os nós do serviço.",
    });
  }

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: "Rotinas agendadas" },
        ]}
      />

      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1 className={styles.title}>Rotinas agendadas</h1>
          <p className={styles.lead}>
            Gerencie rotinas, acompanhe execuções em andamento e controle os
            agendamentos em um só lugar.
          </p>
        </div>
        <div className={styles.headerActions} aria-label="Ações da página">
          <Button
            appearance="secondary"
            size="large"
            icon={<ArrowClockwiseRegular />}
            onClick={handleRefresh}
          >
            Atualizar dados
          </Button>
          <Button
            as="a"
            href="/administracao/agendamentos/rotinas-agendadas/nova"
            appearance="primary"
            size="large"
            icon={<AddRegular />}
          >
            Criar rotina
          </Button>
        </div>
      </header>

      {notice ? (
        <MessageBar intent={notice.intent} role="status">
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <section className={styles.summaryGrid} aria-label="Resumo das rotinas">
        <SummaryCard
          value={jobs.length}
          label="Rotinas"
          description="Cadastradas no sistema"
          icon={<CalendarClock24Regular />}
          tone="neutral"
        />
        <SummaryCard
          value={runningCount}
          label="Em execução"
          description="Processando agora"
          icon={<ArrowSync24Regular />}
          tone="brand"
        />
        <SummaryCard
          value={pausedCount}
          label="Pausadas"
          description="Aguardam retomada"
          icon={<PauseCircle24Regular />}
          tone="warning"
        />
        <SummaryCard
          value={errorCount}
          label="Com erro"
          description="Precisam de atenção"
          icon={<ErrorCircle24Regular />}
          tone="danger"
        />
        <SummaryCard
          value={onDemandCount}
          label="Sob demanda"
          description="Iniciadas manualmente"
          icon={<PlayCircle24Regular />}
          tone="neutral"
        />
      </section>

      <section className={styles.section} aria-labelledby="jobs-table-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="jobs-table-title" className={styles.sectionTitle}>
              Rotinas
            </h2>
            <p className={styles.sectionDescription}>
              Acompanhe o estado de cada rotina e use as ações disponíveis para
              editar, pausar, executar ou interromper processamentos.
            </p>
          </div>
          <Text size={200}>Última atualização: {lastUpdated}</Text>
        </div>

        <div
          className={styles.filters}
          role="group"
          aria-label="Filtros de rotinas"
        >
          <Field label="Buscar">
            <Input
              value={search}
              contentBefore={<SearchRegular />}
              placeholder="Nome, grupo ou descrição"
              onChange={(_, data) => {
                setSearch(data.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Grupo">
            <Select
              value={groupFilter}
              onChange={(event) => {
                setGroupFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value={allGroups}>{allGroups}</option>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado">
            <Select
              value={stateFilter}
              onChange={(event) => {
                setStateFilter(event.target.value as StateFilter);
                setPage(1);
              }}
            >
              <option value={allStates}>{allStates}</option>
              <option value="NORMAL">Agendados</option>
              <option value="PAUSED">Pausados</option>
              <option value="BLOCKED">Bloqueados</option>
              <option value="ERROR">Com erro</option>
              <option value="COMPLETE">Concluídos</option>
              <option value="NONE">Sob demanda</option>
              <option value="RUNNING">Em execução</option>
            </Select>
          </Field>
          <Field label="Tipo de agendamento">
            <Select
              value={triggerTypeFilter}
              onChange={(event) => {
                setTriggerTypeFilter(event.target.value as TriggerTypeFilter);
                setPage(1);
              }}
            >
              <option value={allTriggerTypes}>{allTriggerTypes}</option>
              {triggerTypes.map((type) => (
                <option key={type} value={type}>
                  {triggerTypeLabels[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            appearance="secondary"
            icon={<DismissRegular />}
            disabled={!filtersAreActive}
            onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>

        <div
          className={styles.bulkActions}
          role="group"
          aria-label="Ações para as rotinas selecionadas"
        >
          <div className={styles.bulkSummary} aria-live="polite">
            <Text weight="semibold">
              {selectedVisibleJobs.length === 1
                ? "1 rotina selecionada"
                : `${selectedVisibleJobs.length} rotinas selecionadas`}
            </Text>
            <Text size={200} className={styles.secondary}>
              {selectedVisibleJobs.length > 0
                ? "Os comandos serão aplicados às rotinas selecionadas nos resultados atuais."
                : "Use as caixas da primeira coluna para aplicar comandos em massa."}
            </Text>
          </div>
          <div className={styles.bulkButtons}>
            <Button
              appearance="secondary"
              icon={<PauseRegular />}
              disabled={pausableSelectedCount === 0}
              onClick={handlePauseSelected}
            >
              Pausar disparos
            </Button>
            <Button
              appearance="secondary"
              icon={<PlayRegular />}
              disabled={executableSelectedCount === 0}
              onClick={handleTriggerSelected}
            >
              Disparar agora
            </Button>
            <Button
              appearance="secondary"
              icon={<StopRegular />}
              disabled={interruptibleSelectedCount === 0}
              onClick={handleInterruptSelected}
            >
              Interromper execuções
            </Button>
            <Button
              appearance="subtle"
              disabled={selectedVisibleJobs.length === 0}
              onClick={() => setSelectedJobIds(new Set())}
            >
              Limpar seleção
            </Button>
          </div>
        </div>

        <div className={styles.tablePanel}>
          {visibleJobs.length > 0 ? (
            <Table
              id="scheduled-jobs-table"
              className={styles.table}
              size="small"
              aria-label="Rotinas agendadas"
            >
              <TableHeader>
                <TableRow>
                  <TableSelectionCell
                    checked={
                      allPageJobsAreSelected
                        ? true
                        : somePageJobsAreSelected
                          ? "mixed"
                          : false
                    }
                    aria-checked={
                      allPageJobsAreSelected
                        ? true
                        : somePageJobsAreSelected
                          ? "mixed"
                          : false
                    }
                    role="checkbox"
                    onClick={toggleAllPageJobs}
                    checkboxIndicator={{
                      "aria-label": "Selecionar todas as rotinas desta página",
                    }}
                  />
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("status")}
                    onClick={() => toggleSort("status")}
                  >
                    Estado
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("name")}
                    onClick={() => toggleSort("name")}
                  >
                    Rotina
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("group")}
                    onClick={() => toggleSort("group")}
                  >
                    Grupo
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("schedule")}
                    onClick={() => toggleSort("schedule")}
                  >
                    Agendamento
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("nextExecution")}
                    onClick={() => toggleSort("nextExecution")}
                  >
                    Próxima execução
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    sortDirection={getSortDirection("lastResult")}
                    onClick={() => toggleSort("lastResult")}
                  >
                    Último resultado
                  </TableHeaderCell>
                  <TableHeaderCell className={styles.actionsHeader}>
                    Ações
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageJobs.map((job) => {
                  const trigger = getPrimaryTrigger(job);
                  const triggerState = getJobTriggerState(job);
                  const isPaused = triggerState === "PAUSED";
                  const isSelected = selectedJobIds.has(job.id);

                  return (
                    <TableRow
                      className={mergeClasses(
                        styles.tableRow,
                        isSelected && styles.tableRowSelected,
                      )}
                      key={job.id}
                    >
                      <TableSelectionCell
                        checked={isSelected}
                        onClick={() => toggleJobSelection(job.id)}
                        checkboxIndicator={{
                          "aria-label": `Selecionar ${job.name}`,
                        }}
                      />
                      <TableCell>
                        <JobOperationalStatus
                          execution={job.activeExecution}
                          triggerState={triggerState}
                        />
                      </TableCell>
                      <TableCell>
                        <Text weight="semibold">{job.name}</Text>
                      </TableCell>
                      <TableCell>
                        <Text>{job.group}</Text>
                      </TableCell>
                      <TableCell>
                        <Text>{trigger?.schedule ?? "Sem agendamento"}</Text>
                      </TableCell>
                      <TableCell>
                        <Text>{trigger?.nextFireTime ?? "Não agendada"}</Text>
                      </TableCell>
                      <TableCell>
                        <ExecutionResultBadge
                          result={job.lastExecution.result}
                        />
                      </TableCell>
                      <TableCell className={styles.actionsCell}>
                        <div className={styles.actions}>
                          <ScheduledJobDetailsDialog
                            job={job}
                            onTriggerNow={handleTriggerNow}
                          />
                          <Menu>
                            <Tooltip content="Mais ações" relationship="label">
                              <MenuTrigger disableButtonEnhancement>
                                <Button
                                  appearance="subtle"
                                  icon={<MoreHorizontalRegular />}
                                  aria-label={`Mais ações para ${job.name}`}
                                />
                              </MenuTrigger>
                            </Tooltip>
                            <MenuPopover>
                              <MenuList>
                                {trigger ? (
                                  <MenuItem
                                    icon={<EditRegular />}
                                    onClick={() => setJobToEdit(job)}
                                  >
                                    Editar agendamento
                                  </MenuItem>
                                ) : null}
                                {trigger ? (
                                  isPaused ? (
                                    <MenuItem
                                      icon={<PlayRegular />}
                                      onClick={() => handleResume(job)}
                                    >
                                      Retomar disparos
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      icon={<PauseRegular />}
                                      onClick={() => handlePause(job)}
                                    >
                                      Pausar disparos
                                    </MenuItem>
                                  )
                                ) : null}
                                <MenuItem
                                  icon={<StopRegular />}
                                  disabled={
                                    !job.activeExecution || !job.interruptable
                                  }
                                  onClick={() => handleInterrupt(job)}
                                >
                                  Solicitar interrupção
                                </MenuItem>
                                <MenuItem
                                  icon={<PlayRegular />}
                                  onClick={() => handleTriggerNow(job)}
                                >
                                  Disparar
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem
                                  icon={<CopyRegular />}
                                  onClick={() => handleDuplicate(job)}
                                >
                                  Duplicar como pausada
                                </MenuItem>
                                <MenuItem
                                  icon={<DeleteRegular />}
                                  onClick={() => setJobToDelete(job)}
                                >
                                  Excluir rotina
                                </MenuItem>
                              </MenuList>
                            </MenuPopover>
                          </Menu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className={styles.empty}>
              <Text weight="semibold">Nenhuma rotina encontrada</Text>
              <Text className={styles.secondary}>
                Altere ou limpe os filtros para consultar outras rotinas.
              </Text>
              <Button appearance="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
          <div className={styles.tableFooter}>
            <div className={styles.paginationSummary}>
              <Text
                id="scheduled-jobs-pagination-summary"
                size={200}
                weight="semibold"
                aria-live="polite"
                aria-atomic="true"
              >
                {visibleJobs.length === 0
                  ? "Nenhuma rotina para exibir"
                  : `Exibindo ${firstVisibleJob}–${lastVisibleJob} de ${visibleJobs.length} ${visibleJobs.length === 1 ? "rotina" : "rotinas"}`}
              </Text>
              <Text size={200} className={styles.secondary}>
                Horários apresentados no fuso configurado em cada agendamento
              </Text>
            </div>

            {visibleJobs.length > 0 ? (
              <div className={styles.paginationControls}>
                <div className={styles.pageSizeControl}>
                  <label
                    className={styles.pageSizeLabel}
                    htmlFor="scheduled-jobs-page-size"
                  >
                    Itens por página
                  </label>
                  <Select
                    id="scheduled-jobs-page-size"
                    className={styles.pageSizeSelect}
                    size="small"
                    value={String(pageSize)}
                    aria-controls="scheduled-jobs-table"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value) as PageSize);
                      setPage(1);
                    }}
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>

                <nav
                  className={styles.pagination}
                  aria-label="Paginação da tabela de rotinas"
                  aria-describedby="scheduled-jobs-pagination-summary"
                >
                  <Button
                    appearance="subtle"
                    icon={<ChevronLeftRegular />}
                    disabled={currentPage === 1}
                    aria-controls="scheduled-jobs-table"
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Anterior
                  </Button>

                  <div className={styles.pageNumbers}>
                    {paginationItems.map((item) =>
                      typeof item === "number" ? (
                        <Button
                          key={item}
                          className={styles.pageButton}
                          appearance={
                            item === currentPage ? "primary" : "subtle"
                          }
                          aria-current={
                            item === currentPage ? "page" : undefined
                          }
                          aria-controls="scheduled-jobs-table"
                          aria-label={
                            item === currentPage
                              ? `Página ${item}, atual`
                              : `Ir para a página ${item}`
                          }
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </Button>
                      ) : (
                        <Text
                          key={item}
                          className={styles.paginationEllipsis}
                          aria-hidden="true"
                        >
                          …
                        </Text>
                      ),
                    )}
                  </div>

                  <Button
                    appearance="subtle"
                    icon={<ChevronRightRegular />}
                    iconPosition="after"
                    disabled={currentPage === totalPages}
                    aria-controls="scheduled-jobs-table"
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Próxima
                  </Button>
                </nav>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <ScheduleEditorDialog
        key={jobToEdit?.id ?? "no-job-to-edit"}
        job={jobToEdit}
        onClose={() => setJobToEdit(undefined)}
        onSave={handleSaveSchedule}
      />
      <DeleteScheduledJobDialog
        job={jobToDelete}
        onClose={() => setJobToDelete(undefined)}
        onDelete={handleDelete}
      />
    </div>
  );
}
