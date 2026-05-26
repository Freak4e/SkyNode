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

export type FlightSegment = {
  departureTime: string;
  arrivalTime: string;
  originCode: string;
  destinationCode: string;
  originAirport?: string;
  destinationAirport?: string;
  durationText?: string;
  durationMinutes?: number;
  carrier?: string;
};

export type FlightOffer = {
  departureTime: string;
  arrivalTime: string;
  priceText: string;
  carrier: string;
  stopsText: string;
  durationText?: string;
  durationMinutes?: number;
  bookingLink: string;
  source?: Exclude<FlightSource, "none">;
  expiresAt?: string;
  layovers?: FlightLayover[];
  segments?: FlightSegment[];
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
  generationMode: "ollama";
};

export type SaveTripRequest = GenerateItineraryRequest & {
  title: string;
  itinerary: GeneratedItinerary;
};

export type SaveTripResponse = {
  tripId: string;
  savedAt: string;
};

export type SavedTripSummary = {
  id: string;
  title: string;
  destinationCode: string;
  destinationName: string;
  originCode?: string;
  startDate: string;
  days: number;
  budget: BudgetLevel;
  pace: TravelPace;
  interests: string[];
  estimatedTotalCost: number;
  createdAt: string;
};

export type SavedTripDetail = SavedTripSummary & {
  selectedFlight?: FlightOffer;
  itinerary: GeneratedItinerary;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type TravelChatRequest = {
  message: string;
  history?: ChatMessage[];
  trip?: SavedTripDetail;
};

export type TripChangeProposal = {
  summary: string;
  itinerary: GeneratedItinerary;
};

export type TravelChatResponse = {
  message: string;
  mode: "general" | "trip-aware";
  proposal?: TripChangeProposal;
};

export type ApplyTripChangeRequest = {
  proposal: TripChangeProposal;
};

export type ApplyTripChangeResponse = {
  trip: SavedTripDetail;
};
