import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const requiredAssets = [
  "/porto.svg",
  "/favicon.ico",
  "/icons/dynatrace.svg",
  "/icons/datadog.svg",
  "/icons/stackopen.svg",
  "/fonts/open-sans-latin-variable.woff2",
  "/fonts/porto-roobert-variable.woff2",
  "/images/login-porto.webp",
];

const contentTypes = {
  svg: /^image\/svg\+xml\b/i,
  ico: /^image\/(?:x-icon|vnd\.microsoft\.icon)\b/i,
  woff2: /^font\/woff2\b/i,
  css: /^text\/css\b/i,
  js: /^(?:application|text)\/javascript\b/i,
  webp: /^image\/webp\b/i,
};

export async function verifyAssets(baseUrl, additionalPaths = []) {
  const origin = new URL(baseUrl);
  const page = await fetch(new URL("/entrar", origin), {
    redirect: "manual", signal: AbortSignal.timeout(10_000),
  });
  if (page.status !== 200) throw new Error(`Login page: HTTP ${page.status}`);
  const html = await page.text();
  const linkedAssets = [...html.matchAll(/(?:src|href)="(\/(?:assets|fonts|images)\/[^" ]+)"/g)]
    .map((match) => match[1]);
  if (!linkedAssets.some((path) => path.endsWith(".js")) ||
      !linkedAssets.some((path) => path.endsWith(".css"))) {
    throw new Error("Login page does not reference its JavaScript and CSS assets");
  }
  const paths = [...new Set([...requiredAssets, ...linkedAssets, ...additionalPaths])];
  const failures = [];
  for (let offset = 0; offset < paths.length; offset += 8) {
    await Promise.all(paths.slice(offset, offset + 8).map(async (path) => {
      try {
        const response = await fetch(new URL(path, origin), {
          redirect: "manual", signal: AbortSignal.timeout(10_000),
        });
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
        const extension = path.split(".").at(-1);
        const expectedType = contentTypes[extension];
        const actualType = response.headers.get("Content-Type") ?? "";
        if (!expectedType || !expectedType.test(actualType))
          throw new Error(`invalid content type: ${actualType}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (extension === "webp" && (bytes.subarray(0, 4).toString() !== "RIFF" || bytes.subarray(8, 12).toString() !== "WEBP"))
          throw new Error("invalid WebP body");
        if (extension === "svg" && !bytes.toString("utf8").includes("<svg"))
          throw new Error("invalid SVG body");
        if (extension === "woff2" && bytes.subarray(0, 4).toString() !== "wOF2")
          throw new Error("invalid WOFF2 body");
        if (extension === "ico" && !bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])))
          throw new Error("invalid ICO body");
      } catch (error) {
        failures.push(`${path}: ${error.message}`);
      }
    }));
  }
  if (failures.length) throw new Error("Static asset verification failed:\n" + failures.join("\n"));
  return paths.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const count = await verifyAssets(process.argv[2] ?? "http://127.0.0.1:3000");
    console.log(`${count} static assets verified: HTTP 200, content types and image/font signatures valid`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
