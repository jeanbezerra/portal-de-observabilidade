import {
  Badge,
  makeStyles,
  Spinner,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  HistoryRegular,
} from "@fluentui/react-icons";

import type {
  ActiveExecution,
  ExecutionResult,
  TriggerState,
} from "./scheduled-jobs-model";

const useStyles = makeStyles({
  execution: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    minWidth: "180px",
  },
  running: {
    justifyContent: "start",
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
});

export function TriggerStateBadge({ state }: { state: TriggerState }) {
  const presentation: Record<
    TriggerState,
    {
      label: string;
      color:
        | "success"
        | "warning"
        | "danger"
        | "informative"
        | "subtle";
    }
  > = {
    NORMAL: { label: "Agendado", color: "success" },
    PAUSED: { label: "Pausado", color: "warning" },
    BLOCKED: { label: "Bloqueado", color: "informative" },
    ERROR: { label: "Erro no trigger", color: "danger" },
    COMPLETE: { label: "Concluído", color: "subtle" },
    NONE: { label: "Sem trigger", color: "subtle" },
  };

  const { label, color } = presentation[state];

  return (
    <Badge appearance="tint" color={color}>
      {label}
    </Badge>
  );
}

export function ExecutionStatus({
  execution,
}: {
  execution?: ActiveExecution;
}) {
  const styles = useStyles();

  if (!execution) {
    return (
      <div className={styles.execution}>
        <Text weight="semibold">Aguardando</Text>
        <Text size={200} className={styles.secondary}>
          Nenhuma execução ativa
        </Text>
      </div>
    );
  }

  if (execution.state === "INTERRUPTION_REQUESTED") {
    return (
      <div className={styles.execution}>
        <Badge appearance="tint" color="warning">
          Interrupção solicitada
        </Badge>
        <Text size={200} className={styles.secondary}>
          Aguardando confirmação do handler
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.execution}>
      <Spinner
        className={styles.running}
        size="tiny"
        labelPosition="after"
        label="Executando"
      />
      <Text size={200} className={styles.secondary}>
        {execution.elapsed} · {execution.schedulerInstance}
      </Text>
    </div>
  );
}

export function ExecutionResultBadge({
  result,
}: {
  result: ExecutionResult;
}) {
  if (result === "SUCCESS") {
    return (
      <Badge
        appearance="tint"
        color="success"
        icon={<CheckmarkCircleRegular />}
      >
        Sucesso
      </Badge>
    );
  }

  if (result === "FAILED") {
    return (
      <Badge appearance="tint" color="danger" icon={<ErrorCircleRegular />}>
        Falha
      </Badge>
    );
  }

  if (result === "RECOVERED") {
    return (
      <Badge appearance="tint" color="informative" icon={<HistoryRegular />}>
        Recuperada
      </Badge>
    );
  }

  return (
    <Badge appearance="tint" color="subtle">
      Sem execução
    </Badge>
  );
}
