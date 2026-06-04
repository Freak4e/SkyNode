import * as cheerio from "cheerio";
import {
  parseDurationMinutes,
  parseRouteFromKayakUrl,
} from "./shared/flightParsing.js";
import type { FlightLayover, FlightOffer, FlightSegment } from "./types.js";

const selectors = {
  offer: ".Fxw9-result-item-container > .nrc6, .nrc6.nrc6-mod-pres-default",
  priceText: ".e2GB-price-text, .f8F1-price-text, .price-text",
  bookingLink: "a[href*='/book/flight'], a[href]",
};

export function extractFlightOffers(html: string, pageUrl: string): FlightOffer[] {
  const $ = cheerio.load(html);
  const offers: FlightOffer[] = [];
  const route = parseRouteFromKayakUrl(pageUrl);

  $(selectors.offer).each((_, element) => {
    const root = $(element);
    const item = root.find("li.hJSA-item").first();
    if (!item.length) return;

    const parsed = parseKayakResultItem($, root, item, route.from, route.to);
    if (!parsed) return;

    const offer: FlightOffer = {
      ...parsed,
      priceText: cleanText(root.find(selectors.priceText).first().text()),
      bookingLink: absoluteUrl(root.find(selectors.bookingLink).first().attr("href"), pageUrl),
    };

    if (hasUsefulData(offer)) {
      offers.push(offer);
    }
  });

  return dedupeOffers(offers);
}

function parseKayakResultItem(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<any>,
  item: cheerio.Cheerio<any>,
  originCode?: string,
  destinationCode?: string,
): Omit<FlightOffer, "bookingLink"> | null {
  const timeBlock = cleanText(item.find(".VY2U .vmXl-mod-variant-large").first().text());
  const timeRange = splitTimeRange(normalizeTimeSeparator(timeBlock));
  const carrier =
    cleanText(item.find(".VY2U .c_cgF").first().text()) ||
    item.find(".c5iUd-leg-carrier img").attr("alt") ||
    item.find(".lbBX-logo").attr("alt") ||
    "";

  const stopsText = cleanText(item.find(".JWEO > .vmXl").first().text());
  const durationText = cleanText(item.find(".xdW8 > .vmXl").first().text());
  const segments = extractExpandedSegments($, root);
  const expandedLayovers = extractExpandedLayovers($, root);
  const layovers = expandedLayovers.length > 0
    ? expandedLayovers
    : extractLayoversFromJwep($, item, originCode, destinationCode);

  const departureTime = timeRange.departureTime;
  const arrivalTime = timeRange.arrivalTime;

  if (!departureTime && !arrivalTime && !carrier && !durationText) {
    return null;
  }

  return {
    departureTime,
    arrivalTime,
    priceText: "",
    carrier,
    stopsText,
    durationText,
    durationMinutes: parseDurationMinutes(durationText) ?? undefined,
    layovers,
    segments: segments.length > 0 ? segments : undefined,
  };
}

function extractExpandedSegments($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): FlightSegment[] {
  const segments: FlightSegment[] = [];

  root.find(".c1hxM").each((_, element) => {
    const segmentRoot = $(element);
    const routeColumns = segmentRoot.find(".qvW6-row-entry").first().find(".qvW6-half-column");
    const originCode = cleanText(routeColumns.eq(0).text()).toUpperCase();
    const destinationCode = cleanText(routeColumns.eq(1).text()).toUpperCase();
    const timeDisplays = segmentRoot.find(".qvW6-time-display");
    const departureTime = cleanText(timeDisplays.eq(0).text());
    const arrivalTime = cleanText(timeDisplays.eq(1).text());
    const stations = segmentRoot.find(".bmr3-station");
    const originStation = parseStation(cleanText(stations.eq(0).text()), originCode);
    const destinationStation = parseStation(cleanText(stations.eq(1).text()), destinationCode);
    const durationText = cleanText(segmentRoot.find(".c1hxM-duration-text").first().text());
    const carrier = cleanText(segmentRoot.find(".c1hxM-carrier-flight").first().text())
      || segmentRoot.find(".c1hxM-carrier-icon img").attr("alt")
      || undefined;

    if (!originCode || !destinationCode || !departureTime || !arrivalTime) return;

    segments.push({
      departureTime,
      arrivalTime,
      originCode,
      destinationCode,
      originAirport: originStation.airport,
      destinationAirport: destinationStation.airport,
      durationText,
      durationMinutes: parseDurationMinutes(durationText) ?? undefined,
      carrier,
    });
  });

  return segments;
}

function extractExpandedLayovers($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): FlightLayover[] {
  const layovers: FlightLayover[] = [];

  root.find(".E-1g-layover-info").each((_, element) => {
    const layoverRoot = $(element);
    const durationText = cleanText(layoverRoot.find(".E-1g-duration").first().text());
    const fullText = cleanText(layoverRoot.text());
    const code = parseAirportCode(fullText);
    const city = parseLayoverCity(fullText);

    if (!code) return;

    layovers.push({
      code,
      airport: city ? `${city} (${code})` : `Airport ${code}`,
      city,
      durationMinutes: parseDurationMinutes(durationText) ?? undefined,
    });
  });

  return layovers;
}

