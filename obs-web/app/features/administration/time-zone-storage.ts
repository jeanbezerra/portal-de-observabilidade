import {
  canonicalizeTimeZone,
  isValidTimeZone,
  validateTimeZoneDraft,
  type TimeZoneEntry,
} from "./time-zone-model";

const storageKey = "portal-observabilidade.time-zone-entries.v1";

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

function parseTimeZoneEntry(value: unknown): TimeZoneEntry | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.label !== "string" ||
    !value.label.trim() ||
    value.label.length > 80 ||
    typeof value.timeZone !== "string" ||
    !isValidTimeZone(value.timeZone) ||
    typeof value.description !== "string" ||
    value.description.length > 300 ||
    typeof value.active !== "boolean" ||
    typeof value.isDefault !== "boolean" ||
    (value.isDefault && !value.active) ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    return null;
  }

  return value as TimeZoneEntry;
}

function sortEntries(entries: TimeZoneEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
    return left.label.localeCompare(right.label, "pt-BR");
  });
}

export function createTimeZoneEntryId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `TZ-${randomValue}`;
}

export function loadTimeZoneEntries() {
  return sortEntries(
    readRawEntries().flatMap((value) => {
      const entry = parseTimeZoneEntry(value);
      return entry ? [entry] : [];
    }),
  );
}

export function saveTimeZoneEntry(entry: TimeZoneEntry) {
  if (typeof window === "undefined") return [];

  if (!parseTimeZoneEntry(entry)) {
    throw new Error("Os dados informados para o fuso horário são inválidos.");
  }

  const entries = loadTimeZoneEntries();
  const existingEntry = entries.find((item) => item.id === entry.id);
  const normalizedEntry: TimeZoneEntry = {
    ...entry,
    timeZone: canonicalizeTimeZone(entry.timeZone),
    active: entries.length === 0 || entry.isDefault ? true : entry.active,
    isDefault: entries.length === 0 ? true : entry.isDefault,
  };

  if (
    Object.keys(
      validateTimeZoneDraft(normalizedEntry, entries, normalizedEntry.id),
    ).length > 0
  ) {
    throw new Error("O fuso horário informado conflita com outro registro.");
  }

  if (existingEntry?.isDefault && !normalizedEntry.isDefault) {
    throw new Error("Defina outro fuso horário como padrão antes desta alteração.");
  }

  const nextValidEntries = entries
    .filter((item) => item.id !== normalizedEntry.id)
    .map((item) =>
      normalizedEntry.isDefault && item.isDefault
        ? { ...item, isDefault: false, updatedAt: normalizedEntry.updatedAt }
        : item,
    );
  nextValidEntries.push(normalizedEntry);

  const invalidEntries = readRawEntries().filter(
    (value) => parseTimeZoneEntry(value) === null,
  );
  window.localStorage.setItem(
    storageKey,
    JSON.stringify([...nextValidEntries, ...invalidEntries]),
  );

  return loadTimeZoneEntries();
}

export function deleteTimeZoneEntry(id: string) {
  if (typeof window === "undefined") return [];

  const entries = loadTimeZoneEntries();
  const entry = entries.find((item) => item.id === id);
  if (entry?.isDefault) {
    throw new Error("Defina outro fuso horário como padrão antes da exclusão.");
  }

  const nextEntries = readRawEntries().filter(
    (value) => !isRecord(value) || value.id !== id,
  );
  window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  return loadTimeZoneEntries();
}
