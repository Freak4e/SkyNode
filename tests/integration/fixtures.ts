import { readFileSync } from "node:fs";
import path from "node:path";

export function readJsonFixture<T>(relativePath: string): T {
  const filePath = path.join(process.cwd(), "tests", "fixtures", relativePath);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function readTextFixture(relativePath: string): string {
  const filePath = path.join(process.cwd(), "tests", "fixtures", relativePath);
  return readFileSync(filePath, "utf8");
}
