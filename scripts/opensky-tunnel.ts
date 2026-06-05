import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const PROXY_PORT = process.env.OPENSKY_PROXY_PORT || "8787";
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;

function resolveCloudflaredPath(): string {
  const candidates = [
    process.env.CLOUDFLARED_PATH?.trim(),
    process.platform === "win32" ? "C:\\Cloudflared\\cloudflared.exe" : undefined,
    "cloudflared",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate === "cloudflared") {
      return candidate;
    }

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "cloudflared";
}

const cloudflared = resolveCloudflaredPath();

if (cloudflared !== "cloudflared" && !existsSync(cloudflared)) {
  console.error(`cloudflared not found at ${cloudflared}`);
  console.error("Set CLOUDFLARED_PATH in .env, e.g. CLOUDFLARED_PATH=C:\\Cloudflared\\cloudflared.exe");
  process.exit(1);
}

console.log(`Starting Cloudflare quick tunnel → ${PROXY_URL}`);
console.log(`Using: ${cloudflared}`);
console.log("Start the proxy first: npm run opensky:proxy");

const child = spawn(
  cloudflared,
  ["tunnel", "--url", PROXY_URL],
  { stdio: "inherit", shell: cloudflared === "cloudflared" },
);

child.on("error", (error) => {
  console.error(error.message);
  if (cloudflared === "cloudflared") {
    console.error("Install cloudflared or set CLOUDFLARED_PATH in .env (see README).");
  }
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
