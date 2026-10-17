export function safeReturnPath(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value))
    return fallback;
  try {
    const url = new URL(value, "http://portal.invalid");
    const decoded = decodeURIComponent(url.pathname);
    if (
      url.origin !== "http://portal.invalid" ||
      decoded.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decoded) ||
      /^\/(entrar|api)(\/|$)/i.test(decoded) ||
      decoded.endsWith(".data")
    ) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function loginPath(returnPath: string, reason?: "expirada" | "encerrada") {
  const search = new URLSearchParams({ retorno: safeReturnPath(returnPath) });
  if (reason) search.set("sessao", reason);
  return "/entrar?" + search;
}

export function documentPath(requestUrl: string) {
  const url = new URL(requestUrl);
  url.pathname = url.pathname.replace(/\.data$/, "");
  url.searchParams.delete("_routes");
  return safeReturnPath(url.pathname + url.search);
}
