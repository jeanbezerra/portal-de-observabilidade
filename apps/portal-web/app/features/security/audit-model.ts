import type { AuditEvent } from "./security-model";

export type AuditRow = AuditEvent & {
  sourceContext: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
};
export const auditFields = [
  "query",
  "outcome",
  "eventType",
  "actor",
  "target",
  "providerId",
  "traceId",
  "eventId",
  "since",
  "until",
  "sort",
  "direction",
] as const;
export type AuditDraft = Record<(typeof auditFields)[number], string>;
export type AuditFilters = AuditDraft & { snapshotAt: string };
export type AuditResults = {
  items: AuditRow[];
  total: number;
  limit: number;
  offset: number;
  totals: { total: number; success: number; failure: number; denied: number };
  filters: AuditFilters;
};
export const auditSorts = {
  occurredAt: "Data do evento",
  eventType: "Evento",
  actor: "Usuário",
  target: "Recurso",
  providerId: "Provedor",
  outcome: "Resultado",
};
export const auditEventLabels: Record<string, string> = {
  "identity-provider.created": "Provedor criado",
  "identity-provider.updated": "Provedor atualizado",
  "identity-provider.validated": "Provedor validado",
  "identity-provider.enabled": "Provedor habilitado",
  "identity-provider.disabled": "Provedor desabilitado",
  "group-mapping.created": "Vínculo de grupo criado",
  "group-mapping.deleted": "Vínculo de grupo excluído",
  "authentication.succeeded": "Login realizado",
  "authentication.failed": "Falha no login",
  "authentication.logout": "Saída da conta",
  "authorization.decision": "Decisão de autorização",
  "identity.created": "Usuário criado",
  "identity.updated": "Usuário atualizado",
  "identity.password-changed": "Senha alterada",
  "identity.password-reset": "Senha redefinida",
  "group.created": "Grupo criado",
  "group.updated": "Grupo atualizado",
  "group.deleted": "Grupo excluído",
  "role.created": "Perfil criado",
  "role.updated": "Perfil atualizado",
  "role.deleted": "Perfil excluído",
  "permission.saved": "Permissão salva",
  "permission.deleted": "Permissão excluída",
  "session.revoked": "Sessão encerrada",
  "audit.exported": "Evidência de auditoria gerada",
  "provider.created": "Provedor criado",
  "provider.updated": "Provedor atualizado",
  "provider.enabled": "Provedor habilitado",
  "provider.disabled": "Provedor desabilitado",
  "provider.validated": "Provedor validado",
};
export function auditDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export function localAuditTime(iso: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}
export function auditTimeToIso(local: string) {
  if (!local) return "";
  const guess = Date.parse(local + "Z");
  if (!Number.isFinite(guess))
    throw new Error("Informe uma data e hora válidas.");
  const offset =
    guess - Date.parse(localAuditTime(new Date(guess).toISOString()) + "Z");
  const result = new Date(guess + offset).toISOString();
  if (localAuditTime(result).slice(0, local.length) !== local)
    throw new Error("Esse horário não existe no fuso de Brasília.");
  return result;
}
export function draftFromParams(params: URLSearchParams): AuditDraft {
  return Object.fromEntries(
    auditFields.map((key) => [
      key,
      key === "since" || key === "until"
        ? localAuditTime(params.get(key) ?? "")
        : (params.get(key) ??
          (key === "sort" ? "occurredAt" : key === "direction" ? "desc" : "")),
    ]),
  ) as AuditDraft;
}
export function auditParams(values: Record<string, unknown>) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(([key, value]) => [key, String(value)]),
  );
}
export function appliedAuditParams(
  filters: AuditFilters,
  limit: number,
  offset = 0,
) {
  return auditParams({ ...filters, limit, offset });
}
