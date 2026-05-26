/** Parse clock time like "15:30", "3:45 PM", "18;00", optional "+1" next day. */
export function parseClockMinutes(value: string): number | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/(\d{1,2})[:;.](\d{2})\s*(AM|PM)?(?:\s*\+(\d+))?/i);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  const dayOffset = match[4] ? Number(match[4]) : 0;

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes + dayOffset * 24 * 60;
}

/** Parse total duration like "8h 15m", "8h15m", "1h 05m". */
export function parseDurationMinutes(text: string | undefined): number | null {
  if (!text) return null;

  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  const match = normalized.match(/(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?/i);

  if (!match || (!match[1] && !match[2])) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;

  if (hours === 0 && minutes === 0) return null;

  return hours * 60 + minutes;
}

/** Parse stop count from Kayak-style text. Ignores bare numbers from duration strings. */
export function parseStopsCount(text: string | undefined): number | null {
  const normalized = text?.replace(/\s+/g, " ").trim().toLowerCase() || "";

  if (!normalized) return null;
  if (/\b(?:non[- ]?stop|nonstop|direct)\b/.test(normalized)) return 0;

  const stopMatch = normalized.match(/(\d+)\s*\+?\s*stops?\b/);
  if (stopMatch) return Number(stopMatch[1]);

  if (/\b1\s*stop\b/.test(normalized)) return 1;
  if (/\b2\s*stops?\b/.test(normalized)) return 2;

  // "via MAD" / "through FRA" implies at least one stop
  if (/\b(?:via|through)\b/.test(normalized)) return 1;

  return null;
}

export function parseRouteFromKayakUrl(pageUrl: string): { from?: string; to?: string } {
  const match = pageUrl.match(/\/flights\/([A-Za-z]{3})-([A-Za-z]{3})\//i);

  if (!match) return {};

  return {
    from: match[1].toUpperCase(),
    to: match[2].toUpperCase(),
  };
}

export function estimateDurationMinutes(input: {
  durationMinutes?: number;
  durationText?: string;
  departureTime?: string;
  arrivalTime?: string;
  stopsCount?: number | null;
}): number {
  if (typeof input.durationMinutes === "number" && input.durationMinutes > 0) {
    return input.durationMinutes;
  }

  const fromDurationText = parseDurationMinutes(input.durationText);
  if (fromDurationText !== null) return fromDurationText;

  const departure = parseClockMinutes(input.departureTime || "");
  const arrival = parseClockMinutes(input.arrivalTime || "");

  if (departure !== null && arrival !== null) {
    let diff = arrival - departure;
    if (diff <= 0) diff += 24 * 60;
    return Math.max(30, diff);
  }

  if (typeof input.stopsCount === "number") {
    return 90 + input.stopsCount * 120;
  }

  return 0;
}

export function resolveStopsCount(offer: {
  stopsText?: string;
  layovers?: unknown[];
  segments?: unknown[];
}): number | null {
  const segmentCount = offer.segments?.length ?? 0;
  if (segmentCount > 1) return segmentCount - 1;

  const fromText = parseStopsCount(offer.stopsText);
  const layoverCount = offer.layovers?.length ?? 0;

  if (layoverCount > 0) {
    return Math.max(layoverCount, fromText ?? 0);
  }

  return fromText;
}