function extractLayoversFromJwep(
  $: cheerio.CheerioAPI,
  item: cheerio.Cheerio<any>,
  originCode?: string,
  destinationCode?: string,
): FlightLayover[] {
  const layovers: FlightLayover[] = [];
  const excluded = new Set([originCode, destinationCode].filter(Boolean).map((code) => code!.toUpperCase()));

  item.find('[data-testid^="layover-screen-reader-text"]').each((_, element) => {
    const layoverRoot = $(element);
    const layoverText = cleanText(layoverRoot.text());
    const containerText = cleanText(layoverRoot.parent().text());
    const code = parseAirportCode(containerText);
    const airportNameFromText = parseLayoverAirportName(layoverText);

    if (!code || excluded.has(code)) return;

    const durationMinutes = parseLayoverDuration(layoverText);
    const airportName = airportNameFromText || item.find(".JWEO .c_cgF").attr("title") || `Airport ${code}`;

    layovers.push({
      code,
      airport: airportName,
      city: airportName.split(" ")[0],
      durationMinutes,
    });
  });

  if (layovers.length === 0) {
    const stopCode = parseAirportCode(cleanText(item.find(".JWEO .c_cgF > span > span").first().text()));
    if (stopCode && !excluded.has(stopCode)) {
      layovers.push({
        code: stopCode,
        airport: item.find(".JWEO .c_cgF").attr("title") || `Airport ${stopCode}`,
      });
    }
  }

  return layovers;
}

function parseStation(text: string, fallbackCode: string): { airport: string; code: string } {
  const parsed = parseTrailingAirportCode(text);

  if (!parsed) {
    return {
      airport: text || `Airport ${fallbackCode}`,
      code: fallbackCode,
    };
  }

  return {
    airport: parsed.airport,
    code: parsed.code,
  };
}

function parseAirportCode(text: string): string {
  return text.match(/\b([A-Z]{3})\b/)?.[1] || "";
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitTimeRange(value: string): Pick<FlightOffer, "departureTime" | "arrivalTime"> {
  const separatorIndex = value.indexOf(" - ");
  const departureTime = separatorIndex >= 0 ? value.slice(0, separatorIndex) : value;
  const arrivalTime = separatorIndex >= 0 ? value.slice(separatorIndex + 3) : "";

  return {
    departureTime: cleanText(departureTime),
    arrivalTime: cleanText(arrivalTime),
  };
}

function normalizeTimeSeparator(value: string): string {
  return cleanText(value.replaceAll("–", " - ").replaceAll("â€“", " - "));
}

function parseLayoverCity(text: string): string | undefined {
  const prefix = "change planes in ";
  const lower = text.toLowerCase();
  const prefixIndex = lower.indexOf(prefix);
  if (prefixIndex < 0) return undefined;

  const cityWithCode = text.slice(prefixIndex + prefix.length).trim();
  const parsed = parseTrailingAirportCode(cityWithCode);
  return parsed?.airport || cityWithCode || undefined;
}

function parseLayoverAirportName(text: string): string | undefined {
  const lower = text.toLowerCase();
  const layoverIndex = lower.indexOf("layover");
  if (layoverIndex < 0) return undefined;

  const afterLayover = text.slice(layoverIndex + "layover".length).trimStart();
  const airportName = afterLayover.startsWith(",") ? afterLayover.slice(1).trimStart() : afterLayover;
  return airportName || undefined;
}

function parseLayoverDuration(text: string): number | undefined {
  const lower = text.toLowerCase();
  const layoverIndex = lower.indexOf("layover");
  const durationText = layoverIndex >= 0 ? lower.slice(0, layoverIndex) : lower;
  return parseDurationMinutes(durationText) ?? undefined;
}

function parseTrailingAirportCode(text: string): { airport: string; code: string } | null {
  const trimmed = text.trim();
  if (!trimmed.endsWith(")")) return null;

  const openIndex = trimmed.lastIndexOf("(");
  if (openIndex < 1) return null;

  const code = trimmed.slice(openIndex + 1, -1).trim().toUpperCase();
  if (code.length !== 3 || !isUppercaseAirportCode(code)) return null;

  return {
    airport: trimmed.slice(0, openIndex).trim(),
    code,
  };
}

function isUppercaseAirportCode(value: string): boolean {
  return [...value].every((character) => character >= "A" && character <= "Z");
}

function absoluteUrl(href: string | undefined, baseUrl: string): string {
  if (!href) {
    return "";
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

function hasUsefulData(offer: FlightOffer): boolean {
  return Boolean(offer.departureTime || offer.arrivalTime || offer.priceText || offer.carrier);
}

function dedupeOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Set<string>();

  return offers.filter((offer) => {
    const key = [
      offer.departureTime,
      offer.arrivalTime,
      offer.priceText,
      offer.carrier,
      offer.stopsText,
      offer.durationText,
      offer.layovers?.map((layover) => layover.code).join(","),
      offer.bookingLink,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
