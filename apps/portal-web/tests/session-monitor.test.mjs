import { test } from "node:test";
import assert from "node:assert/strict";
import { monitorSession, sessionDeadline } from "../app/features/security/session-monitor.ts";

function browser(t) {
  const window = new EventTarget();
  window.setInterval = globalThis.setInterval;
  window.clearInterval = globalThis.clearInterval;
  const document = new EventTarget();
  document.visibilityState = "visible";
  globalThis.window = window;
  globalThis.document = document;
  t.after(() => { delete globalThis.window; delete globalThis.document; });
  return { window, document };
}

test("uses the API clock delta for session deadlines", () => {
  assert.equal(sessionDeadline({ checkedAt: "2026-10-16T10:00:00Z", expiresAt: "2026-10-16T10:30:00Z" }, 100), 1_800_100);
  assert.equal(sessionDeadline(null), null);
  assert.equal(sessionDeadline({ checkedAt: "invalid", expiresAt: "invalid" }), null);
});

test("an idle page expires without background requests keeping the session alive", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  browser(t);
  let calls = 0;
  let expired = 0;
  const stop = monitorSession({ deadline: () => 60_000, validate: async () => { calls++; }, expire: () => { expired++; } });
  t.mock.timers.tick(59_000);
  assert.equal(calls, 0);
  assert.equal(expired, 0);
  t.mock.timers.tick(1_000);
  assert.equal(expired, 1);
  stop();
});

test("activity renews at a bounded rate; hidden tabs do not renew and focus revalidates", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  const { window, document } = browser(t);
  let calls = 0;
  const stop = monitorSession({ deadline: () => 1_000_000, validate: async () => { calls++; }, expire: () => {} });
  window.dispatchEvent(new Event("keydown"));
  t.mock.timers.tick(30_000);
  await Promise.resolve();
  assert.equal(calls, 1);
  t.mock.timers.tick(30_000);
  await Promise.resolve();
  assert.equal(calls, 1);
  document.visibilityState = "hidden";
  window.dispatchEvent(new Event("keydown"));
  t.mock.timers.tick(30_000);
  assert.equal(calls, 1);
  document.visibilityState = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
  await Promise.resolve();
  assert.equal(calls, 2);
  stop();
  window.dispatchEvent(new Event("focus"));
  assert.equal(calls, 2);
});
