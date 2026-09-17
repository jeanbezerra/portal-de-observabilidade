export const triggerTypes = [
  "CronTrigger",
  "SimpleTrigger",
  "CalendarIntervalTrigger",
  "DailyTimeIntervalTrigger",
] as const;

export type TriggerType = (typeof triggerTypes)[number];

export type TriggerState =
  | "NORMAL"
  | "PAUSED"
  | "BLOCKED"
  | "ERROR"
  | "COMPLETE"
  | "NONE";

export type ExecutionState = "RUNNING" | "INTERRUPTION_REQUESTED";
export type ExecutionResult = "SUCCESS" | "FAILED" | "RECOVERED" | "NONE";

export type JobDataEntry = {
  key: string;
  type: "String" | "Integer" | "Boolean" | "JSON";
  value: string;
  sensitive?: boolean;
};

export type JobTrigger = {
  key: string;
  group: string;
  type: TriggerType;
  state: TriggerState;
  schedule: string;
  expression: string;
  timeZone: string;
  calendar: string;
  nextFireTime: string;
  previousFireTime: string;
  startAt: string;
  endAt: string;
  priority: number;
  misfireInstruction: string;
};

export type ActiveExecution = {
  state: ExecutionState;
  fireInstanceId: string;
  schedulerInstance: string;
  podName: string;
  scheduledFireTime: string;
  actualFireTime: string;
  elapsed: string;
  refireCount: number;
  recovering: boolean;
};

export type ScheduledJob = {
  id: string;
  name: string;
  group: string;
  description: string;
  jobClass: string;
  durable: boolean;
  requestsRecovery: boolean;
  disallowConcurrent: boolean;
  persistJobData: boolean;
  interruptable: boolean;
  triggers: JobTrigger[];
  activeExecution?: ActiveExecution;
  lastExecution: {
    result: ExecutionResult;
    finishedAt: string;
    duration: string;
    message: string;
  };
  jobData: JobDataEntry[];
};

