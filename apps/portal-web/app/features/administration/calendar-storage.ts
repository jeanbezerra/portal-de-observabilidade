import type { CalendarEntry } from "./calendar-model";
import {
  createCalendarEntry,
  listCalendarEntries,
  removeCalendarEntry,
  updateCalendarEntry,
} from "./scheduler-service-client";

export function createCalendarEntryId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `CAL-${randomValue}`;
}

export function loadCalendarEntries() {
  return listCalendarEntries();
}

export async function saveCalendarEntry(
  entry: CalendarEntry,
  isEditing: boolean,
) {
  await (isEditing
    ? updateCalendarEntry(entry)
    : createCalendarEntry(entry));
  return listCalendarEntries();
}

export async function deleteCalendarEntry(id: string) {
  await removeCalendarEntry(id);
  return listCalendarEntries();
}
