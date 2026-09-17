import {
  Badge,
  makeStyles,
  mergeClasses,
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

export function getJobOperationalStatusLabel({
  execution,
  triggerState,
}: {
  execution?: ActiveExecution;
  triggerState: TriggerState;
}) {
  if (execution?.state === "RUNNING") return "Executando";
  if (execution?.state === "INTERRUPTION_REQUESTED") {
    return "Interrupção solicitada";
  }
  if (triggerState === "ERROR") return "Com erro";
  if (triggerState === "PAUSED") return "Pausado";
  if (triggerState === "BLOCKED") return "Bloqueado";
  if (triggerState === "COMPLETE") return "Concluído";
  if (triggerState === "NONE") return "Sob demanda";
  return "Aguardando";
}

export function getExecutionResultLabel(result: ExecutionResult) {
  if (result === "SUCCESS") return "Sucesso";
  if (result === "FAILED") return "Falha";
  if (result === "RECOVERED") return "Recuperada";
  return "Sem execução";
}

const useStyles = makeStyles({
  operationalStatus: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    minWidth: "148px",
  },
  operationalDot: {
    width: "10px",
    height: "10px",
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
  },
  brandDot: {
    backgroundColor: tokens.colorBrandForeground1,
  },
  dangerDot: {
    backgroundColor: tokens.colorStatusDangerForeground1,
  },
  warningDot: {
    backgroundColor: tokens.colorStatusWarningForeground3,
  },
  successDot: {
    backgroundColor: tokens.colorStatusSuccessForeground1,
  },
  neutralDot: {
    backgroundColor: tokens.colorNeutralForeground3,
  },
  pulse: {
    animationDuration: `calc(${tokens.durationUltraSlow} + ${tokens.durationUltraSlow} + ${tokens.durationUltraSlow})`,
    animationIterationCount: "infinite",
    animationTimingFunction: tokens.curveEasyEase,
    animationName: {
      "0%": { opacity: 0.45, transform: "scale(0.82)" },
      "50%": { opacity: 1, transform: "scale(1.18)" },
      "100%": { opacity: 0.45, transform: "scale(0.82)" },
    },
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
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

export function JobOperationalStatus({
  execution,
  triggerState,
}: {
  execution?: ActiveExecution;
  triggerState: TriggerState;
}) {
  const styles = useStyles();

  const label = getJobOperationalStatusLabel({ execution, triggerState });
  let dotClass = styles.brandDot;
  let animated = true;

  if (execution?.state === "INTERRUPTION_REQUESTED") {
    dotClass = styles.warningDot;
  } else if (triggerState === "ERROR") {
    dotClass = styles.dangerDot;
  } else if (triggerState === "PAUSED") {
    dotClass = styles.warningDot;
    animated = false;
  } else if (triggerState === "BLOCKED") {
    dotClass = styles.warningDot;
  } else if (triggerState === "COMPLETE") {
    dotClass = styles.successDot;
    animated = false;
  } else if (triggerState === "NONE") {
    dotClass = styles.neutralDot;
    animated = false;
  }

  return (
    <div className={styles.operationalStatus}>
      <span
        aria-hidden="true"
        className={mergeClasses(
          styles.operationalDot,
          dotClass,
          animated && styles.pulse,
        )}
      />
      <Text weight="semibold">{label}</Text>
    </div>
  );
}

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
