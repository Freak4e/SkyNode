import * as cheerio from "cheerio";
import type { FlightLayover, FlightOffer } from "./types.js";

const selectors = {
  offer: "[data-resultid], .resultWrapper, .nrc6",
  timeContainer: "[data-testid='departure-time'], .VY2U .vmXl-mod-variant-large",
  departureTime: "[data-testid='departure-time'] span:first-child, .VY2U .vmXl-mod-variant-large span:first-child",
  arrivalTime: "[data-testid='arrival-time'] span:last-child, .VY2U .vmXl-mod-variant-large span:last-child",
  priceText: "[data-testid='price'], .price-text, .e2GB-price-text, .f8F1-price-text",
  carrier: "[data-testid='airline-name'], .carrier-name, .J0g6-operator-text, .VY2U > .c_cgF",
  stopsText: "[data-testid='stops'], .stops-text, .JWEO-stops-text, .JWEO .vmXl",
  layoverHints: "[aria-label*='layover'], [title*='layover'], .JWEO-stops-airports, .c_cgF [aria-label]",
  bookingLink: "a[href*='/book/flight'], a[href]",
};

export function extractFlightOffers(html: string, pageUrl: string): FlightOffer[] {
  const $ = cheerio.load(html);
  const offers: FlightOffer[] = [];

  $(selectors.offer).each((_, element) => {
    const root = $(element);
    const timeRange = splitTimeRange(cleanText(root.find(selectors.timeContainer).first().text()));
    const offer: FlightOffer = {
      departureTime: cleanText(root.find(selectors.departureTime).first().text()) || timeRange.departureTime,
      arrivalTime: cleanText(root.find(selectors.arrivalTime).first().text()) || timeRange.arrivalTime,
      priceText: cleanText(root.find(selectors.priceText).first().text()),
      carrier: cleanText(root.find(selectors.carrier).first().text()),
      stopsText: cleanText(root.find(selectors.stopsText).first().text()),
      bookingLink: absoluteUrl(root.find(selectors.bookingLink).first().attr("href"), pageUrl),
      layovers: extractLayovers($, root),
    };

    if (hasUsefulData(offer)) {
      offers.push(offer);
    }
  });

  return dedupeOffers(offers);
}

function extractLayovers($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): FlightLayover[] {
  const layovers: FlightLayover[] = [];
  const seen = new Set<string>();

  const ariaPattern = /(?:(\d+)\s*h\s*)?(?:(\d+)\s*m(?:in)?)?\s*layover(?:\s+at\s+|\s+in\s+)?([^()]*?)(?:\s*\(([A-Z]{3})\))?$/i;

  root.find(selectors.layoverHints).each((_, hint) => {
    const labels = [
      $(hint).attr("aria-label"),
      $(hint).attr("title"),
      cleanText($(hint).text()),
    ].filter((value): value is string => Boolean(value));

    for (const raw of labels) {
      const text = raw.replace(/\s+/g, " ").trim();
      if (!text.toLowerCase().includes("layover")) continue;

      const match = text.match(ariaPattern);
      if (!match) continue;

      const hours = match[1] ? Number(match[1]) : 0;
      const minutes = match[2] ? Number(match[2]) : 0;
      const airportName = (match[3] || "").trim() || "Layover stop";
      const code = (match[4] || "").trim();

      const key = `${code}|${airportName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      layovers.push({
        code: code || "—",
        airport: airportName,
        durationMinutes: hours * 60 + minutes || undefined,
      });
    }
  });

  if (layovers.length === 0) {
    const codeMatches = new Set<string>();
    root.find(".JWEO-stops-airports, .c_cgF, [data-testid='stops']").each((_, node) => {
      const text = cleanText($(node).text());
      const ariaLabel = $(node).attr("aria-label") || "";

      [text, ariaLabel].forEach((value) => {
        value.replace(/\b([A-Z]{3})\b/g, (token) => {
          codeMatches.add(token);
          return token;
        });
      });
    });

    for (const code of codeMatches) {
      if (seen.has(code)) continue;
      seen.add(code);
      layovers.push({ code, airport: `Airport ${code}` });
    }
  }

  return layovers;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitTimeRange(value: string): Pick<FlightOffer, "departureTime" | "arrivalTime"> {
  const [departureTime = "", arrivalTime = ""] = value.split(/\s+(?:-|\u2013)\s+/, 2);

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
      offer.bookingLink,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
