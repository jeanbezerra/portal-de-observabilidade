import { test } from "node:test";
import assert from "node:assert/strict";
import { proxyIdentity } from "../app/features/security/identity-proxy.server.ts";

const request = (method = "GET", headers = {}, body) =>
  new Request("http://portal.test/api/identity/api/v1/security/users", {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
  });
test("forwards session and CSRF headers without trusting client forwarding or authorization headers", async (t) => {
  let captured;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    captured = { url, init };
    return new Response("[]", {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "OBS_SESSION=new; HttpOnly; Path=/",
      },
    });
  });
  const response = await proxyIdentity(
    request(
      "POST",
      {
        Cookie: "OBS_SESSION=old",
        "X-CSRF-TOKEN": "token",
        Origin: "http://portal.test",
        Authorization: "Bearer untrusted",
        "X-Forwarded-Host": "attacker.test",
      },
      "{}",
    ),
    "api/v1/security/users",
    "http://identity.internal:8083",
  );
  assert.equal(response.status, 200);
  assert.equal(
    captured.url.href,
    "http://identity.internal:8083/api/v1/security/users",
  );
  assert.equal(captured.init.headers.get("Cookie"), "OBS_SESSION=old");
  assert.equal(captured.init.headers.get("X-CSRF-TOKEN"), "token");
  assert.equal(captured.init.headers.get("Authorization"), null);
  assert.equal(captured.init.headers.get("X-Forwarded-Host"), "portal.test");
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("rejects cross-origin changes before contacting the identity service", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected");
  });
  assert.equal(
    (
      await proxyIdentity(
        request("POST", { Origin: "https://attacker.test" }, "{}"),
        "api/v1/security/users",
      )
    ).status,
    403,
  );
  assert.equal(fetch.mock.callCount(), 0);
});
test("does not expose arbitrary upstream endpoints or traversal paths", async () => {
  for (const path of [
    "actuator/env",
    "api/v1/../security/users",
    "api/v1/security/%2e%2e",
    "api/v1/security/users/../../secrets",
  ]) {
    assert.equal((await proxyIdentity(request(), path)).status, 404);
  }
  assert.equal(
    (await proxyIdentity(request("PATCH"), "api/v1/security/users")).status,
    405,
  );
});
test("rewrites identity redirects and preserves protocol-validated SAML callback support", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(null, {
        status: 302,
        headers: { Location: "/saml2/authenticate/entra" },
      }),
  );
  assert.equal(
    (
      await proxyIdentity(
        request(),
        "api/v1/auth/login/entra",
        "http://identity.internal:8083",
      )
    ).headers.get("Location"),
    "/api/identity/saml2/authenticate/entra",
  );
  assert.equal(
    (
      await proxyIdentity(
        request(
          "POST",
          { Origin: "https://login.microsoftonline.com" },
          "SAMLResponse=sample",
        ),
        "login/saml2/sso/entra",
        "http://identity.internal:8083",
      )
    ).status,
    302,
  );
});
test("limits request bodies and does not disclose upstream failure details", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("private-internal-host-and-secret");
  });
  const response = await proxyIdentity(
    request(),
    "api/v1/security/users",
    "http://identity.internal:8083",
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private|secret|internal-host/);
  const tooLarge = await proxyIdentity(
    request("POST", {}, "a".repeat(1024 * 1024 + 1)),
    "api/v1/security/users",
  );
  assert.equal(tooLarge.status, 413);
});

test("returns to the portal after SAML login instead of redirecting into the API proxy", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, {
    status: 302, headers: { Location: "/" },
  }));
  const response = await proxyIdentity(request("POST", {}, "SAMLResponse=sample"),
    "login/saml2/sso/entra", "http://identity.internal:8083");
  assert.equal(response.headers.get("Location"), "/");
});
