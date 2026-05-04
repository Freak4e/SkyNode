import { fetchTravelpayoutsOffers } from "../../travelpayouts.js";
import type { FlightSearchInput } from "../../shared/types.js";

export async function searchTravelpayoutsCachedData(
  input: Required<Pick<FlightSearchInput, "from" | "to" | "date">>,
) {
  console.log(`[provider:travelpayouts-data] ${input.from}-${input.to} on ${input.date}`);

  const offers = await fetchTravelpayoutsOffers(input.from, input.to, input.date);
  const warnings =
    offers.length === 0
      ? ["Travelpayouts Data API returned no cached fares for this exact route/date."]
      : [];

  return {
    offers,
    warnings,
    source: offers.length > 0 ? "travelpayouts" as const : "none" as const,
  };
}
