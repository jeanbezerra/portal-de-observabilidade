import {
  Badge,
  makeStyles,
  mergeClasses,
  Spinner,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowSync20Regular,
  CheckmarkCircle20Regular,
  CheckmarkCircleRegular,
  Clock20Regular,
  ErrorCircleRegular,
  ErrorCircle20Regular,
  HistoryRegular,
  LockClosed20Regular,
  PauseCircle20Regular,
  PlayCircle20Regular,
  Stop20Regular,
} from "@fluentui/react-icons";

import type {
  ActiveExecution,
  ExecutionResult,
  TriggerState,
} from "./scheduled-jobs-model";

type JobOperationalStatus =
  | "WAITING"
  | "RUNNING"
  | "INTERRUPTION_REQUESTED"
  | "ERROR"
  | "PAUSED"
  | "BLOCKED"
  | "COMPLETE"
  | "ON_DEMAND";

const jobOperationalStatusPresentation = {
  WAITING: {
    label: "Aguardando",
    icon: Clock20Regular,
    tone: "neutral",
    motion: "pulse",
  },
  RUNNING: {
    label: "Executando",
    icon: ArrowSync20Regular,
    tone: "brand",
    motion: "spin",
  },
  INTERRUPTION_REQUESTED: {
    label: "Interrupção solicitada",
    icon: Stop20Regular,
    tone: "warning",
    motion: "pulse",
  },
  ERROR: {
    label: "Com erro",
    icon: ErrorCircle20Regular,
    tone: "danger",
    motion: "none",
  },
  PAUSED: {
    label: "Pausado",
    icon: PauseCircle20Regular,
    tone: "warning",
    motion: "none",
  },
  BLOCKED: {
    label: "Bloqueado",
    icon: LockClosed20Regular,
    tone: "warning",
    motion: "none",
  },
  COMPLETE: {
    label: "Concluído",
    icon: CheckmarkCircle20Regular,
    tone: "success",
    motion: "none",
  },
  ON_DEMAND: {
    label: "Sob demanda",
    icon: PlayCircle20Regular,
    tone: "neutral",
    motion: "none",
  },
} as const;

function getJobOperationalStatus({
  execution,
  triggerState,
}: {
  execution?: ActiveExecution;
  triggerState: TriggerState;
}): JobOperationalStatus {
  if (execution?.state === "RUNNING") return "RUNNING";
  if (execution?.state === "INTERRUPTION_REQUESTED") {
    return "INTERRUPTION_REQUESTED";
  }
  if (triggerState === "ERROR") return "ERROR";
  if (triggerState === "PAUSED") return "PAUSED";
  if (triggerState === "BLOCKED") return "BLOCKED";
  if (triggerState === "COMPLETE") return "COMPLETE";
  if (triggerState === "NONE") return "ON_DEMAND";
  return "WAITING";
}

export function getJobOperationalStatusLabel({
  execution,
  triggerState,
}: {
  execution?: ActiveExecution;
  triggerState: TriggerState;
}) {
  const status = getJobOperationalStatus({ execution, triggerState });
  return jobOperationalStatusPresentation[status].label;
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
  operationalIcon: {
    flexShrink: 0,
  },
  brandStatus: {
    color: tokens.colorBrandForeground1,
  },
  dangerStatus: {
    color: tokens.colorStatusDangerForeground1,
  },
  warningStatus: {
    color: tokens.colorStatusWarningForeground3,
  },
  successStatus: {
    color: tokens.colorStatusSuccessForeground1,
  },
  neutralStatus: {
    color: tokens.colorNeutralForeground2,
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
  spin: {
    animationDuration: `calc(${tokens.durationUltraSlow} + ${tokens.durationUltraSlow} + ${tokens.durationUltraSlow})`,
    animationIterationCount: "infinite",
    animationTimingFunction: tokens.curveLinear,
    animationName: {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" },
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

  const status = getJobOperationalStatus({ execution, triggerState });
  const presentation = jobOperationalStatusPresentation[status];
  const StatusIcon = presentation.icon;
  const toneClass = {
    brand: styles.brandStatus,
    danger: styles.dangerStatus,
    warning: styles.warningStatus,
    success: styles.successStatus,
    neutral: styles.neutralStatus,
  }[presentation.tone];
  const motionClass = {
    pulse: styles.pulse,
    spin: styles.spin,
    none: undefined,
  }[presentation.motion];

  return (
    <div className={mergeClasses(styles.operationalStatus, toneClass)}>
      <StatusIcon
        aria-hidden="true"
        className={mergeClasses(
          styles.operationalIcon,
          motionClass,
        )}
      />
      <Text weight="semibold">{presentation.label}</Text>
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
