import { createHash } from "crypto";
import { query } from "../database/client.js";
import { ensureSchema } from "../database/schema.js";
import type { FlightSearchResponse } from "../../../shared/types.js";

type CacheInput = {
  provider: "scrapingbee";
  from: string;
  to: string;
  date: string;
};

type FlightSearchCacheRow = {
  response: FlightSearchResponse;
  cached_at: Date | string;
  expires_at: Date | string;
};

export async function readCachedFlightSearch(
  input: CacheInput,
  ttlMs: number,
): Promise<FlightSearchResponse | null> {
  if (ttlMs <= 0) {
    return null;
  }

  try {
    await ensureSchema();

    const result = await query<FlightSearchCacheRow>(
      `
        select response, cached_at, expires_at
        from flight_search_cache
        where cache_key = $1
          and expires_at > now()
        limit 1
      `,
      [cacheKey(input)],
    );
    const cached = result.rows[0];

    if (!cached) {
      return null;
    }

    return {
      ...cached.response,
      cache: {
        hit: true,
        cachedAt: toIsoString(cached.cached_at),
        expiresAt: toIsoString(cached.expires_at),
      },
    };
  } catch (error) {
    console.warn(`[cache:flights] failed to read ${input.from}-${input.to} on ${input.date}`, error);
    return null;
  }
}

export async function writeCachedFlightSearch(
  input: CacheInput,
  response: FlightSearchResponse,
  ttlMs: number,
): Promise<void> {
  if (ttlMs <= 0 || response.offers.length === 0) {
    return;
  }

  try {
    await ensureSchema();

    const { cache, ...responseToCache } = response;
    const cachedAt = new Date();
    const expiresAt = new Date(cachedAt.getTime() + ttlMs);

    await query(
      `
        insert into flight_search_cache (
          cache_key,
          provider,
          from_code,
          to_code,
          depart_date,
          response,
          cached_at,
          expires_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
        on conflict (cache_key) do update set
          response = excluded.response,
          cached_at = excluded.cached_at,
          expires_at = excluded.expires_at
      `,
      [
        cacheKey(input),
        input.provider,
        input.from.trim().toUpperCase(),
        input.to.trim().toUpperCase(),
        input.date.trim(),
        JSON.stringify(responseToCache),
        cachedAt,
        expiresAt,
      ],
    );
  } catch (error) {
    console.warn(`[cache:flights] failed to write ${input.from}-${input.to} on ${input.date}`, error);
  }
}

function cacheKey(input: CacheInput): string {
  const key = [
    "v1",
    input.provider,
    input.from.trim().toUpperCase(),
    input.to.trim().toUpperCase(),
    input.date.trim(),
  ].join("|");

  return createHash("sha256").update(key).digest("hex");
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
