import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
  Switch,
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
  ChevronLeftRegular,
  ChevronRightRegular,
  CopyRegular,
  FilterDismissRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";

import {
  getSchedulerServiceError,
  searchJobExecutionLogs,
  type ExecutionLogDirection,
  type ExecutionLogEntry,
  type ExecutionLogExecution,
  type ExecutionLogPage,
  type ExecutionLogSort,
} from "./scheduler-service-client";

type ScheduledJobLogsPanelProps = {
  group: string;
  name: string;
  isRunning: boolean;
};

type LogLevelFilter = "ALL" | ExecutionLogEntry["level"];
type SortOption = "newest" | "oldest" | "severity" | "source" | "execution";

const sortOptions: Record<
  SortOption,
  { sort: ExecutionLogSort; direction: ExecutionLogDirection }
> = {
  newest: { sort: "loggedAt", direction: "desc" },
  oldest: { sort: "loggedAt", direction: "asc" },
  severity: { sort: "level", direction: "desc" },
  source: { sort: "source", direction: "asc" },
  execution: { sort: "execution", direction: "desc" },
};

const executionResultLabels: Record<ExecutionLogExecution["result"], string> = {
  RUNNING: "Executando",
  SUCCESS: "Sucesso",
  FAILED: "Falha",
  RECOVERED: "Recuperada",
  INTERRUPTION_REQUESTED: "Interrupção solicitada",
};

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalM,
  },
  toolbarGroup: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalM,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "1fr",
    },
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalM,
  },
  summaryValue: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 2fr) repeat(3, minmax(170px, 1fr)) auto",
    alignItems: "end",
    gap: tokens.spacingHorizontalM,
    "@media (max-width: 1100px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 620px)": {
      gridTemplateColumns: "1fr",
    },
  },
  filterAction: {
    alignSelf: "end",
  },
  tableRegion: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  table: {
    minWidth: "880px",
  },
  timeColumn: {
    width: "170px",
  },
  levelColumn: {
    width: "90px",
  },
  executionColumn: {
    width: "160px",
  },
  sourceColumn: {
    width: "170px",
  },
  messageCell: {
    minWidth: "280px",
  },
  messageHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
  },
  message: {
    overflowWrap: "anywhere",
  },
  details: {
    marginTop: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
    "& summary": {
      cursor: "pointer",
      width: "fit-content",
    },
  },
  detailsBody: {
    boxSizing: "border-box",
    maxWidth: "100%",
    maxHeight: "240px",
    overflow: "auto",
    marginTop: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  emptyState: {
    display: "flex",
    minHeight: "190px",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalXXL,
    textAlign: "center",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalM,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  pageSizeField: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  pageSizeSelect: {
    minWidth: "76px",
  },
  loadingLine: {
    display: "flex",
    justifyContent: "center",
    padding: tokens.spacingVerticalS,
  },
});

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function shortExecutionId(value: string) {
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}…${value.slice(-7)}`;
}

function LogLevelBadge({ level }: { level: ExecutionLogEntry["level"] }) {
  if (level === "ERROR") return <Badge color="danger">Erro</Badge>;
  if (level === "WARN") return <Badge color="warning">Aviso</Badge>;
  return <Badge color="informative">Informação</Badge>;
}

export function ScheduledJobLogsPanel({
  group,
  name,
  isRunning,
}: ScheduledJobLogsPanelProps) {
  const styles = useStyles();
  const [data, setData] = useState<ExecutionLogPage>();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [level, setLevel] = useState<LogLevelFilter>("ALL");
  const [execution, setExecution] = useState("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(isRunning);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const [copyNotice, setCopyNotice] = useState<{
    intent: "success" | "error";
    message: string;
  }>();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(
      () => setRefreshVersion((current) => current + 1),
      10_000,
    );
    return () => window.clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    if (!copyNotice) return;
    const timeout = window.setTimeout(() => setCopyNotice(undefined), 4_000);
    return () => window.clearTimeout(timeout);
  }, [copyNotice]);

  useEffect(() => {
    const controller = new AbortController();
    const ordering = sortOptions[sortOption];
    setIsLoading(true);
    setError(undefined);

    void searchJobExecutionLogs(
      group,
      name,
      {
        page,
        pageSize,
        sort: ordering.sort,
        direction: ordering.direction,
        level,
        fireInstanceId: execution === "ALL" ? "" : execution,
        query,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLastUpdatedAt(new Date());
        if (result.page !== page) setPage(result.page);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          getSchedulerServiceError(
            reason,
            "Não foi possível carregar os logs desta rotina.",
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [
    execution,
    group,
    level,
    name,
    page,
    pageSize,
    query,
    refreshVersion,
    sortOption,
  ]);

  const hasFilters =
    execution !== "ALL" || level !== "ALL" || searchInput.trim() !== "";
  const resultRange = useMemo(() => {
    if (!data || data.totalItems === 0) return "Nenhum registro";
    const first = data.page * data.pageSize + 1;
    const last = Math.min(first + data.items.length - 1, data.totalItems);
    return `Exibindo ${first}–${last} de ${data.totalItems}`;
  }, [data]);

  function clearFilters() {
    setSearchInput("");
    setQuery("");
    setLevel("ALL");
    setExecution("ALL");
    setPage(0);
  }

  async function copyLog(entry: ExecutionLogEntry) {
    const content = [
      `[${entry.loggedAt}] ${entry.level} ${entry.source}`,
      `Execução: ${entry.fireInstanceId}`,
      entry.message,
      entry.details ? `\nDetalhes:\n${entry.details}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(content);
      setCopyNotice({ intent: "success", message: "Evento copiado." });
    } catch {
      setCopyNotice({
        intent: "error",
        message: "Não foi possível copiar o evento.",
      });
    }
  }

  return (
    <section className={styles.root} aria-label="Logs de execução" aria-busy={isLoading}>
      <div className={styles.toolbar}>
        <div>
          <Text size={500} weight="semibold" block>
            Logs de execução
          </Text>
          <Text className={styles.muted}>
            Eventos técnicos e operacionais registrados durante cada execução.
          </Text>
        </div>
        <div className={styles.toolbarGroup}>
          {lastUpdatedAt ? (
            <Text className={styles.muted} size={200} role="status">
              Atualizado às {lastUpdatedAt.toLocaleTimeString("pt-BR")}
            </Text>
          ) : null}
          <Switch
            checked={autoRefresh}
            onChange={(_, detail) => setAutoRefresh(detail.checked)}
            label="Atualizar a cada 10 s"
          />
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            disabled={isLoading}
            onClick={() => setRefreshVersion((current) => current + 1)}
          >
            Atualizar
          </Button>
        </div>
      </div>

      <div className={styles.summaryGrid} aria-label="Resumo dos logs">
        <Card className={styles.summaryCard}>
          <Text className={styles.muted}>Total no filtro atual</Text>
          <Text className={styles.summaryValue}>{data?.totalItems ?? 0}</Text>
        </Card>
        <Card className={styles.summaryCard}>
          <Badge color="danger">Erros</Badge>
          <Text className={styles.summaryValue}>{data?.errorCount ?? 0}</Text>
        </Card>
        <Card className={styles.summaryCard}>
          <Badge color="warning">Avisos</Badge>
          <Text className={styles.summaryValue}>{data?.warningCount ?? 0}</Text>
        </Card>
        <Card className={styles.summaryCard}>
          <Badge color="informative">Informações</Badge>
          <Text className={styles.summaryValue}>{data?.infoCount ?? 0}</Text>
        </Card>
      </div>

      <div className={styles.filters}>
        <Field label="Buscar nos logs">
          <Input
            value={searchInput}
            onChange={(_, detail) => setSearchInput(detail.value)}
            contentBefore={<SearchRegular />}
            placeholder="Mensagem, origem, detalhes ou execução"
          />
        </Field>
        <Field label="Execução">
          <Select
            value={execution}
            onChange={(event) => {
              setExecution(event.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">Todas as execuções</option>
            {data?.executions.map((entry) => (
              <option key={entry.fireInstanceId} value={entry.fireInstanceId}>
                {formatDateTime(entry.actualFireTime)} · {executionResultLabels[entry.result]} ·{" "}
                {entry.logCount} {entry.logCount === 1 ? "log" : "logs"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nível">
          <Select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value as LogLevelFilter);
              setPage(0);
            }}
          >
            <option value="ALL">Todos os níveis</option>
            <option value="ERROR">Erros</option>
            <option value="WARN">Avisos</option>
            <option value="INFO">Informações</option>
          </Select>
        </Field>
        <Field label="Ordenar por">
          <Select
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as SortOption);
              setPage(0);
            }}
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="severity">Severidade</option>
            <option value="source">Origem</option>
            <option value="execution">Execução mais recente</option>
          </Select>
        </Field>
        <Button
          className={styles.filterAction}
          appearance="subtle"
          icon={<FilterDismissRegular />}
          disabled={!hasFilters}
          onClick={clearFilters}
        >
          Limpar filtros
        </Button>
      </div>

      {copyNotice ? (
        <MessageBar intent={copyNotice.intent}>
          <MessageBarBody>{copyNotice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>
            {error}{" "}
            <Button
              appearance="transparent"
              onClick={() => setRefreshVersion((current) => current + 1)}
            >
              Tentar novamente
            </Button>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {isLoading && !data ? (
        <div className={styles.emptyState}>
          <Spinner label="Carregando logs" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400} weight="semibold">
            {hasFilters ? "Nenhum log corresponde aos filtros" : "Nenhum log registrado"}
          </Text>
          <Text className={styles.muted}>
            {hasFilters
              ? "Ajuste os critérios de busca para ampliar os resultados."
              : "Os eventos aparecerão aqui após a execução da rotina."}
          </Text>
          {hasFilters ? (
            <Button icon={<FilterDismissRegular />} onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      ) : data ? (
        <>
          {isLoading ? (
            <div className={styles.loadingLine}>
              <Spinner size="tiny" label="Atualizando resultados" />
            </div>
          ) : null}
          <div className={styles.tableRegion}>
            <Table className={styles.table} size="small" aria-label="Eventos de log">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={styles.timeColumn}>Horário</TableHeaderCell>
                  <TableHeaderCell className={styles.levelColumn}>Nível</TableHeaderCell>
                  <TableHeaderCell className={styles.executionColumn}>Execução</TableHeaderCell>
                  <TableHeaderCell className={styles.sourceColumn}>Origem</TableHeaderCell>
                  <TableHeaderCell>Evento</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.loggedAt)}</TableCell>
                    <TableCell>
                      <LogLevelBadge level={entry.level} />
                    </TableCell>
                    <TableCell title={entry.fireInstanceId}>
                      {shortExecutionId(entry.fireInstanceId)}
                    </TableCell>
                    <TableCell>{entry.source}</TableCell>
                    <TableCell className={styles.messageCell}>
                      <div className={styles.messageHeader}>
                        <Text className={styles.message}>{entry.message}</Text>
                        <Tooltip content="Copiar evento" relationship="description">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<CopyRegular />}
                            aria-label="Copiar evento de log"
                            onClick={() => void copyLog(entry)}
                          />
                        </Tooltip>
                      </div>
                      {entry.details ? (
                        <details className={styles.details}>
                          <summary>Ver detalhes técnicos</summary>
                          <pre className={styles.detailsBody}>{entry.details}</pre>
                        </details>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      <div className={styles.pagination}>
        <Text role="status">{resultRange}</Text>
        <div className={styles.paginationControls}>
          <label className={styles.pageSizeField}>
            <Text>Itens por página</Text>
            <Select
              className={styles.pageSizeSelect}
              value={String(pageSize)}
              aria-label="Itens por página"
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </label>
          <Button
            appearance="secondary"
            icon={<ChevronLeftRegular />}
            disabled={isLoading || page <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Anterior
          </Button>
          <Text>
            Página {(data?.page ?? 0) + 1} de {Math.max(data?.totalPages ?? 0, 1)}
          </Text>
          <Button
            appearance="secondary"
            iconPosition="after"
            icon={<ChevronRightRegular />}
            disabled={isLoading || !data || data.page + 1 >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  );
}
