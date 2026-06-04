export async function readApiJson<T>(
  response: Response,
  fallback: string,
  defaults?: Partial<T>,
): Promise<T & { warnings?: string[] }> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json() as T & { warnings?: string[] };
  }

  const text = await response.text().catch(() => "");
  return {
    ...defaults,
    warnings: [text ? text.slice(0, 180) : fallback],
  } as T & { warnings?: string[] };
}
