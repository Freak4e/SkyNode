import type { FlightOffer, SaveLikedFlightRequest } from "./types.js";

function normalize(value: string | undefined): string {
  return (value || "").trim().toUpperCase();
}

function offerKey(offer: FlightOffer | undefined): string {
  if (!offer) {
    return "";
  }

  return [
    normalize(offer.searchFrom || offer.segments?.[0]?.originCode),
    normalize(offer.searchTo || offer.segments?.[offer.segments.length - 1]?.destinationCode),
    offer.departureTime || "",
    offer.arrivalTime || "",
    offer.carrier || "",
    offer.priceText || "",
    offer.stopsText || "",
  ].join("|");
}

export function likedFlightFingerprint(input: SaveLikedFlightRequest): string {
  return [
    input.tripType,
    input.departureDate,
    input.returnDate || "",
    offerKey(input.outbound),
    offerKey(input.inbound),
  ].join("::");
}
