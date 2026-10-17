import type { ActiveSession } from "./security-model";

export type SessionOverview = {
  subject: string;
  checkedAt: string;
  items: ActiveSession[];
};
export type RevocationResult = {
  revoked: number;
  alreadyEnded: number;
  currentRevoked: boolean;
};
export type SessionFilters = {
  query: string;
  scope: string;
  activity: string;
  provider: string;
  sort: string;
};
export const defaultSessionFilters: SessionFilters = {
  query: "",
  scope: "all",
  activity: "all",
  provider: "all",
  sort: "activity-desc",
};
export const revocationReasons = {
  USER_REQUEST: "Solicitação do usuário",
  SUSPICIOUS_ACTIVITY: "Atividade não reconhecida",
  SHARED_DEVICE: "Dispositivo compartilhado",
  ADMINISTRATIVE: "Manutenção de acesso",
};
export type RevocationReason = keyof typeof revocationReasons;
export function providerLabel(value: string | null) {
  return value === "local" ? "Conta local" : value || "Não registrado";
}
export function sessionDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value))
    : "Não se aplica";
}
export function durationLabel(milliseconds: number) {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60000));
  if (!minutes) return "menos de 1 min";
  if (minutes < 60) return minutes + " min";
  return (
    Math.floor(minutes / 60) +
    " h" +
    (minutes % 60 ? " " + (minutes % 60) + " min" : "")
  );
}
export function activeSessions(items: ActiveSession[], now: number) {
  return items.filter((item) => Date.parse(item.expiresAt) > now);
}
export function filterSessions(
  items: ActiveSession[],
  filters: SessionFilters,
  now: number,
  checkedAt = now,
) {
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  const rows = activeSessions(items, checkedAt).filter((item) => {
    const idle = now - Date.parse(item.lastAccessedAt);
    return (
      (!query ||
        [
          item.reference,
          item.browser,
          item.operatingSystem,
          item.device,
          providerLabel(item.providerId),
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(query)) &&
      (filters.scope === "all" ||
        (filters.scope === "current" ? item.current : !item.current)) &&
      (filters.activity === "all" ||
        (filters.activity === "recent"
          ? idle < 300000
          : filters.activity === "idle"
            ? idle >= 900000
            : Date.parse(item.expiresAt) - now <= 300000)) &&
      (filters.provider === "all" ||
        (item.providerId || "unknown") === filters.provider)
    );
  });
  const [column, direction] = filters.sort.split("-");
  const property =
    column === "created"
      ? "createdAt"
      : column === "expires"
        ? "expiresAt"
        : "lastAccessedAt";
  return rows.sort(
    (a, b) =>
      (Date.parse(a[property]) - Date.parse(b[property])) *
        (direction === "asc" ? 1 : -1) ||
      a.reference.localeCompare(b.reference),
  );
}
