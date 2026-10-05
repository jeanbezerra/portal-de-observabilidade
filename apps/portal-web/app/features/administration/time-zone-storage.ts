import type { TimeZoneEntry } from "./time-zone-model";
import {
  createTimeZone,
  listTimeZones,
  removeTimeZone,
  updateTimeZone,
} from "./scheduler-service-client";

export function createTimeZoneEntryId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `TZ-${randomValue}`;
}

export function loadTimeZoneEntries() {
  return listTimeZones();
}

export async function saveTimeZoneEntry(
  entry: TimeZoneEntry,
  isEditing: boolean,
) {
  await (isEditing ? updateTimeZone(entry) : createTimeZone(entry));
  return listTimeZones();
}

export async function deleteTimeZoneEntry(id: string) {
  await removeTimeZone(id);
  return listTimeZones();
}
