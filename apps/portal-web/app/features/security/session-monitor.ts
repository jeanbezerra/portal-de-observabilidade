import type { Identity } from "./security-model";

// Use the service clock delta, since the workstation clock may differ from the API.
export function sessionDeadline(session: Identity["session"], now = Date.now()) {
  if (!session) return null;
  const remaining = Date.parse(session.expiresAt) - Date.parse(session.checkedAt);
  return Number.isFinite(remaining) ? now + Math.max(0, remaining) : null;
}

export function monitorSession({ deadline, validate, expire }: {
  deadline: () => number | null;
  validate: () => Promise<unknown>;
  expire: () => void;
}) {
  let active = false;
  let lastCheck = Date.now();
  let pending = false;
  let stopped = false;
  const check = async (force = false) => {
    if (stopped || pending || document.visibilityState === "hidden") return;
    const expiresAt = deadline();
    if (expiresAt !== null && Date.now() >= expiresAt) {
      expire();
      return;
    }
    if (!force && (!active || Date.now() - lastCheck < 30_000)) return;
    active = false;
    lastCheck = Date.now();
    pending = true;
    try { await validate(); } finally { pending = false; }
  };
  const activity = () => { active = true; void check(); };
  const focus = () => { void check(true); };
  const timer = window.setInterval(() => {
    const expiresAt = deadline();
    if (expiresAt !== null && Date.now() >= expiresAt) expire();
    else void check();
  }, 1_000);
  const events = ["pointerdown", "keydown", "scroll"];
  for (const event of events) window.addEventListener(event, activity, { passive: true });
  window.addEventListener("focus", focus);
  window.addEventListener("pageshow", focus);
  document.addEventListener("visibilitychange", focus);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    for (const event of events) window.removeEventListener(event, activity);
    window.removeEventListener("focus", focus);
    window.removeEventListener("pageshow", focus);
    document.removeEventListener("visibilitychange", focus);
  };
}
