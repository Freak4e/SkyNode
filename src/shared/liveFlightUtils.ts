import type { LiveFlight } from "./types.js";

const ICAO_AIRLINE_NAMES: Record<string, string> = {
  AAL: "American Airlines",
  AFR: "Air France",
  AUA: "Austrian Airlines",
  BAW: "British Airways",
  BER: "Air Berlin",
  CFG: "Condor",
  CPA: "Cathay Pacific",
  DAL: "Delta Air Lines",
  DLH: "Lufthansa",
  EIN: "Aer Lingus",
  ELY: "El Al",
  ETD: "Etihad Airways",
  EZY: "easyJet",
  FIN: "Finnair",
  GWI: "Germanwings",
  IBE: "Iberia",
  ICE: "Icelandair",
  JAL: "Japan Airlines",
  JBU: "JetBlue",
  KLM: "KLM",
  LGL: "Luxair",
  LOT: "LOT Polish Airlines",
  NAX: "Norwegian",
  QFA: "Qantas",
  QTR: "Qatar Airways",
  RYR: "Ryanair",
  SAS: "Scandinavian Airlines",
  SIA: "Singapore Airlines",
  SWA: "Southwest Airlines",
  TAP: "TAP Air Portugal",
  THY: "Turkish Airlines",
  TVF: "Transavia France",
  UAE: "Emirates",
  UAL: "United Airlines",
  VIR: "Virgin Atlantic",
  VLG: "Vueling",
  WZZ: "Wizz Air",
};

export function airlineFromCallsign(callsign: string, originCountry: string): string {
  const normalized = callsign.replace(/\s/g, "").toUpperCase();
  const prefix = normalized.match(/^[A-Z]{3}/)?.[0];

  if (prefix && ICAO_AIRLINE_NAMES[prefix]) {
    return ICAO_AIRLINE_NAMES[prefix];
  }

  if (prefix && /^[A-Z]{3}$/.test(prefix)) {
    return prefix;
  }

  return originCountry ? `${originCountry} operator` : "Unknown operator";
}

export function flightStatusFromTelemetry(
  onGround: boolean,
  verticalRate: number | null | undefined,
): LiveFlight["status"] {
  if (onGround) return "On ground";
  if (typeof verticalRate === "number" && verticalRate > 1.5) return "Climbing";
  if (typeof verticalRate === "number" && verticalRate < -1.5) return "Descending";
  return "Cruising";
}

export function formatAltitude(meters: number | undefined): string {
  if (typeof meters !== "number") return "—";
  const feet = Math.round(meters * 3.28084);
  return `${meters.toLocaleString()} m · FL${Math.round(feet / 100)}`;
}

export function formatSpeed(kmh: number | undefined): string {
  if (typeof kmh !== "number") return "—";
  return `${kmh.toLocaleString()} km/h`;
}

export function formatHeading(degrees: number | undefined): string {
  if (typeof degrees !== "number") return "—";
  return `${degrees}°`;
}

export function diversifyFlightsByRegion(flights: LiveFlight[], limit: number): LiveFlight[] {
  if (flights.length <= limit) {
    return flights;
  }

  const buckets = new Map<string, LiveFlight[]>();

  for (const flight of flights) {
    const latBucket = Math.floor(flight.lat / 12);
    const lonBucket = Math.floor(flight.lon / 12);
    const key = `${latBucket}:${lonBucket}`;
    const bucket = buckets.get(key) || [];
    bucket.push(flight);
    buckets.set(key, bucket);
  }

  const result: LiveFlight[] = [];
  const bucketLists = [...buckets.values()];

  while (result.length < limit && bucketLists.some((bucket) => bucket.length > 0)) {
    for (const bucket of bucketLists) {
      const next = bucket.shift();
      if (next && result.length < limit) {
        result.push(next);
      }
    }
  }

  return result;
}
