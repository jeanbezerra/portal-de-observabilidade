import { test } from "node:test";
import assert from "node:assert/strict";
import { RouterContextProvider } from "react-router";
import { requirePortalSession, portalIdentityContext } from "../app/features/security/portal-session.server.ts";
import { documentPath, loginPath, safeReturnPath } from "../app/features/security/session-navigation.ts";

test("redirects unauthenticated documents and data requests before running a protected handler", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, {
    status: 401, headers: { "Set-Cookie": "OBS_SESSION=; Max-Age=0; Path=/; HttpOnly" },
  }));
  for (const path of ["/orcamentos?filtro=meus", "/orcamentos.data?filtro=meus&_routes=routes/home"]) {
    let called = false;
    await assert.rejects(requirePortalSession({
      request: new Request("http://portal.test" + path), context: new RouterContextProvider(), params: {},
    }, async () => { called = true; return new Response("private"); }), (response) => {
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("Location"), "/entrar?retorno=%2Forcamentos%3Ffiltro%3Dmeus");
      assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      return true;
    });
    assert.equal(called, false);
  }
});

test("validates the HTTP-only cookie with the API and provides identity before protected loaders run", async (t) => {
  const identity = { subject: "user-1", username: "user", authorities: ["job:read"] };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url.pathname, "/api/v1/me");
    assert.equal(url.search, "");
    assert.equal(init.headers.get("Cookie"), "OBS_SESSION=opaque");
    return Response.json(identity, { headers: { "Set-Cookie": "OBS_SESSION=rotated; Path=/; HttpOnly" } });
  });
  const context = new RouterContextProvider();
  const response = await requirePortalSession({
    request: new Request("http://portal.test/seguranca?filtro=users", { headers: { Cookie: "OBS_SESSION=opaque" } }),
    context, params: {},
  }, async () => {
    assert.deepEqual(context.get(portalIdentityContext), identity);
    return new Response("protected");
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Vary"), "Cookie");
  assert.match(response.headers.get("Set-Cookie"), /rotated/);
});

test("fails closed on identity API failure without entering a redirect loop", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("private-host"); });
  await assert.rejects(requirePortalSession({
    request: new Request("http://portal.test/"), context: new RouterContextProvider(), params: {},
  }, async () => { throw new Error("protected handler must not run"); }), (response) => {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Location"), null);
    return true;
  });
});

test("return destinations stay within portal documents and preserve the original query", () => {
  for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/%5cevil", "/entrar", "/api/identity", "/x.data", "/bad\nheader", "/%ZZ"]) {
    assert.equal(safeReturnPath(path), "/", path);
  }
  assert.equal(safeReturnPath("/administracao/agendamentos?pagina=2#item"), "/administracao/agendamentos?pagina=2#item");
  assert.equal(documentPath("http://portal.test/seguranca.data?_routes=x&tab=1"), "/seguranca?tab=1");
  assert.match(loginPath("/orcamentos", "expirada"), /sessao=expirada/);
});
