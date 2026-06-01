import type { FlightOffer } from "../../../shared/types.js";

export type StoredFlightSelection = {
  outbound: FlightOffer;
  inbound?: FlightOffer;
  tripType: "one-way" | "return";
  departureDate: string;
  returnDate?: string;
  totalPriceText: string;
};

const SELECTION_KEY = "skynode:flightSelection";
const SELECTED_FLIGHT_KEY = "skynode:selectedFlight";

export function writeStoredFlightSelection(selection: StoredFlightSelection): void {
  sessionStorage.setItem(SELECTION_KEY, JSON.stringify(selection));
  sessionStorage.setItem(SELECTED_FLIGHT_KEY, JSON.stringify(selection.outbound));
}

export function readStoredFlightSelection(): StoredFlightSelection | null {
  const raw = sessionStorage.getItem(SELECTION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredFlightSelection;
  } catch {
    return null;
  }
}
