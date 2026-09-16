export const calendarEntryTypes = [
  "Feriado",
  "Data comemorativa",
  "Ponto facultativo",
  "Data institucional",
] as const;

export const calendarEntryScopes = [
  "Nacional",
  "Estadual",
  "Municipal",
  "Corporativa",
] as const;

export type CalendarEntryType = (typeof calendarEntryTypes)[number];
export type CalendarEntryScope = (typeof calendarEntryScopes)[number];

export type CalendarEntry = {
  id: string;
  name: string;
  date: string;
  type: CalendarEntryType;
  scope: CalendarEntryScope;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEntryDraft = Pick<
  CalendarEntry,
  "name" | "date" | "type" | "scope" | "location" | "notes"
>;

export type CalendarEntryErrors = Partial<
  Record<keyof CalendarEntryDraft | "form", string>
>;

export const emptyCalendarEntryDraft: CalendarEntryDraft = {
  name: "",
  date: "",
  type: "Feriado",
  scope: "Nacional",
  location: "",
  notes: "",
};

export function isValidCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function getCalendarEntryYear(date: string) {
  return Number(date.slice(0, 4));
}

export function formatCalendarDate(date: string) {
  if (!isValidCalendarDate(date)) return date;

  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatCalendarWeekday(date: string) {
  if (!isValidCalendarDate(date)) return "";

  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function validateCalendarEntry(
  draft: CalendarEntryDraft,
  existingEntries: CalendarEntry[],
  editingId?: string,
): CalendarEntryErrors {
  const errors: CalendarEntryErrors = {};
  const normalizedName = draft.name.trim();

  if (!normalizedName) {
    errors.name = "Informe o nome da data.";
  } else if (normalizedName.length > 120) {
    errors.name = "Use no máximo 120 caracteres.";
  }

  if (!isValidCalendarDate(draft.date)) {
    errors.date = "Informe uma data válida.";
  }

  if (!calendarEntryTypes.includes(draft.type)) {
    errors.type = "Selecione um tipo válido.";
  }

  if (!calendarEntryScopes.includes(draft.scope)) {
    errors.scope = "Selecione uma abrangência válida.";
  }

  if (
    (draft.scope === "Estadual" || draft.scope === "Municipal") &&
    !draft.location.trim()
  ) {
    errors.location =
      draft.scope === "Estadual"
        ? "Informe o estado relacionado."
        : "Informe o município relacionado.";
  } else if (draft.location.trim().length > 120) {
    errors.location = "Use no máximo 120 caracteres.";
  }

  if (draft.notes.trim().length > 500) {
    errors.notes = "Use no máximo 500 caracteres.";
  }

  const duplicate = existingEntries.some(
    (entry) =>
      entry.id !== editingId &&
      entry.date === draft.date &&
      entry.name.trim().toLocaleLowerCase("pt-BR") ===
        normalizedName.toLocaleLowerCase("pt-BR") &&
      entry.scope === draft.scope &&
      entry.location.trim().toLocaleLowerCase("pt-BR") ===
        draft.location.trim().toLocaleLowerCase("pt-BR"),
  );

  if (duplicate) {
    errors.form = "Já existe uma data idêntica cadastrada para essa localidade.";
  }

  return errors;
}

export function normalizeCalendarEntryDraft(
  draft: CalendarEntryDraft,
): CalendarEntryDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    location: draft.location.trim(),
    notes: draft.notes.trim(),
  };
}
