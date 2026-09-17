import {
  Button,
  Field,
  Input,
  makeStyles,
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
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  ArrowResetRegular,
  CopyRegular,
  DeleteRegular,
  DismissRegular,
  EditRegular,
  MoreHorizontalRegular,
  PauseRegular,
  PlayRegular,
  SearchRegular,
  StopRegular,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import {
  CreateScheduledJobDialog,
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
  ExecutionStatus,
  TriggerStateBadge,
} from "./scheduled-job-status";

const allGroups = "Todos os grupos" as const;
const allStates = "Todos os estados" as const;
const allTriggerTypes = "Todos os tipos" as const;

type StateFilter = TriggerState | typeof allStates | "RUNNING";
type TriggerTypeFilter = TriggerType | typeof allTriggerTypes;

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
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    marginTop: tokens.spacingVerticalXS,
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
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  summaryValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  summaryLabel: {
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
  tablePanel: {
    minWidth: 0,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    width: "100%",
    minWidth: "1320px",
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
  jobCell: {
    display: "grid",
    gap: "2px",
    minWidth: "220px",
    maxWidth: "280px",
  },
  scheduleCell: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    minWidth: "240px",
    maxWidth: "300px",
  },
  timeCell: {
    display: "grid",
    gap: "2px",
    minWidth: "190px",
  },
  resultCell: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    minWidth: "210px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: tokens.spacingHorizontalXS,
    minWidth: "228px",
    whiteSpace: "nowrap",
  },
  actionsHeader: {
    position: "sticky",
    zIndex: 2,
    right: 0,
    width: "248px",
    minWidth: "248px",
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: `-${tokens.strokeWidthThin} 0 0 ${tokens.colorNeutralStroke2}`,
  },
  actionsCell: {
    position: "sticky",
    zIndex: 1,
    right: 0,
    width: "248px",
    minWidth: "248px",
    backgroundColor: "inherit",
    boxShadow: `-${tokens.strokeWidthThin} 0 0 ${tokens.colorNeutralStroke2}`,
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
  monospace: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 560px)": {
      alignItems: "start",
      flexDirection: "column",
    },
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

function SummaryCard({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <div className={styles.summaryCard}>
      <Text className={styles.summaryValue}>{value}</Text>
      <Text className={styles.summaryLabel}>{label}</Text>
    </div>
  );
}

