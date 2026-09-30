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

export function getPrimaryTrigger(job: ScheduledJob) {
  return job.triggers[0];
}

export function getJobTriggerState(job: ScheduledJob): TriggerState {
  return getPrimaryTrigger(job)?.state ?? "NONE";
}
