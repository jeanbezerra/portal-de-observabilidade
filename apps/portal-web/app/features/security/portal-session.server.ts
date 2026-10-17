import { createContext, redirect, type MiddlewareFunction } from "react-router";
import { proxyIdentity } from "./identity-proxy.server.ts";
import { documentPath, loginPath } from "./session-navigation.ts";
import type { Identity } from "./security-model";

export const portalIdentityContext = createContext<Identity>();

export async function readPortalIdentity(request: Request) {
  const url = new URL("/api/identity/api/v1/me", request.url);
  const headers = new Headers({ Accept: "application/json" });
  const cookie = request.headers.get("Cookie");
  if (cookie) headers.set("Cookie", cookie);
  return proxyIdentity(new Request(url, { headers }), "api/v1/me");
}

export const requirePortalSession: MiddlewareFunction<Response> = async (
  { request, context }, next,
) => {
  const session = await readPortalIdentity(request);
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Cookie" });
  for (const cookie of session.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  if (session.status === 401) {
    throw redirect(loginPath(documentPath(request.url)), { status: 302, headers });
  }
  if (!session.ok) {
    throw new Response("Não foi possível validar sua sessão. Tente novamente.", {
      status: 503, headers,
    });
  }
  context.set(portalIdentityContext, await session.json() as Identity);
  const response = await next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.append("Vary", "Cookie");
  for (const cookie of headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
  return response;
};
