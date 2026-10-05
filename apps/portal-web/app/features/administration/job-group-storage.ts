import type { JobGroup } from "./job-group-model";
import {
  createJobGroup,
  listJobGroups,
  removeJobGroup,
  updateJobGroup,
} from "./scheduler-service-client";

export function createJobGroupId() {
  const randomValue =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `JOB-GROUP-${randomValue}`;
}

export function loadJobGroups() {
  return listJobGroups();
}

export async function saveJobGroup(group: JobGroup, isEditing: boolean) {
  await (isEditing ? updateJobGroup(group) : createJobGroup(group));
  return listJobGroups();
}

export async function deleteJobGroup(id: string) {
  await removeJobGroup(id);
  return listJobGroups();
}
