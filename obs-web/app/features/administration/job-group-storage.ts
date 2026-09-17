import {
  defaultJobGroups,
  normalizeJobGroupDraft,
  validateJobGroupDraft,
  type JobGroup,
} from "./job-group-model";

const storageKey = "portal-observabilidade.job-groups.v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRawGroups(): unknown[] | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseJobGroup(value: unknown): JobGroup | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.key !== "string" ||
    !/^[a-z0-9][a-z0-9._-]*$/.test(value.key) ||
    value.key.length > 80 ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 80 ||
    typeof value.description !== "string" ||
    value.description.length > 300 ||
    typeof value.active !== "boolean" ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    return null;
  }

  return value as JobGroup;
}

function sortGroups(groups: JobGroup[]) {
  return [...groups].sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR"),
  );
}

export function createJobGroupId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `JOB-GROUP-${randomValue}`;
}

export function loadJobGroups() {
  const rawGroups = readRawGroups();
  if (!rawGroups) return sortGroups(defaultJobGroups);

  return sortGroups(
    rawGroups.flatMap((value) => {
      const group = parseJobGroup(value);
      return group ? [group] : [];
    }),
  );
}

export function saveJobGroup(group: JobGroup) {
  if (typeof window === "undefined") return [];

  const groups = loadJobGroups();
  const normalizedDraft = normalizeJobGroupDraft(group);
  const normalizedGroup: JobGroup = { ...group, ...normalizedDraft };

  if (
    !parseJobGroup(normalizedGroup) ||
    Object.keys(
      validateJobGroupDraft(normalizedGroup, groups, normalizedGroup.id),
    ).length > 0
  ) {
    throw new Error("Os dados informados para o grupo são inválidos.");
  }

  const nextGroups = groups.filter((item) => item.id !== normalizedGroup.id);
  nextGroups.push(normalizedGroup);
  window.localStorage.setItem(storageKey, JSON.stringify(nextGroups));
  return loadJobGroups();
}

export function deleteJobGroup(id: string) {
  if (typeof window === "undefined") return [];

  const nextGroups = loadJobGroups().filter((group) => group.id !== id);
  window.localStorage.setItem(storageKey, JSON.stringify(nextGroups));
  return loadJobGroups();
}
