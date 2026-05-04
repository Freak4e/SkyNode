import * as cheerio from "cheerio";
import type { FlightOffer } from "./types.js";

const selectors = {
  offer: "[data-resultid], .resultWrapper, .nrc6",
  timeContainer: "[data-testid='departure-time'], .VY2U .vmXl-mod-variant-large",
  departureTime: "[data-testid='departure-time'] span:first-child, .VY2U .vmXl-mod-variant-large span:first-child",
  arrivalTime: "[data-testid='arrival-time'] span:last-child, .VY2U .vmXl-mod-variant-large span:last-child",
  priceText: "[data-testid='price'], .price-text, .e2GB-price-text, .f8F1-price-text",
  carrier: "[data-testid='airline-name'], .carrier-name, .J0g6-operator-text, .VY2U > .c_cgF",
  stopsText: "[data-testid='stops'], .stops-text, .JWEO-stops-text, .JWEO .vmXl",
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
    };

    if (hasUsefulData(offer)) {
      offers.push(offer);
    }
  });

  return dedupeOffers(offers);
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
