import type { CalendarEntry } from "./calendar-model";
import type { JobGroup } from "./job-group-model";
import type {
  ActiveExecution,
  HttpRequestConfiguration,
  JobTrigger,
  ScheduledJob,
} from "./scheduled-jobs-model";
import type { TimeZoneEntry } from "./time-zone-model";

const configuredBaseUrl =
  import.meta.env.VITE_SCHEDULER_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8081" : "");
const apiBaseUrl = `${configuredBaseUrl.replace(/\/$/, "")}/api/v1`;

export class SchedulerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SchedulerApiError";
  }
}

type ProblemDetail = {
  title?: string;
  detail?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new SchedulerApiError(
      "Não foi possível conectar à API de agendamentos.",
      0,
    );
  }

  if (!response.ok) {
    let problem: ProblemDetail | undefined;
    try {
      problem = (await response.json()) as ProblemDetail;
    } catch {
      problem = undefined;
    }
    throw new SchedulerApiError(
      problem?.detail || problem?.title || "A API não concluiu a operação.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function payload<T extends object>(value: T) {
  return JSON.stringify(value);
}

export function getSchedulerApiError(error: unknown, fallback: string) {
  return error instanceof SchedulerApiError ? error.message : fallback;
}

export function listCalendarEntries() {
  return request<CalendarEntry[]>("/calendars");
}

export function createCalendarEntry(entry: CalendarEntry) {
  return request<CalendarEntry>("/calendars", {
    method: "POST",
    body: payload(entry),
  });
}

export function updateCalendarEntry(entry: CalendarEntry) {
  return request<CalendarEntry>(`/calendars/${encodeURIComponent(entry.id)}`, {
    method: "PUT",
    body: payload(entry),
  });
}

export function removeCalendarEntry(id: string) {
  return request<void>(`/calendars/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function listTimeZones() {
  return request<TimeZoneEntry[]>("/time-zones");
}

export function createTimeZone(entry: TimeZoneEntry) {
  return request<TimeZoneEntry>("/time-zones", {
    method: "POST",
    body: payload(entry),
  });
}

export function updateTimeZone(entry: TimeZoneEntry) {
  return request<TimeZoneEntry>(`/time-zones/${encodeURIComponent(entry.id)}`, {
    method: "PUT",
    body: payload(entry),
  });
}

export function removeTimeZone(id: string) {
  return request<void>(`/time-zones/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function listJobGroups() {
  return request<JobGroup[]>("/job-groups");
}

export function createJobGroup(group: JobGroup) {
  return request<JobGroup>("/job-groups", {
    method: "POST",
    body: payload(group),
  });
}

export function updateJobGroup(group: JobGroup) {
  return request<JobGroup>(`/job-groups/${encodeURIComponent(group.id)}`, {
    method: "PUT",
    body: payload(group),
  });
}

export function removeJobGroup(id: string) {
  return request<void>(`/job-groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type JobTypeOption = {
  id: string;
  name: string;
  description: string;
  type: string;
  disallowConcurrent: boolean;
  persistJobData: boolean;
  interruptable: boolean;
};

export function listJobTypes() {
  return request<JobTypeOption[]>("/job-types");
}

type WireTrigger = Omit<
  JobTrigger,
  | "nextFireTime"
  | "previousFireTime"
  | "startAt"
  | "endAt"
> & {
  nextFireTime: string | null;
  previousFireTime: string | null;
  startAt: string | null;
  endAt: string | null;
};

type WireExecution = Omit<
  ActiveExecution,
  "scheduledFireTime" | "actualFireTime" | "elapsed"
> & {
  scheduledFireTime: string | null;
  actualFireTime: string;
  elapsedMillis: number;
};

type WireJob = Omit<
  ScheduledJob,
  "triggers" | "activeExecution" | "executionCounts" | "lastExecution"
> & {
  triggers: WireTrigger[];
  activeExecution: WireExecution | null;
  executionCounts?: ScheduledJob["executionCounts"];
  lastExecution: {
    result: ScheduledJob["lastExecution"]["result"];
    finishedAt: string | null;
    durationMillis: number;
    message: string;
  };
};

function formatInstant(value: string | null, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDuration(milliseconds: number | null | undefined) {
  if (milliseconds === null || milliseconds === undefined) return "—";
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours > 0 ? `${hours} h` : "",
    minutes > 0 ? `${minutes} min` : "",
    `${seconds} s`,
  ]
    .filter(Boolean)
    .join(" ");
}

function mapTrigger(trigger: WireTrigger): JobTrigger {
  return {
    ...trigger,
    nextFireTime: formatInstant(
      trigger.nextFireTime,
      trigger.state === "PAUSED" ? "Pausado" : "Sem próximo disparo",
    ),
    previousFireTime: formatInstant(
      trigger.previousFireTime,
      "Nunca disparado",
    ),
    startAt: formatInstant(trigger.startAt, "Início não informado"),
    endAt: formatInstant(trigger.endAt, "Sem término"),
  };
}

function mapJob(job: WireJob): ScheduledJob {
  return {
    ...job,
    executionCounts: job.executionCounts ?? {
      successCount: 0,
      failureCount: 0,
    },
    triggers: job.triggers.map(mapTrigger),
    activeExecution: job.activeExecution
      ? {
          ...job.activeExecution,
          scheduledFireTime: formatInstant(
            job.activeExecution.scheduledFireTime,
            "Disparo manual",
          ),
          actualFireTime: formatInstant(
            job.activeExecution.actualFireTime,
            "agora",
          ),
          elapsed: formatDuration(job.activeExecution.elapsedMillis),
        }
      : undefined,
    lastExecution: {
      result: job.lastExecution.result,
      finishedAt: formatInstant(
        job.lastExecution.finishedAt,
        "Nunca executado",
      ),
      duration:
        job.lastExecution.result === "NONE"
          ? "—"
          : formatDuration(job.lastExecution.durationMillis),
      message: job.lastExecution.message,
    },
  };
}

function jobPayload(job: ScheduledJob) {
  return {
    name: job.name,
    group: job.group,
    description: job.description,
    type: job.type,
    httpRequest: job.httpRequest,
    durable: job.durable,
    requestsRecovery: job.requestsRecovery,
    triggers: job.triggers.map((trigger) => ({
      key: trigger.key,
      group: trigger.group,
      type: trigger.type,
      expression: trigger.expression,
      timeZone: trigger.timeZone,
      calendar: trigger.calendar,
      priority: trigger.priority,
      misfireInstruction: trigger.misfireInstruction,
    })),
  };
}

export async function listScheduledJobs() {
  return (await request<WireJob[]>("/jobs")).map(mapJob);
}

export async function getScheduledJob(group: string, name: string) {
  return mapJob(
    await request<WireJob>(
      `/jobs/${encodeURIComponent(group)}/${encodeURIComponent(name)}`,
    ),
  );
}

export async function createScheduledJob(job: ScheduledJob) {
  return mapJob(
    await request<WireJob>("/jobs", {
      method: "POST",
      body: payload(jobPayload(job)),
    }),
  );
}

export async function updateScheduledJobConfiguration(
  job: ScheduledJob,
  httpRequest: HttpRequestConfiguration,
) {
  return mapJob(
    await request<WireJob>(
      `/jobs/${encodeURIComponent(job.group)}/${encodeURIComponent(job.name)}/configuration`,
      {
        method: "PUT",
        body: payload({ type: job.type, httpRequest }),
      },
    ),
  );
}

export async function runJobAction(
  job: ScheduledJob,
  action: "pause" | "resume" | "trigger" | "interrupt" | "duplicate",
) {
  return mapJob(
    await request<WireJob>(
      `/jobs/${encodeURIComponent(job.group)}/${encodeURIComponent(job.name)}/${action}`,
      { method: "POST" },
    ),
  );
}

export async function removeScheduledJob(job: ScheduledJob) {
  await request<void>(
    `/jobs/${encodeURIComponent(job.group)}/${encodeURIComponent(job.name)}`,
    { method: "DELETE" },
  );
}

export async function updateScheduledJobTrigger(
  job: ScheduledJob,
  trigger: JobTrigger,
) {
  const updated = await request<WireTrigger>(
    `/jobs/${encodeURIComponent(job.group)}/${encodeURIComponent(job.name)}/triggers/${encodeURIComponent(trigger.group)}/${encodeURIComponent(trigger.key)}`,
    {
      method: "PUT",
      body: payload({
        key: trigger.key,
        group: trigger.group,
        type: trigger.type,
        expression: trigger.expression,
        timeZone: trigger.timeZone,
        calendar: trigger.calendar,
        priority: trigger.priority,
        misfireInstruction: trigger.misfireInstruction,
      }),
    },
  );
  return mapTrigger(updated);
}

export type BulkActionResult = {
  requested: number;
  succeeded: number;
  skipped: string[];
};

export function runBulkJobAction(
  jobs: ScheduledJob[],
  action: "pause" | "trigger" | "interrupt",
) {
  return request<BulkActionResult>(`/jobs/actions/${action}`, {
    method: "POST",
    body: payload({
      jobs: jobs.map((job) => ({ group: job.group, name: job.name })),
    }),
  });
}

export type ExecutionHistoryEntry = {
  id: number;
  fireInstanceId: string;
  jobName: string;
  jobGroup: string;
  triggerName: string | null;
  triggerGroup: string | null;
  schedulerInstance: string;
  scheduledFireTime: string | null;
  actualFireTime: string;
  finishedAt: string | null;
  durationMillis: number | null;
  result:
    | "RUNNING"
    | "SUCCESS"
    | "FAILED"
    | "RECOVERED"
    | "INTERRUPTION_REQUESTED";
  message: string;
  refireCount: number;
  recovering: boolean;
  interruptionRequested: boolean;
};

export function listExecutionHistory(limit = 200) {
  return request<ExecutionHistoryEntry[]>(`/executions?limit=${limit}`);
}

export type ExecutionLogEntry = {
  id: number;
  fireInstanceId: string;
  loggedAt: string;
  level: "INFO" | "WARN" | "ERROR";
  source: string;
  message: string;
  details: string | null;
};

export function listJobExecutionLogs(
  group: string,
  name: string,
  limit = 500,
) {
  return request<ExecutionLogEntry[]>(
    `/jobs/${encodeURIComponent(group)}/${encodeURIComponent(name)}/logs?limit=${limit}`,
  );
}

export type ExecutionLogSort = "loggedAt" | "level" | "source" | "execution";
export type ExecutionLogDirection = "asc" | "desc";

export type ExecutionLogExecution = {
  fireInstanceId: string;
  actualFireTime: string;
  result: ExecutionHistoryEntry["result"];
  logCount: number;
};

export type ExecutionLogPage = {
  items: ExecutionLogEntry[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  infoCount: number;
  warningCount: number;
  errorCount: number;
  executions: ExecutionLogExecution[];
};

export type ExecutionLogSearch = {
  page: number;
  pageSize: number;
  sort: ExecutionLogSort;
  direction: ExecutionLogDirection;
  level: "ALL" | ExecutionLogEntry["level"];
  fireInstanceId: string;
  query: string;
};

export function searchJobExecutionLogs(
  group: string,
  name: string,
  search: ExecutionLogSearch,
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams({
    page: String(search.page),
    pageSize: String(search.pageSize),
    sort: search.sort,
    direction: search.direction,
    level: search.level,
    fireInstanceId: search.fireInstanceId,
    query: search.query,
  });

  return request<ExecutionLogPage>(
    `/jobs/${encodeURIComponent(group)}/${encodeURIComponent(name)}/logs/search?${parameters.toString()}`,
    { signal },
  );
}
