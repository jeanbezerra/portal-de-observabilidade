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

export type HttpRequestParameter = {
  name: string;
  value: string | null;
  secretRef: string | null;
};

export type HttpAuthentication = {
  type: "NONE" | "BASIC" | "BEARER" | "API_KEY" | "OAUTH2_CLIENT_CREDENTIALS";
  username: string;
  passwordSecretRef: string;
  tokenSecretRef: string;
  apiKeyName: string;
  apiKeyLocation: "HEADER" | "QUERY";
  tokenUrl: string;
  clientId: string;
  clientSecretRef: string;
  scopes: string[];
  audience: string;
  clientAuthenticationMethod: "BASIC" | "REQUEST_BODY";
  tokenParameters: HttpRequestParameter[];
};

export type HttpRequestConfiguration = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  queryParameters: HttpRequestParameter[];
  headers: HttpRequestParameter[];
  cookies: HttpRequestParameter[];
  authentication: HttpAuthentication;
  bodyType: "NONE" | "RAW" | "JSON" | "FORM_URLENCODED";
  body: string;
  formParameters: HttpRequestParameter[];
  contentType: string;
  connectTimeoutSeconds: number;
  requestTimeoutSeconds: number;
  ignoreTlsValidation: boolean;
  redirectPolicy: "NEVER" | "NORMAL";
  httpVersion: "HTTP_1_1" | "HTTP_2";
  expectedStatusCodes: number[];
  maxResponseBytes: number;
  retry: {
    maxAttempts: number;
    initialDelayMillis: number;
    backoffMultiplier: number;
    statusCodes: number[];
  };
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
  type: string;
  httpRequest: HttpRequestConfiguration | null;
  durable: boolean;
  requestsRecovery: boolean;
  disallowConcurrent: boolean;
  persistJobData: boolean;
  interruptable: boolean;
  triggers: JobTrigger[];
  activeExecution?: ActiveExecution;
  executionCounts: {
    successCount: number;
    failureCount: number;
  };
  lastExecution: {
    result: ExecutionResult;
    finishedAt: string;
    duration: string;
    message: string;
  };
};

export function getPrimaryTrigger(job: ScheduledJob) {
  return job.triggers[0];
}

export function getJobTriggerState(job: ScheduledJob): TriggerState {
  return getPrimaryTrigger(job)?.state ?? "NONE";
}
