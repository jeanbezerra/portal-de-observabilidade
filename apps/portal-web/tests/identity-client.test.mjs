import { test } from "node:test";
import assert from "node:assert/strict";
import {
  identityRequest,
  IdentityServiceError,
} from "../app/features/security/identity-client.ts";
test("obtains a CSRF token before changing data and keeps session cookies in the browser", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return calls.length === 1
      ? Response.json({ headerName: "X-XSRF-TOKEN", token: "csrf-value" })
      : new Response(null, { status: 204 });
  });
  await identityRequest("/security/users/user-1/password", "POST", {
    password: "test-only-password",
  });
  assert.equal(calls[0].url, "/api/identity/api/v1/auth/csrf");
  assert.equal(calls[1].init.headers["X-XSRF-TOKEN"], "csrf-value");
  assert.equal(calls[1].init.credentials, "same-origin");
  assert.equal(calls[1].init.headers.Authorization, undefined);
});
test("does not silently retry a denied mutation", async (t) => {
  let count = 0;
  t.mock.method(globalThis, "fetch", async () =>
    ++count === 1
      ? Response.json({ headerName: "X-CSRF-TOKEN", token: "csrf" })
      : Response.json({ detail: "denied" }, { status: 403 }),
  );
  await assert.rejects(
    identityRequest("/security/groups", "POST", {}),
    (error) => error instanceof IdentityServiceError && error.status === 403,
  );
  assert.equal(count, 2);
});
test("preserves field validation details without exposing transport exceptions", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ violations: ["Identificador inválido"] }, { status: 422 }),
  );
  await assert.rejects(identityRequest("/providers"), /Identificador inválido/);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("internal-dns-secret");
  });
  await assert.rejects(
    identityRequest("/me"),
    (error) =>
      !error.message.includes("internal-dns-secret") && error.status === 0,
  );
});
