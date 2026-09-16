import {
  calendarEntryScopes,
  calendarEntryTypes,
  isValidCalendarDate,
  validateCalendarEntry,
  type CalendarEntry,
} from "./calendar-model";

const storageKey = "portal-observabilidade.calendar-entries.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRawEntries(): unknown[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseCalendarEntry(value: unknown): CalendarEntry | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 120 ||
    typeof value.date !== "string" ||
    !isValidCalendarDate(value.date) ||
    typeof value.type !== "string" ||
    !calendarEntryTypes.includes(
      value.type as (typeof calendarEntryTypes)[number],
    ) ||
    typeof value.scope !== "string" ||
    !calendarEntryScopes.includes(
      value.scope as (typeof calendarEntryScopes)[number],
    ) ||
    typeof value.location !== "string" ||
    ((value.scope === "Estadual" || value.scope === "Municipal") &&
      !value.location.trim()) ||
    value.location.length > 120 ||
    typeof value.notes !== "string" ||
    value.notes.length > 500 ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    return null;
  }

  return value as CalendarEntry;
}

function sortEntries(entries: CalendarEntry[]) {
  return [...entries].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.name.localeCompare(right.name, "pt-BR"),
  );
}

export function createCalendarEntryId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `CAL-${randomValue}`;
}

export function loadCalendarEntries() {
  return sortEntries(
    readRawEntries().flatMap((value) => {
      const entry = parseCalendarEntry(value);
      return entry ? [entry] : [];
    }),
  );
}

export function saveCalendarEntry(entry: CalendarEntry) {
  if (typeof window === "undefined") return [];

  if (!parseCalendarEntry(entry)) {
    throw new Error("Os dados informados para o calendário são inválidos.");
  }

  if (
    Object.keys(
      validateCalendarEntry(entry, loadCalendarEntries(), entry.id),
    ).length > 0
  ) {
    throw new Error("A data informada conflita com outro registro do calendário.");
  }

  const rawEntries = readRawEntries();
  const entryIndex = rawEntries.findIndex(
    (value) => isRecord(value) && value.id === entry.id,
  );
  const nextEntries = [...rawEntries];

  if (entryIndex >= 0) {
    nextEntries[entryIndex] = entry;
  } else {
    nextEntries.push(entry);
  }

  window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  return loadCalendarEntries();
}

export function deleteCalendarEntry(id: string) {
  if (typeof window === "undefined") return [];

  const nextEntries = readRawEntries().filter(
    (value) => !isRecord(value) || value.id !== id,
  );
  window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  return loadCalendarEntries();
}
