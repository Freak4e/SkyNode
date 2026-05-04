import { extractFlightOffers } from "../../extract.js";
import { buildTargetUrl, fetchWithScrapingBee } from "../../scrapingbee.js";
import type { FlightOffer, FlightSearchInput } from "../../shared/types.js";

export async function searchKayakWithScrapingBee(
  input: Required<Pick<FlightSearchInput, "from" | "to" | "date">>,
) {
  const targetUrl = buildTargetUrl(input.from, input.to, input.date);

  console.log(`[provider:scrapingbee] ${input.from}-${input.to} on ${input.date}`);

  const html = await fetchWithScrapingBee(targetUrl);
  const offers = extractFlightOffers(html, targetUrl).map((offer) => normalizeOffer(offer, targetUrl));
  const warnings = offers.length === 0 ? [buildNoOffersWarning(html)] : [];

  return {
    offers,
    warnings,
    source: offers.length > 0 ? "scrapingbee" as const : "none" as const,
  };
}

function normalizeOffer(offer: FlightOffer, searchUrl: string): FlightOffer {
  return {
    ...offer,
    // Kayak /book/flight links are session-like and often fail outside the scraped page.
    bookingLink: searchUrl,
    source: "scrapingbee",
  };
}

function buildNoOffersWarning(html: string): string {
  const text = html.replace(/\s+/g, " ");

  if (text.includes("Loading results")) {
    return "No flight offers extracted because the fetched page still says 'Loading results'. Increase SCRAPINGBEE_WAIT_MS and retry.";
  }

  return "No flight offers extracted. Check debug/last-response.html and selectors.";
}
