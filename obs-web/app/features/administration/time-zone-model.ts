export type TimeZoneEntry = {
  id: string;
  label: string;
  timeZone: string;
  description: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimeZoneDraft = Pick<
  TimeZoneEntry,
  "label" | "timeZone" | "description" | "active" | "isDefault"
>;

export type TimeZoneErrors = Partial<
  Record<keyof TimeZoneDraft | "form", string>
>;

export const emptyTimeZoneDraft: TimeZoneDraft = {
  label: "",
  timeZone: "",
  description: "",
  active: true,
  isDefault: false,
};

const fallbackTimeZones = [
  "UTC",
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/London",
  "Asia/Tokyo",
];

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

export function getSupportedTimeZones() {
  const supportedValuesOf = (Intl as IntlWithSupportedValues).supportedValuesOf;
  const values = supportedValuesOf
    ? supportedValuesOf("timeZone")
    : fallbackTimeZones;

  return [...new Set(["UTC", ...values])].sort((left, right) => {
    if (left === "UTC") return -1;
    if (right === "UTC") return 1;
    return left.localeCompare(right, "pt-BR");
  });
}

export function isValidTimeZone(value: string) {
  if (!value.trim() || value.length > 100) return false;

  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function canonicalizeTimeZone(value: string) {
  if (!isValidTimeZone(value)) return value.trim();
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: value.trim(),
  }).resolvedOptions().timeZone;
}

export function formatTimeZoneOffset(timeZone: string, date: Date) {
  if (!isValidTimeZone(timeZone)) return "—";

  const offset = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return offset?.replace("GMT", "UTC") ?? "—";
}

export function formatZonedDateTime(timeZone: string, date: Date) {
  if (!isValidTimeZone(timeZone)) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function normalizeTimeZoneDraft(draft: TimeZoneDraft): TimeZoneDraft {
  return {
    ...draft,
    label: draft.label.trim(),
    timeZone: canonicalizeTimeZone(draft.timeZone),
    description: draft.description.trim(),
  };
}

export function validateTimeZoneDraft(
  draft: TimeZoneDraft,
  existingEntries: TimeZoneEntry[],
  editingId?: string,
): TimeZoneErrors {
  const errors: TimeZoneErrors = {};
  const label = draft.label.trim();
  const timeZone = draft.timeZone.trim();

  if (!label) {
    errors.label = "Informe um nome de exibição.";
  } else if (label.length > 80) {
    errors.label = "Use no máximo 80 caracteres.";
  }

  if (!timeZone) {
    errors.timeZone = "Informe o identificador IANA.";
  } else if (!isValidTimeZone(timeZone)) {
    errors.timeZone = "Informe um identificador IANA válido.";
  }

  if (draft.description.trim().length > 300) {
    errors.description = "Use no máximo 300 caracteres.";
  }

  const originalEntry = existingEntries.find((entry) => entry.id === editingId);
  if (originalEntry?.isDefault && !draft.isDefault) {
    errors.isDefault =
      "Defina outro fuso como padrão antes de alterar este registro.";
  }

  if (draft.isDefault && !draft.active) {
    errors.active = "O fuso horário padrão precisa estar ativo.";
  }

  if (existingEntries.length === 0 && !draft.isDefault) {
    errors.isDefault = "O primeiro fuso horário será o padrão do sistema.";
  }

  if (isValidTimeZone(timeZone)) {
    const canonicalTimeZone = canonicalizeTimeZone(timeZone);
    const duplicate = existingEntries.some(
      (entry) =>
        entry.id !== editingId &&
        canonicalizeTimeZone(entry.timeZone) === canonicalTimeZone,
    );

    if (duplicate) {
      errors.form = "Este fuso horário já está cadastrado.";
    }
  }

  return errors;
}
