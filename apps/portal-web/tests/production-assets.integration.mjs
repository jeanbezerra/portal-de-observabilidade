import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { readdir } from "node:fs/promises";
import { createServer as createSocketServer } from "node:net";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { verifyAssets } from "../scripts/verify-assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function clientAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith(".") ? [] : clientAssets(path);
    return /\.(js|css|svg|ico|woff2|webp)$/.test(entry.name) ? [path] : [];
  }));
  return results.flat();
}

test("the production server serves every generated asset, including logos, icons and fonts", { timeout: 20_000 }, async (t) => {
  const identity = createServer((_, response) => {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end("{}");
  });
  identity.listen(0, "127.0.0.1");
  await once(identity, "listening");
  t.after(() => new Promise((done) => {
    identity.closeAllConnections();
    identity.close(done);
  }));

  const reservation = createSocketServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((done) => reservation.close(done));

  const child = spawn(process.execPath, [
    join(root, "node_modules/@react-router/serve/bin.cjs"), "build/server/index.js",
  ], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port),
      IDENTITY_ACCESS_SERVICE_URL: `http://127.0.0.1:${identity.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  t.after(async () => {
    if (child.exitCode !== null) return;
    const closed = once(child, "close");
    child.kill();
    await Promise.race([closed, delay(2_000)]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await closed;
    }
  });

  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Production server exited:\n${output}`);
    try {
      const response = await fetch(origin + "/health", { signal: AbortSignal.timeout(500) });
      if (response.status === 204) { ready = true; break; }
    } catch { /* Wait for the production process to bind its port. */ }
    await delay(50);
  }
  assert.ok(ready, `Production server did not become ready:\n${output}`);
  const loginHtml = await (await fetch(origin + "/entrar")).text();
  assert.match(loginHtml, /<form\b[^>]*\bmethod="post"/i,
    "A missing JavaScript asset must not turn credential submission into a GET query");
  const clientRoot = join(root, "build/client");
  const paths = (await clientAssets(clientRoot))
    .map((path) => "/" + relative(clientRoot, path).split(sep).join("/"));
  const count = await verifyAssets(origin, paths);
  assert.ok(count >= paths.length);
  t.diagnostic(`${count} production assets verified over HTTP`);
});
