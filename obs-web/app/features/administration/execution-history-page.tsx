import {
  Badge,
  Button,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Spinner,
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
  ErrorCircleRegular,
  HistoryRegular,
  PlayCircleRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useState } from "react";

import { PageBreadcrumb } from "../../components/page-breadcrumb";
import {
  getSchedulerApiError,
  listExecutionHistory,
  type ExecutionHistoryEntry,
} from "./scheduler-api-client";

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    width: "100%",
    maxWidth: "1320px",
    minWidth: 0,
    margin: "0 auto",
  },
  header: { display: "grid", gap: tokens.spacingVerticalS },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
  },
  description: {
    maxWidth: "760px",
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  toolbar: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    alignItems: "end",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  search: { width: "min(100%, 420px)" },
  tableViewport: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  jobKey: {
    fontFamily: tokens.fontFamilyMonospace,
    overflowWrap: "anywhere",
  },
  message: { minWidth: "280px", maxWidth: "420px" },
  empty: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground2,
    textAlign: "center",
  },
});

function formatInstant(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatDuration(milliseconds: number | null) {
  if (milliseconds === null) return "Em andamento";
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}

function ResultBadge({ result }: { result: ExecutionHistoryEntry["result"] }) {
  if (result === "SUCCESS") {
    return <Badge color="success" appearance="tint">Sucesso</Badge>;
  }
  if (result === "FAILED") {
    return <Badge color="danger" appearance="tint" icon={<ErrorCircleRegular />}>Falha</Badge>;
  }
  if (result === "RECOVERED") {
    return <Badge color="informative" appearance="tint" icon={<HistoryRegular />}>Recuperada</Badge>;
  }
  if (result === "INTERRUPTION_REQUESTED") {
    return <Badge color="warning" appearance="tint">Interrupção solicitada</Badge>;
  }
  return <Badge color="brand" appearance="tint" icon={<PlayCircleRegular />}>Em execução</Badge>;
}

export function ExecutionHistoryPage() {
  const styles = useStyles();
  const [entries, setEntries] = useState<ExecutionHistoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setIsLoading(true);
    setError("");
    try {
      setEntries(await listExecutionHistory());
    } catch (loadError) {
      setError(
        getSchedulerApiError(
          loadError,
          "Não foi possível carregar o histórico de execuções.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visibleEntries = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return entries;
    return entries.filter((entry) =>
      [
        entry.jobGroup,
        entry.jobName,
        entry.triggerGroup ?? "",
        entry.triggerName ?? "",
        entry.schedulerInstance,
        entry.message,
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }, [entries, search]);

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: "Histórico de execuções" },
        ]}
      />

      <header className={styles.header}>
        <h1 className={styles.title}>Histórico de execuções</h1>
        <p className={styles.description}>
          Consulte resultado, duração, trigger e instância responsável pelas
          execuções registradas pelo scheduler.
        </p>
      </header>

      {error ? (
        <MessageBar intent="error" role="alert">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      <div className={styles.toolbar}>
        <Field className={styles.search} label="Buscar no histórico">
          <Input
            value={search}
            contentBefore={<SearchRegular />}
            placeholder="Rotina, trigger, instância ou mensagem"
            onChange={(_, data) => setSearch(data.value)}
          />
        </Field>
        <Button
          appearance="secondary"
          icon={<ArrowClockwiseRegular />}
          onClick={() => void refresh()}
          disabled={isLoading}
        >
          Atualizar histórico
        </Button>
      </div>

      {isLoading ? (
        <Spinner label="Carregando histórico de execuções" />
      ) : visibleEntries.length === 0 ? (
        <div className={styles.empty} role="status">
          <HistoryRegular fontSize={32} aria-hidden="true" />
          <Text weight="semibold">Nenhuma execução encontrada</Text>
          <Text size={200}>
            Dispare uma rotina ou ajuste a busca para consultar outros registros.
          </Text>
        </div>
      ) : (
        <div className={styles.tableViewport}>
          <Table aria-label="Histórico de execuções do scheduler">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Resultado</TableHeaderCell>
                <TableHeaderCell>Rotina</TableHeaderCell>
                <TableHeaderCell>Trigger</TableHeaderCell>
                <TableHeaderCell>Início</TableHeaderCell>
                <TableHeaderCell>Duração</TableHeaderCell>
                <TableHeaderCell>Instância</TableHeaderCell>
                <TableHeaderCell>Mensagem</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell><ResultBadge result={entry.result} /></TableCell>
                  <TableCell className={styles.jobKey}>{entry.jobGroup}.{entry.jobName}</TableCell>
                  <TableCell className={styles.jobKey}>
                    {entry.triggerName
                      ? `${entry.triggerGroup}.${entry.triggerName}`
                      : "Disparo manual"}
                  </TableCell>
                  <TableCell>{formatInstant(entry.actualFireTime)}</TableCell>
                  <TableCell>{formatDuration(entry.durationMillis)}</TableCell>
                  <TableCell>{entry.schedulerInstance}</TableCell>
                  <TableCell className={styles.message}>{entry.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
