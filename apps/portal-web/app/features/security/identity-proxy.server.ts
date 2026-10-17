const routes: [RegExp, string[]][] = [
  [/^api\/v1\/auth\/providers$/, ["GET"]],
  [/^api\/v1\/auth\/csrf$/, ["GET"]],
  [/^api\/v1\/auth\/logout$/, ["POST"]],
  [/^api\/v1\/auth\/login\/[A-Za-z0-9_-]+$/, ["GET", "POST"]],
  [/^api\/v1\/me$/, ["GET"]],
  [/^api\/v1\/me\/password$/, ["POST"]],
  [/^api\/v1\/providers(?:\/[A-Za-z0-9_-]+)?$/, ["GET", "POST", "PUT"]],
  [/^api\/v1\/providers\/[A-Za-z0-9_-]+\/(validate|enable|disable)$/, ["POST"]],
  [
    /^api\/v1\/security\/(users|roles|permissions|groups|group-mappings)$/,
    ["GET", "POST"],
  ],
  [
    /^api\/v1\/security\/(users|roles|permissions|groups|group-mappings)\/[A-Za-z0-9_:@.-]+$/,
    ["PUT", "DELETE"],
  ],
  [/^api\/v1\/security\/users\/[A-Za-z0-9_-]+\/password$/, ["POST"]],
  [/^api\/v1\/security\/(audit|sessions)$/, ["GET"]],
  [/^api\/v1\/security\/audit\/export$/, ["POST"]],
  [/^api\/v1\/security\/sessions\/overview$/, ["GET"]],
  [/^api\/v1\/security\/sessions\/revoke$/, ["POST"]],
  [/^api\/v1\/security\/sessions\/[a-f0-9]{64}$/, ["DELETE"]],
  [
    /^saml2\/(authenticate|service-provider-metadata)\/[A-Za-z0-9_-]+$/,
    ["GET"],
  ],
  [/^login\/saml2\/sso\/[A-Za-z0-9_-]+$/, ["POST"]],
];
function problem(status: number, detail: string) {
  return Response.json(
    { detail },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
async function limitedBody(request: Request) {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw new Error("body-too-large");
    }
    parts.push(chunk.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  return body;
}
export async function proxyIdentity(
  request: Request,
  path: string,
  configuredUrl?: string,
) {
  if (
    path
      .split("/")
      .some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          /[\\%?#]/.test(segment),
      )
  )
    return problem(404, "Rota não encontrada.");
  const route = routes.find(([pattern]) => pattern.test(path));
  if (!route) return problem(404, "Rota não encontrada.");
  if (!route[1].includes(request.method))
    return problem(405, "Método não permitido.");
  const incoming = new URL(request.url);
  // SAML POST binding is validated by the identity service; other mutations require same-origin plus CSRF.
  const samlCallback = path.startsWith("login/saml2/sso/");
  if (!samlCallback && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if (
      (origin && origin !== incoming.origin) ||
      request.headers.get("Sec-Fetch-Site") === "cross-site"
    )
      return problem(403, "Origem da solicitação não permitida.");
  }
  let target: URL;
  try {
    target = new URL(
      configuredUrl ??
        process.env.IDENTITY_ACCESS_SERVICE_URL ??
        "http://127.0.0.1:8083",
    );
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password
    )
      throw new Error();
  } catch {
    return problem(503, "O serviço de segurança não está configurado.");
  }
  const upstreamOrigin = target.origin;
  target.pathname = "/" + path;
  target.search = incoming.search;
  const headers = new Headers();
  for (const name of [
    "Accept",
    "Content-Type",
    "Cookie",
    "X-CSRF-TOKEN",
    "X-XSRF-TOKEN",
    "Traceparent",
    "User-Agent",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Forwarded-Host", incoming.host);
  headers.set("X-Forwarded-Proto", incoming.protocol.slice(0, -1));
  headers.set("X-Forwarded-Prefix", "/api/identity");
  let body: Uint8Array | undefined;
  try {
    if (!["GET", "HEAD"].includes(request.method))
      body = await limitedBody(request);
  } catch {
    return problem(413, "A solicitação excede o tamanho permitido.");
  }
  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: body as BodyInit | undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(
        path === "api/v1/security/audit/export" ? 60_000 : 20_000,
      ),
    });
  } catch {
    return problem(
      503,
      "O serviço de segurança está indisponível. Tente novamente.",
    );
  }
  const outgoing = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of [
    "Content-Type",
    "WWW-Authenticate",
    "Content-Disposition",
    "X-Audit-Export-Id",
    "X-Audit-Dataset-SHA256",
    "X-Audit-Record-Count",
  ]) {
    const value = response.headers.get(name);
    if (value) outgoing.set(name, value);
  }
  for (const cookie of response.headers.getSetCookie())
    outgoing.append("Set-Cookie", cookie);
  const location = response.headers.get("Location");
  if (location) {
    const destination = new URL(location, upstreamOrigin);
    if (
      path.startsWith("login/saml2/sso/") &&
      ["/", "/api/identity/"].includes(destination.pathname) &&
      [upstreamOrigin, incoming.origin].includes(destination.origin)
    ) {
      outgoing.set("Location", "/");
    } else if (destination.origin === upstreamOrigin) {
      outgoing.set(
        "Location",
        "/api/identity" + destination.pathname + destination.search,
      );
    } else if (
      location.startsWith("/saml2/") ||
      location.startsWith("/login/saml2/")
    ) {
      outgoing.set("Location", "/api/identity" + location);
    } else outgoing.set("Location", location);
  }
  return new Response(response.body, {
    status: response.status,
    headers: outgoing,
  });
}