export const scheduledJobs: ScheduledJob[] = [
  {
    id: "financeiro.fechamento-faturamento",
    name: "fechamento-faturamento",
    group: "financeiro",
    description:
      "Consolida os lançamentos do dia e publica o fechamento para os consumidores financeiros.",
    jobClass: "br.com.porto.scheduler.jobs.BillingCloseJob",
    durable: true,
    requestsRecovery: true,
    disallowConcurrent: true,
    persistJobData: true,
    interruptable: true,
    triggers: [
      {
        key: "fechamento-diario",
        group: "financeiro",
        type: "CronTrigger",
        state: "NORMAL",
        schedule: "Todos os dias úteis às 23:00",
        expression: "0 0 23 ? * MON-FRI",
        timeZone: "America/Sao_Paulo",
        calendar: "feriados-bancarios-br",
        nextFireTime: "16 set. 2026, 23:00",
        previousFireTime: "15 set. 2026, 23:00",
        startAt: "01 jan. 2026, 00:00",
        endAt: "Sem término",
        priority: 8,
        misfireInstruction: "DO_NOTHING",
      },
    ],
    activeExecution: {
      state: "RUNNING",
      fireInstanceId: "scheduler-prod-b2c8-1758051120473",
      schedulerInstance: "scheduler-prod-b2c8",
      podName: "obs-scheduler-7f86c9b5f6-j9tpk",
      scheduledFireTime: "16 set. 2026, 20:30:00",
      actualFireTime: "16 set. 2026, 20:30:02",
      elapsed: "12 min 18 s",
      refireCount: 0,
      recovering: false,
    },
    lastExecution: {
      result: "SUCCESS",
      finishedAt: "15 set. 2026, 23:18",
      duration: "18 min 42 s",
      message: "Fechamento concluído com 184.302 lançamentos.",
    },
    jobData: [
      { key: "competencia", type: "String", value: "${data-operacao}" },
      { key: "publicarEventos", type: "Boolean", value: "true" },
      { key: "loteMaximo", type: "Integer", value: "5000" },
      { key: "apiToken", type: "String", value: "••••••••", sensitive: true },
    ],
  },
  {
    id: "plataforma.sincronizar-calendarios",
    name: "sincronizar-calendarios",
    group: "plataforma",
    description:
      "Atualiza feriados e exceções operacionais consumidos pelas demais rotinas.",
    jobClass: "br.com.porto.scheduler.jobs.CalendarSyncJob",
    durable: true,
    requestsRecovery: false,
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: false,
    triggers: [
      {
        key: "sincronizacao-diaria",
        group: "plataforma",
        type: "CalendarIntervalTrigger",
        state: "NORMAL",
        schedule: "A cada 1 dia, preservando o horário local",
        expression: "1 DAY",
        timeZone: "America/Sao_Paulo",
        calendar: "Sem calendário de exclusão",
        nextFireTime: "17 set. 2026, 02:00",
        previousFireTime: "16 set. 2026, 02:00",
        startAt: "01 jan. 2026, 02:00",
        endAt: "Sem término",
        priority: 5,
        misfireInstruction: "FIRE_ONCE_NOW",
      },
    ],
    lastExecution: {
      result: "SUCCESS",
      finishedAt: "16 set. 2026, 02:01",
      duration: "1 min 14 s",
      message: "Calendários atualizados sem divergências.",
    },
    jobData: [
      { key: "origem", type: "String", value: "calendario-corporativo" },
      { key: "atualizarTriggers", type: "Boolean", value: "true" },
    ],
  },
  {
    id: "grc.relatorio-regulatorio",
    name: "relatorio-regulatorio",
    group: "grc",
    description:
      "Gera o pacote mensal de evidências para auditoria e conformidade.",
    jobClass: "br.com.porto.scheduler.jobs.RegulatoryReportJob",
    durable: true,
    requestsRecovery: true,
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: true,
    triggers: [
      {
        key: "fechamento-mensal",
        group: "grc",
        type: "CronTrigger",
        state: "PAUSED",
        schedule: "No primeiro dia de cada mês às 06:30",
        expression: "0 30 6 1 * ?",
        timeZone: "America/Sao_Paulo",
        calendar: "feriados-nacionais-br",
        nextFireTime: "Pausado",
        previousFireTime: "01 set. 2026, 06:30",
        startAt: "01 jan. 2026, 00:00",
        endAt: "Sem término",
        priority: 7,
        misfireInstruction: "DO_NOTHING",
      },
    ],
    lastExecution: {
      result: "SUCCESS",
      finishedAt: "01 set. 2026, 06:47",
      duration: "17 min 09 s",
      message: "Relatório publicado no repositório de evidências.",
    },
    jobData: [
      { key: "formato", type: "String", value: "PDF_A" },
      { key: "reterPorDias", type: "Integer", value: "2555" },
    ],
  },
  {
    id: "observabilidade.compactar-metricas",
    name: "compactar-metricas",
    group: "observabilidade",
    description:
      "Compacta agregações antigas para reduzir o volume de armazenamento operacional.",
    jobClass: "br.com.porto.scheduler.jobs.MetricCompactionJob",
    durable: false,
    requestsRecovery: false,
    disallowConcurrent: true,
    persistJobData: false,
    interruptable: true,
    triggers: [
      {
        key: "compactacao-noturna",
        group: "observabilidade",
        type: "CronTrigger",
        state: "ERROR",
        schedule: "Todos os dias às 03:15",
        expression: "0 15 3 * * ?",
        timeZone: "UTC",
        calendar: "Sem calendário de exclusão",
        nextFireTime: "Aguardando correção",
        previousFireTime: "16 set. 2026, 03:15",
        startAt: "01 jul. 2026, 00:00",
        endAt: "Sem término",
        priority: 4,
        misfireInstruction: "SMART_POLICY",
      },
    ],
    lastExecution: {
      result: "FAILED",
      finishedAt: "16 set. 2026, 03:16",
      duration: "52 s",
      message: "O destino recusou a operação por falta de espaço disponível.",
    },
    jobData: [
      { key: "retencaoDias", type: "Integer", value: "90" },
      { key: "tamanhoLote", type: "Integer", value: "10000" },
    ],
  },
  {
    id: "mensageria.reprocessar-dlq",
    name: "reprocessar-dlq",
    group: "mensageria",
    description:
      "Reprocessa mensagens elegíveis da fila de mensagens não entregues.",
    jobClass: "br.com.porto.scheduler.jobs.DeadLetterReplayJob",
    durable: true,
    requestsRecovery: true,
    disallowConcurrent: true,
    persistJobData: true,
    interruptable: true,
    triggers: [
      {
        key: "reprocessamento-recorrente",
        group: "mensageria",
        type: "SimpleTrigger",
        state: "BLOCKED",
        schedule: "A cada 5 minutos, sem limite de repetições",
        expression: "INTERVAL 5 MINUTES · REPEAT FOREVER",
        timeZone: "UTC",
        calendar: "Sem calendário de exclusão",
        nextFireTime: "Após a execução atual",
        previousFireTime: "16 set. 2026, 20:35",
        startAt: "10 set. 2026, 00:00",
        endAt: "Sem término",
        priority: 9,
        misfireInstruction: "NEXT_WITH_REMAINING_COUNT",
      },
    ],
    activeExecution: {
      state: "RUNNING",
      fireInstanceId: "scheduler-prod-a7f4-1758051300112",
      schedulerInstance: "scheduler-prod-a7f4",
      podName: "obs-scheduler-7f86c9b5f6-4rm8q",
      scheduledFireTime: "16 set. 2026, 20:35:00",
      actualFireTime: "16 set. 2026, 20:35:00",
      elapsed: "7 min 20 s",
      refireCount: 0,
      recovering: false,
    },
    lastExecution: {
      result: "SUCCESS",
      finishedAt: "16 set. 2026, 20:30",
      duration: "4 min 44 s",
      message: "1.820 mensagens reprocessadas; 12 mantidas na fila.",
    },
    jobData: [
      { key: "fila", type: "String", value: "sinistros.dlq" },
      { key: "loteMaximo", type: "Integer", value: "2000" },
      { key: "ignorarExpiradas", type: "Boolean", value: "true" },
    ],
  },
  {
    id: "operacoes.conciliacao-diaria",
    name: "conciliacao-diaria",
    group: "operacoes",
    description:
      "Executa conciliações em uma janela diária com intervalo controlado.",
    jobClass: "br.com.porto.scheduler.jobs.DailyReconciliationJob",
    durable: true,
    requestsRecovery: true,
    disallowConcurrent: false,
    persistJobData: false,
    interruptable: false,
    triggers: [
      {
        key: "janela-conciliacao",
        group: "operacoes",
        type: "DailyTimeIntervalTrigger",
        state: "NORMAL",
        schedule: "A cada 30 minutos, das 08:00 às 18:00 em dias úteis",
        expression: "MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
        timeZone: "America/Sao_Paulo",
        calendar: "feriados-nacionais-br",
        nextFireTime: "17 set. 2026, 08:00",
        previousFireTime: "16 set. 2026, 18:00",
        startAt: "01 ago. 2026, 08:00",
        endAt: "31 dez. 2026, 18:00",
        priority: 5,
        misfireInstruction: "DO_NOTHING",
      },
    ],
    lastExecution: {
      result: "RECOVERED",
      finishedAt: "16 set. 2026, 18:06",
      duration: "6 min 02 s",
      message: "Execução recuperada após a substituição de uma instância do scheduler.",
    },
    jobData: [
      { key: "dominio", type: "String", value: "automovel" },
      { key: "permitirParcial", type: "Boolean", value: "false" },
    ],
  },
  {
    id: "exportacao.exportacao-sob-demanda",
    name: "exportacao-sob-demanda",
    group: "exportacao",
    description:
      "Job durável disponível para disparos manuais ou associação futura a um trigger.",
    jobClass: "br.com.porto.scheduler.jobs.OnDemandExportJob",
    durable: true,
    requestsRecovery: false,
    disallowConcurrent: false,
    persistJobData: false,
    interruptable: true,
    triggers: [],
    lastExecution: {
      result: "NONE",
      finishedAt: "Nunca executado",
      duration: "—",
      message: "Nenhuma execução registrada.",
    },
    jobData: [
      { key: "formatoPadrao", type: "String", value: "PARQUET" },
    ],
  },
];

export function getPrimaryTrigger(job: ScheduledJob) {
  return job.triggers[0];
}

export function getJobTriggerState(job: ScheduledJob): TriggerState {
  return getPrimaryTrigger(job)?.state ?? "NONE";
}

export function cloneScheduledJob(job: ScheduledJob): ScheduledJob {
  const suffix = Math.random().toString(36).slice(2, 6);
  const name = `${job.name}-copia-${suffix}`;

  return {
    ...job,
    id: `${job.group}.${name}`,
    name,
    description: `Cópia de ${job.name}. Revise o agendamento antes de ativar.`,
    triggers: job.triggers.map((trigger) => ({
      ...trigger,
      key: `${trigger.key}-copia-${suffix}`,
      state: "PAUSED",
      nextFireTime: "Pausado para revisão",
    })),
    activeExecution: undefined,
    lastExecution: {
      result: "NONE",
      finishedAt: "Nunca executado",
      duration: "—",
      message: "Nenhuma execução registrada.",
    },
    jobData: job.jobData.map((entry) => ({ ...entry })),
  };
}
