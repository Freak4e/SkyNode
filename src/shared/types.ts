export type ProviderId = "scrapingbee" | "travelpayouts" | "auto";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "CNY";

export type FlightSearchInput = {
  from: string | string[];
  to: string | string[];
  date: string;
  provider?: ProviderId;
  currency?: CurrencyCode;
};

export type NormalizedFlightSearchInput = {
  from: string;
  to: string;
  date: string;
  provider: ProviderId;
  currency: CurrencyCode;
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
  searchFrom?: string;
  searchTo?: string;
  layovers?: FlightLayover[];
  segments?: FlightSegment[];
};

export type FlightSearchResponse = {
  offers: FlightOffer[];
  warnings: string[];
  source: FlightSource;
  searchedRoutes?: Array<{ from: string; to: string }>;
  cache?: {
    hit: boolean;
    cachedAt?: string;
    expiresAt?: string;
  };
};

export type ExploreDeal = {
  origin: string;
  destination: string;
  price: number;
  currency: CurrencyCode;
  departDate?: string;
  returnDate?: string;
  airline?: string;
  flightNumber?: string;
  stopsText?: string;
  link?: string;
  destinationPlace?: Place | null;
};

export type ExploreResponse = {
  deals: ExploreDeal[];
  warnings: string[];
};

export type LiveFlight = {
  id: string;
  callsign: string;
  airline: string;
  originCountry: string;
  status: "On ground" | "Climbing" | "Descending" | "Cruising";
  lat: number;
  lon: number;
  heading: number;
  altitudeMeters?: number;
  speedKmh?: number;
  onGround?: boolean;
  lastContact?: string;
};

export type LiveFlightsResponse = {
  flights: LiveFlight[];
  updatedAt?: string;
  warnings: string[];
  source: "opensky";
  totalAvailable?: number;
  samplePercent?: number;
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

export type GeocodeRequestItem = {
  id: string;
  title: string;
  description?: string;
  attractionName?: string;
};

export type GeocodeRequest = {
  destinationName: string;
  items: GeocodeRequestItem[];
  allowOutsideDestination?: boolean;
  boundaryCities?: string[];
};

export type GeocodedMapPoint = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lon: number;
  source: "geoapify";
  outsideBoundary?: boolean;
  nearestBoundaryCity?: string;
  distanceKm?: number;
};

export type GeocodeResponse = {
  points: GeocodedMapPoint[];
  warnings: string[];
};

export type ItineraryItem = {
  order?: number;
  timeOfDay: string;
  title: string;
  description: string;
  attractionName?: string;
  category?: string;
  location?: TripLocation;
  notes?: string;
  tags?: string[];
  durationMinutes?: number;
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
  budgetAmount?: number;
  travelers?: number;
  pace: TravelPace;
  interests: string[];
  selectedFlight?: FlightOffer;
  selectedFlights?: FlightOffer[];
  routeSegments?: TripRouteSegment[];
  expenseBreakdown?: TripExpenseBreakdown;
  cities?: TripCity[];
  hotels?: TripHotel[];
  budgetCategories?: TripBudgetCategory[];
  notes?: string;
  tags?: string[];
  originCode?: string;
};

export type TripLocation = {
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lon?: number;
  source?: "user" | "ai" | "geoapify" | "openrouteservice" | "manual";
  verified?: boolean;
};

export type TripPlace = TripLocation & {
  id: string;
  type: "airport" | "hotel" | "attraction" | "restaurant" | "station" | "other";
};

export type TripCity = {
  id: string;
  name: string;
  country?: string;
  arrivalDate?: string;
  departureDate?: string;
  nights?: number;
  notes?: string;
};

export type TripHotel = {
  id: string;
  cityName: string;
  name: string;
  location?: TripLocation;
  checkIn?: string;
  checkOut?: string;
  address?: string;
  priceEstimate?: number;
  bookingReference?: string;
};

export type TripRouteSegment = {
  id: string;
  type: "flight" | "train" | "bus" | "car" | "ferry" | "other";
  from: string;
  to: string;
  date: string;
  fromLocation?: TripLocation;
  toLocation?: TripLocation;
  label?: string;
  details?: FlightOffer;
};

export type TripExpenseBreakdown = {
  flights?: number;
  hotels?: number;
  activities?: number;
  food?: number;
  other?: number;
};

export type TripBudgetCategory = {
  id: string;
  label: string;
  amount: number;
  spent?: number;
};

export type GeneratedItinerary = {
  destinationName: string;
  startDate: string;
  days: ItineraryDay[];
  attractions: Attraction[];
  estimatedTotalCost: number;
  generationMode: "ollama" | "gemini";
};

export type TripVisibility = "private" | "invite" | "public";
export type TripMemberRole = "owner" | "member";
export type TripMemberStatus = "pending" | "accepted" | "declined";

export type TripAccess = {
  canViewItinerary: boolean;
  canChat: boolean;
  canManage: boolean;
  membershipStatus: TripMemberStatus | "none";
  role?: TripMemberRole;
  isOwner: boolean;
};

export type TripMember = {
  id: string;
  userId: string;
  role: TripMemberRole;
  status: TripMemberStatus;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
};

export type TripMessage = {
  id: string;
  tripId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  own?: boolean;
};

export type UserProfileSnapshot = {
  displayName: string;
  avatarUrl?: string;
};

export type SaveTripRequest = GenerateItineraryRequest & {
  title: string;
  itinerary: GeneratedItinerary;
  visibility?: TripVisibility;
  description?: string;
  maxMembers?: number;
  ownerProfile?: UserProfileSnapshot;
};

export type UpdateTripSettingsRequest = {
  visibility?: TripVisibility;
  description?: string;
  maxMembers?: number;
};

export type TripJoinRequest = UserProfileSnapshot;

export type UpdateTripMemberRequest = {
  status: "accepted" | "declined";
};

export type SendTripMessageRequest = {
  content: string;
  profile: UserProfileSnapshot;
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
  budgetAmount?: number;
  travelers?: number;
  routeSegments?: TripRouteSegment[];
  expenseBreakdown?: TripExpenseBreakdown;
  cities?: TripCity[];
  hotels?: TripHotel[];
  budgetCategories?: TripBudgetCategory[];
  notes?: string;
  tags?: string[];
  estimatedTotalCost: number;
  createdAt: string;
  visibility?: TripVisibility;
  description?: string;
  maxMembers?: number;
  memberCount?: number;
  inviteToken?: string;
  ownerName?: string;
  ownerAvatar?: string;
  access?: TripAccess;
};

export type SavedTripDetail = SavedTripSummary & {
  selectedFlight?: FlightOffer;
  selectedFlights?: FlightOffer[];
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
