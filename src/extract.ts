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
  const timeRange = splitTimeRange(timeBlock.replace(/\s*–\s*/g, " - "));
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
    const city = fullText.match(/Change planes in\s+(.+?)(?:\s*\([A-Z]{3}\))?$/i)?.[1]?.trim();

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
    const airportMatch = layoverText.match(/layover,?\s*(.+)$/i);

    if (!code || excluded.has(code)) return;

    const durationMatch = layoverText.match(/(?:(\d+)\s*h\s*)?(?:(\d+)\s*m(?:in)?)?\s*layover/i);
    const hours = durationMatch?.[1] ? Number(durationMatch[1]) : 0;
    const minutes = durationMatch?.[2] ? Number(durationMatch[2]) : 0;
    const durationMinutes = hours * 60 + minutes || undefined;
    const airportName = airportMatch?.[1]?.trim() || item.find(".JWEO .c_cgF").attr("title") || `Airport ${code}`;

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
  const match = text.match(/^(.+?)\s*\(([A-Z]{3})\)$/);

  if (!match) {
    return {
      airport: text || `Airport ${fallbackCode}`,
      code: fallbackCode,
    };
  }

  return {
    airport: match[1].trim(),
    code: match[2],
  };
}

function parseAirportCode(text: string): string {
  return text.match(/\b([A-Z]{3})\b/)?.[1] || "";
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitTimeRange(value: string): Pick<FlightOffer, "departureTime" | "arrivalTime"> {
  const [departureTime = "", arrivalTime = ""] = value.split(/\s+-\s+/, 2);

  return {
    departureTime: cleanText(departureTime),
    arrivalTime: cleanText(arrivalTime),
  };
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
