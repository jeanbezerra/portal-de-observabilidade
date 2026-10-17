import type { Identity, DiscoveredProvider } from "./security-model";

export class IdentityServiceError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "IdentityServiceError";
    this.status = status;
  }
}
const base = "/api/identity/api/v1";
export async function identityResponse(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await identityRequest<{ headerName: string; token: string }>(
      "/auth/csrf",
    );
    headers[csrf.headerName] = csrf.token;
  }
  let response: Response;
  try {
    response = await fetch(base + path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new IdentityServiceError(
      "Não foi possível conectar ao serviço de segurança. Tente novamente.",
      0,
    );
  }
  if (!response.ok) {
    if (
      typeof window !== "undefined" &&
      (response.status === 401 || response.status === 403)
    ) {
      window.dispatchEvent(
        new CustomEvent("identity-access-response", {
          detail: response.status,
        }),
      );
    }
    const problem = (await response.json().catch(() => ({}))) as {
      detail?: string;
      violations?: string[];
    };
    const message =
      response.status === 401
        ? path.startsWith("/auth/login/")
          ? "Usuário ou senha inválidos, ou conta temporariamente bloqueada."
          : "Entre novamente para continuar."
        : response.status === 403
          ? "Você não tem permissão para esta operação. Se sua sessão expirou, entre novamente."
          : problem.violations?.join(" · ") ||
            problem.detail ||
            "Não foi possível concluir a operação.";
    throw new IdentityServiceError(message, response.status);
  }
  return response;
}
export async function identityRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await identityResponse(path, method, body);
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
export const currentIdentity = () => identityRequest<Identity>("/me");
export const discoverProviders = () =>
  identityRequest<DiscoveredProvider[]>("/auth/providers");
export const login = (provider: string, username: string, credential: string) =>
  identityRequest<void>("/auth/login/" + encodeURIComponent(provider), "POST", {
    username,
    credential,
  });
export const logout = () => identityRequest<void>("/auth/logout", "POST");
export const securityRequest = <T>(
  path: string,
  method = "GET",
  body?: unknown,
) => identityRequest<T>("/security" + path, method, body);
export function errorMessage(error: unknown) {
  return error instanceof IdentityServiceError
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente.";
}
