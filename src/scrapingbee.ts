import axios, { AxiosError } from "axios";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { config, requireScrapingBeeApiKey } from "./config.js";

type FetchMeta = {
  targetUrl: string;
  fetchedAt: string;
  renderJs: boolean;
  waitMs: number;
  attempts: number;
  status?: number;
};

const debugDir = path.resolve(process.cwd(), "debug");

export function buildTargetUrl(from: string, to: string, date: string): string {
  // Prototype target: Kayak flight results page.
  const pathPart = `${encodeURIComponent(from)}-${encodeURIComponent(to)}/${encodeURIComponent(date)}`;
  return `https://www.kayak.com/flights/${pathPart}?sort=bestflight_a`;
}

export async function fetchWithScrapingBee(targetUrl: string): Promise<string> {
  const apiKey = requireScrapingBeeApiKey();
  let attempts = 0;
  let lastError: unknown;

  while (attempts < 2) {
    attempts += 1;

    try {
      console.log(`[scrapingbee] fetching target, attempt ${attempts}: ${targetUrl}`);

      const response = await axios.get<string>(config.scrapingBee.apiUrl, {
        timeout: config.scrapingBee.timeoutMs,
        responseType: "text",
        params: {
          api_key: apiKey,
          url: targetUrl,
          render_js: config.scrapingBee.renderJs ? "true" : "false",
          wait: config.scrapingBee.waitMs,
        },
      });

      await saveDebugFiles(response.data, {
        targetUrl,
        fetchedAt: new Date().toISOString(),
        renderJs: config.scrapingBee.renderJs,
        waitMs: config.scrapingBee.waitMs,
        attempts,
        status: response.status,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempts >= 2) {
        break;
      }

      console.warn(`[scrapingbee] retrying after ${describeError(error)}`);
    }
  }

  throw new Error(`ScrapingBee request failed after ${attempts} attempt(s): ${describeError(lastError)}`);
}

async function saveDebugFiles(html: string, meta: FetchMeta): Promise<void> {
  await mkdir(debugDir, { recursive: true });
  await writeFile(path.join(debugDir, "last-response.html"), html, "utf8");
  await writeFile(path.join(debugDir, "request-meta.json"), JSON.stringify(meta, null, 2), "utf8");
}

function shouldRetry(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return true;
  }

  const status = error.response?.status;
  return typeof status === "number" && status >= 500;
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return describeAxiosError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
}

function describeAxiosError(error: AxiosError): string {
  const status = error.response?.status ? `status ${error.response.status}` : "no status";
  return `${status}, ${error.code || "no code"}, ${error.message}`;
}