export function ScheduledJobsPage() {
  const styles = useStyles();
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

  const groups = useMemo(
    () => [...new Set(jobs.map((job) => job.group))].sort(),
    [jobs],
  );

  const visibleJobs = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return jobs.filter((job) => {
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
  }, [groupFilter, jobs, search, stateFilter, triggerTypeFilter]);

  const runningCount = jobs.filter((job) => job.activeExecution).length;
  const pausedCount = jobs.filter(
    (job) => getJobTriggerState(job) === "PAUSED",
  ).length;
  const errorCount = jobs.filter(
    (job) => getJobTriggerState(job) === "ERROR",
  ).length;
  const withoutTriggerCount = jobs.filter(
    (job) => getJobTriggerState(job) === "NONE",
  ).length;
  const filtersAreActive =
    search.trim().length > 0 ||
    groupFilter !== allGroups ||
    stateFilter !== allStates ||
    triggerTypeFilter !== allTriggerTypes;

  function updateJob(jobId: string, updater: (job: ScheduledJob) => ScheduledJob) {
    setJobs((current) =>
      current.map((job) => (job.id === jobId ? updater(job) : job)),
    );
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
      message: `Disparo imediato solicitado para “${job.name}”. A API chamará triggerJob e acompanhará o fireInstanceId criado.`,
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
      message: `Os triggers de “${job.name}” foram retomados. A próxima execução será recalculada pelo Quartz.`,
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
      message: `Interrupção solicitada para “${job.name}”. A API deverá encaminhar o comando à instância ${job.activeExecution.schedulerInstance}; o término depende da cooperação do handler.`,
    });
  }

  function handleResetError(job: ScheduledJob) {
    updateJob(job.id, (current) => ({
      ...current,
      triggers: current.triggers.map((trigger) => ({
        ...trigger,
        state: trigger.state === "ERROR" ? "NORMAL" : trigger.state,
        nextFireTime:
          trigger.state === "ERROR"
            ? "Recalculado pela API"
            : trigger.nextFireTime,
      })),
    }));
    setNotice({
      intent: "success",
      message: `O trigger de “${job.name}” saiu do estado de erro. A API deverá confirmar o novo estado retornado pelo Quartz.`,
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

  function handleCreate(job: ScheduledJob) {
    setJobs((current) => [...current, job]);
    setNotice({
      intent: "success",
      message: `Rotina “${job.name}” criada no mockup. Na integração, a API persistirá o JobDetail e o Trigger na mesma operação.`,
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
      message: `Agendamento de “${job.name}” atualizado. Na API, rescheduleJob substituirá somente o trigger selecionado.`,
    });
  }

  function handleDelete(job: ScheduledJob) {
    setJobs((current) => current.filter((item) => item.id !== job.id));
    setJobToDelete(undefined);
    setNotice({
      intent: "success",
      message: `Rotina “${job.name}” removida do mockup com seus triggers associados.`,
    });
  }

  function clearFilters() {
    setSearch("");
    setGroupFilter(allGroups);
    setStateFilter(allStates);
    setTriggerTypeFilter(allTriggerTypes);
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
        "Dados atualizados. Na integração, a API recomporá jobs, triggers e execuções ativas de todas as instâncias do cluster.",
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <Text className={styles.eyebrow}>Administração · Agendamentos</Text>
          <h1 className={styles.title}>Rotinas agendadas</h1>
          <p className={styles.lead}>
            Administre JobDetails e seus triggers, acompanhe execuções ativas e
            envie comandos operacionais ao cluster Quartz.
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
          <CreateScheduledJobDialog jobs={jobs} onCreate={handleCreate} />
        </div>
      </header>

      <MessageBar intent="info">
        <MessageBarBody>
          Mockup interativo: os comandos alteram somente os dados desta página.
          A API deverá aplicar autorização, auditoria, controle de concorrência e
          confirmação do estado retornado pelo Quartz.
        </MessageBarBody>
      </MessageBar>

      {notice ? (
        <MessageBar intent={notice.intent} role="status">
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <section className={styles.summaryGrid} aria-label="Resumo das rotinas">
        <SummaryCard value={jobs.length} label="JobDetails cadastrados" />
        <SummaryCard value={runningCount} label="Execuções ativas" />
        <SummaryCard value={pausedCount} label="Triggers pausados" />
        <SummaryCard value={errorCount} label="Triggers com erro" />
        <SummaryCard value={withoutTriggerCount} label="Jobs sem trigger" />
      </section>

      <section className={styles.section} aria-labelledby="jobs-table-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="jobs-table-title" className={styles.sectionTitle}>
              Jobs e triggers
            </h2>
            <p className={styles.sectionDescription}>
              O estado do agendamento pertence ao trigger. A execução ativa é
              exibida separadamente para evitar confundir “pausado” com
              “interrompido”.
            </p>
          </div>
          <Text size={200}>Última atualização: {lastUpdated}</Text>
        </div>

        <div className={styles.filters} role="group" aria-label="Filtros de jobs">
          <Field label="Buscar">
            <Input
              value={search}
              contentBefore={<SearchRegular />}
              placeholder="Nome, grupo, descrição, handler ou trigger"
              onChange={(_, data) => setSearch(data.value)}
            />
          </Field>
          <Field label="Grupo">
            <Select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
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
              onChange={(event) =>
                setStateFilter(event.target.value as StateFilter)
              }
            >
              <option value={allStates}>{allStates}</option>
              <option value="NORMAL">Agendados</option>
              <option value="PAUSED">Pausados</option>
              <option value="BLOCKED">Bloqueados</option>
              <option value="ERROR">Com erro</option>
              <option value="COMPLETE">Concluídos</option>
              <option value="NONE">Sem trigger</option>
              <option value="RUNNING">Em execução</option>
            </Select>
          </Field>
          <Field label="Tipo de trigger">
            <Select
              value={triggerTypeFilter}
              onChange={(event) =>
                setTriggerTypeFilter(event.target.value as TriggerTypeFilter)
              }
            >
              <option value={allTriggerTypes}>{allTriggerTypes}</option>
              {triggerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
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

        <div className={styles.tablePanel}>
          {visibleJobs.length > 0 ? (
            <Table
              className={styles.table}
              size="small"
              aria-label="Rotinas agendadas no Quartz"
            >
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Rotina</TableHeaderCell>
                  <TableHeaderCell>Agendamento</TableHeaderCell>
                  <TableHeaderCell>Próxima execução</TableHeaderCell>
                  <TableHeaderCell>Execução atual</TableHeaderCell>
                  <TableHeaderCell>Último resultado</TableHeaderCell>
                  <TableHeaderCell className={styles.actionsHeader}>
                    Ações
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJobs.map((job) => {
                  const trigger = getPrimaryTrigger(job);
                  const triggerState = getJobTriggerState(job);
                  const isPaused = triggerState === "PAUSED";
                  const hasError = triggerState === "ERROR";

                  return (
                    <TableRow className={styles.tableRow} key={job.id}>
                      <TableCell>
                        <div className={styles.jobCell}>
                          <Text weight="semibold">{job.name}</Text>
                          <Text className={styles.monospace}>{job.group}</Text>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={styles.scheduleCell}>
                          <TriggerStateBadge state={triggerState} />
                          {trigger ? (
                            <>
                              <Text weight="semibold">{trigger.schedule}</Text>
                              <Text size={200} className={styles.secondary}>
                                {trigger.type}
                              </Text>
                            </>
                          ) : (
                            <Text size={200} className={styles.secondary}>
                              JobDetail durável para uso sob demanda
                            </Text>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={styles.timeCell}>
                          <Text weight="semibold">
                            {trigger?.nextFireTime ?? "Não agendada"}
                          </Text>
                          <Text size={200} className={styles.monospace}>
                            {trigger?.timeZone ?? "—"}
                          </Text>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ExecutionStatus execution={job.activeExecution} />
                      </TableCell>
                      <TableCell>
                        <div className={styles.resultCell}>
                          <ExecutionResultBadge
                            result={job.lastExecution.result}
                          />
                          <Text size={200} className={styles.secondary}>
                            {job.lastExecution.finishedAt} ·{" "}
                            {job.lastExecution.duration}
                          </Text>
                        </div>
                      </TableCell>
                      <TableCell className={styles.actionsCell}>
                        <div className={styles.actions}>
                          <ScheduledJobDetailsDialog
                            job={job}
                            onTriggerNow={handleTriggerNow}
                          />
                          <Button
                            appearance="primary"
                            icon={<PlayRegular />}
                            onClick={() => handleTriggerNow(job)}
                          >
                            Disparar
                          </Button>
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
                                {trigger ? (
                                  <MenuItem
                                    icon={<EditRegular />}
                                    onClick={() => setJobToEdit(job)}
                                  >
                                    Editar agendamento
                                  </MenuItem>
                                ) : null}
                                {hasError ? (
                                  <MenuItem
                                    icon={<ArrowResetRegular />}
                                    onClick={() => handleResetError(job)}
                                  >
                                    Retirar trigger do erro
                                  </MenuItem>
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
                Altere ou limpe os filtros para consultar outros JobDetails.
              </Text>
              <Button appearance="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
          <div className={styles.tableFooter}>
            <Text size={200}>
              Exibindo {visibleJobs.length} de {jobs.length} rotinas
            </Text>
            <Text size={200} className={styles.secondary}>
              Horários apresentados no fuso configurado em cada trigger
            </Text>
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
