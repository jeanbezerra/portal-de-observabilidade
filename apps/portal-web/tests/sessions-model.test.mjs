import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterSessions,
  defaultSessionFilters,
  durationLabel,
} from "../app/features/security/sessions-model.ts";
const now = Date.parse("2026-10-17T12:00:00Z");
const iso = (minutes) => new Date(now + minutes * 60000).toISOString();
const session = (reference, activity, expires, current = false) => ({
  reference,
  subject: "user",
  createdAt: iso(-90),
  lastAccessedAt: iso(activity),
  expiresAt: iso(expires),
  current,
  browser: "Chrome",
  operatingSystem: "Windows",
  device: "Computador",
  providerId: "local",
});
const items = [
  session("current", 0, 30, true),
  session("idle", -20, 5),
  session("recent", -2, 28),
  session("expired", -40, -10),
];
test("filters exclude expired sessions and combine scope, activity and browser search", () => {
  assert.deepEqual(
    filterSessions(items, defaultSessionFilters, now).map(
      (item) => item.reference,
    ),
    ["current", "recent", "idle"],
  );
  assert.deepEqual(
    filterSessions(
      items,
      {
        ...defaultSessionFilters,
        scope: "other",
        activity: "idle",
        query: "windows",
      },
      now,
    ).map((item) => item.reference),
    ["idle"],
  );
  assert.deepEqual(
    filterSessions(
      items,
      { ...defaultSessionFilters, activity: "expiring" },
      now,
    ).map((item) => item.reference),
    ["idle"],
  );
  assert.equal(
    filterSessions(
      items,
      { ...defaultSessionFilters, provider: "external" },
      now,
    ).length,
    0,
  );
});
test("ordering, provider labels and countdown use the supplied server clock", () => {
  assert.deepEqual(
    filterSessions(
      items,
      { ...defaultSessionFilters, sort: "expires-asc", query: "conta local" },
      now,
    ).map((item) => item.reference),
    ["idle", "recent", "current"],
  );
  assert.equal(
    filterSessions(items, defaultSessionFilters, now + 6 * 60000).length,
    2,
  );
  assert.equal(
    filterSessions(items, defaultSessionFilters, now + 6 * 60000, now).length,
    3,
    "a stale snapshot cannot assert that another person's session ended",
  );
  assert.equal(durationLabel(61000), "2 min");
  assert.equal(durationLabel(3660000), "1 h 1 min");
});
