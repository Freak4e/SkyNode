/** Parse clock time like "15:30", "3:45 PM", "18;00", optional "+1" next day. */
export function parseClockMinutes(value: string): number | null {
  const parsed = parseClockParts(normalizeSpaces(value));

  if (!parsed) return null;

  let { hours } = parsed;

  if (parsed.meridiem === "PM" && hours < 12) hours += 12;
  if (parsed.meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + parsed.minutes + parsed.dayOffset * 24 * 60;
}

/** Parse total duration like "8h 15m", "8h15m", "1h 05m". */
export function parseDurationMinutes(text: string | undefined): number | null {
  if (!text) return null;

  const { hours, minutes } = parseDurationParts(normalizeSpaces(text).toLowerCase());

  if (hours === 0 && minutes === 0) return null;

  return hours * 60 + minutes;
}

/** Parse stop count from Kayak-style text. Ignores bare numbers from duration strings. */
export function parseStopsCount(text: string | undefined): number | null {
  const normalized = normalizeSpaces(text || "").toLowerCase();

  if (!normalized) return null;
  if (hasDirectStopText(normalized)) return 0;

  const parsedStops = parseNumericStopCount(normalized);
  if (parsedStops !== null) return parsedStops;

  if (containsWord(normalized, "via") || containsWord(normalized, "through")) return 1;

  return null;
}

function normalizeSpaces(value: string): string {
  let normalized = "";
  let previousWasSpace = true;

  for (const character of value) {
    if (character === " " || character === "\t" || character === "\n" || character === "\r") {
      if (!previousWasSpace) {
        normalized += " ";
      }
      previousWasSpace = true;
    } else {
      normalized += character;
      previousWasSpace = false;
    }
  }

  return normalized.trim();
}

function parseClockParts(value: string): { hours: number; minutes: number; meridiem?: "AM" | "PM"; dayOffset: number } | null {
  const separatorIndex = firstClockSeparatorIndex(value);
  if (separatorIndex <= 0) return null;

  const hoursText = value.slice(0, separatorIndex);
  const minutesText = value.slice(separatorIndex + 1, separatorIndex + 3);
  if (!isDigits(hoursText) || minutesText.length !== 2 || !isDigits(minutesText)) return null;

  const rest = value.slice(separatorIndex + 3).trim();
  const { dayOffset, meridiem } = parseClockSuffix(rest);

  return {
    hours: Number(hoursText),
    minutes: Number(minutesText),
    meridiem,
    dayOffset,
  };
}

function firstClockSeparatorIndex(value: string): number {
  return [value.indexOf(":"), value.indexOf(";"), value.indexOf(".")]
    .filter((index) => index >= 0)
    .sort((first, second) => first - second)[0] ?? -1;
}

function parseClockSuffix(value: string): { dayOffset: number; meridiem?: "AM" | "PM" } {
  const parts = value.split(" ").filter(Boolean);
  let dayOffset = 0;
  let meridiem: "AM" | "PM" | undefined;

  for (const part of parts) {
    const normalized = part.toUpperCase().replaceAll(".", "");
    if (normalized === "AM" || normalized === "PM") {
      meridiem = normalized;
    } else if (normalized.startsWith("+") && isDigits(normalized.slice(1))) {
      dayOffset = Number(normalized.slice(1));
    }
  }

  return { dayOffset, meridiem };
}

function parseDurationParts(value: string): { hours: number; minutes: number } {
  let hours = 0;
  let minutes = 0;
  let index = 0;

  while (index < value.length) {
    if (!isDigit(value[index])) {
      index += 1;
      continue;
    }

    const start = index;
    while (index < value.length && isDigit(value[index])) index += 1;

    const amount = Number(value.slice(start, index));
    while (value[index] === " ") index += 1;

    if (value.startsWith("hour", index) || value[index] === "h") {
      hours = amount;
    } else if (value.startsWith("min", index) || value[index] === "m") {
      minutes = amount;
    }
  }

  return { hours, minutes };
}

function hasDirectStopText(value: string): boolean {
  return containsWord(value, "nonstop")
    || containsWord(value, "direct")
    || value.includes("non-stop")
    || value.includes("non stop");
}

function parseNumericStopCount(value: string): number | null {
  for (let index = 0; index < value.length; index += 1) {
    if (!isDigit(value[index])) {
      continue;
    }

    const start = index;
    while (index < value.length && isDigit(value[index])) index += 1;

    const amount = Number(value.slice(start, index));
    while (value[index] === " " || value[index] === "+") index += 1;

    if (value.startsWith("stop", index)) {
      return amount;
    }
  }

  return null;
}

function containsWord(value: string, word: string): boolean {
  return value.split(" ").includes(word);
}

function isDigits(value: string): boolean {
  return value.length > 0 && [...value].every(isDigit);
}

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
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
