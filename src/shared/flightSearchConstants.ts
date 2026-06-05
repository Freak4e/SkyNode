export const ANY_ORIGIN_CODE = "ANY";

export const ANY_ORIGIN_HUBS = [
  "NYC",
  "LON",
  "PAR",
  "BER",
  "DXB",
  "TYO",
  "LIS",
  "BCN",
  "AMS",
  "MIL",
] as const;

export function expandOriginCodes(codes: string[]): string[] {
  const normalized = codes
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .filter((code, index, all) => all.indexOf(code) === index);

  if (!normalized.includes(ANY_ORIGIN_CODE)) {
    return normalized;
  }

  const withoutAny = normalized.filter((code) => code !== ANY_ORIGIN_CODE);
  if (withoutAny.length > 0) {
    return withoutAny;
  }

  return [...ANY_ORIGIN_HUBS];
}
