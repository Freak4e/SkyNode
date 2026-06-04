import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.OPENSKY_PROXY_PORT || 8787);
const SECRET = process.env.OPENSKY_PROXY_SECRET?.trim() || "";
const OPENSKY_API_ORIGIN = "https://opensky-network.org";
const OPENSKY_AUTH_ORIGIN = "https://auth.opensky-network.org";

const FORWARD_REQUEST_HEADERS = ["accept", "authorization", "content-type"] as const;

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function resolveUpstreamTarget(pathname: string): string | null {
  if (pathname === "/health") {
    return null;
  }

  if (pathname.startsWith("/api/")) {
    return `${OPENSKY_API_ORIGIN}${pathname}`;
  }

  if (pathname.startsWith("/auth/")) {
    return `${OPENSKY_AUTH_ORIGIN}${pathname}`;
  }

  return null;
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!SECRET) {
    return true;
  }

  const header = req.headers["x-proxy-secret"];
  return typeof header === "string" && header === SECRET;
}

function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!req.url || !req.method) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad request" }));
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = normalizePathname(requestUrl.pathname);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "opensky-proxy" }));
    return;
  }

  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      service: "opensky-proxy",
      health: "/health",
      note: "OpenSky API paths require the x-proxy-secret header.",
    }));
    return;
  }

  if (!isAuthorized(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const upstreamPath = resolveUpstreamTarget(pathname);
  if (!upstreamPath) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use /api/* or /auth/* paths only." }));
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const upstreamUrl = new URL(upstreamPath);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") {
      headers.set(name, value);
    }
  }

  const body = await readRequestBody(req);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });

    const responseBody = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/json";

    res.writeHead(upstream.status, { "Content-Type": contentType });
    res.end(Buffer.from(responseBody));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream request failed";
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message }));
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    const message = error instanceof Error ? error.message : "Proxy error";
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    res.end(JSON.stringify({ error: message }));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OpenSky proxy listening on http://127.0.0.1:${PORT}`);
  console.log("Expose with: npm run opensky:tunnel");
  if (SECRET) {
    console.log("Proxy secret enabled (x-proxy-secret required).");
  } else {
    console.warn("OPENSKY_PROXY_SECRET is not set. Set it before exposing via Cloudflare Tunnel.");
  }
});
