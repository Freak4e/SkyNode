export type ProviderId = "scrapingbee" | "travelpayouts" | "auto";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "CNY";

export type FlightSearchInput = {
  from: string;
  to: string;
  date: string;
  provider?: ProviderId;
  currency?: CurrencyCode;
};

export type FlightSource = "scrapingbee" | "travelpayouts" | "none";

export type FlightLayover = {
  code: string;
  airport: string;
  city?: string;
  durationMinutes?: number;
};

export type FlightOffer = {
  departureTime: string;
  arrivalTime: string;
  priceText: string;
  carrier: string;
  stopsText: string;
  bookingLink: string;
  source?: Exclude<FlightSource, "none">;
  expiresAt?: string;
  layovers?: FlightLayover[];
};

export type FlightSearchResponse = {
  offers: FlightOffer[];
  warnings: string[];
  source: FlightSource;
};

export type Place = {
  code: string;
  name: string;
  cityName: string;
  countryName: string;
  type: string;
  cityCode?: string;
  countryCode?: string;
  mainAirportName?: string;
  coordinates?: { lat: number; lon: number };
};

export type BudgetLevel = "low" | "medium" | "high";

export type TravelPace = "relaxed" | "balanced" | "packed";

export type Attraction = {
  id: string;
  name: string;
  category: string;
  address: string;
  lat?: number;
  lon?: number;
  source: "geoapify" | "mock";
};

export type ItineraryItem = {
  timeOfDay: "morning" | "afternoon" | "evening";
  title: string;
  description: string;
  attractionName?: string;
  estimatedCost: number;
};

export type ItineraryDay = {
  dayNumber: number;
  title: string;
  summary: string;
  estimatedCost: number;
  items: ItineraryItem[];
};

export type GenerateItineraryRequest = {
  destinationCode: string;
  destinationName: string;
  startDate: string;
  days: number;
  budget: BudgetLevel;
  pace: TravelPace;
  interests: string[];
  selectedFlight?: FlightOffer;
  originCode?: string;
};

export type GeneratedItinerary = {
  destinationName: string;
  startDate: string;
  days: ItineraryDay[];
  attractions: Attraction[];
  estimatedTotalCost: number;
  generationMode: "mock";
};

export type SaveTripRequest = GenerateItineraryRequest & {
  title: string;
  itinerary: GeneratedItinerary;
};

export type SaveTripResponse = {
  tripId: string;
  savedAt: string;
};
