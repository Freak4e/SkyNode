export type ProviderId = "scrapingbee" | "travelpayouts" | "auto";

export type FlightSearchInput = {
  from: string;
  to: string;
  date: string;
  provider?: ProviderId;
};

export type FlightSource = "scrapingbee" | "travelpayouts" | "none";

export type FlightOffer = {
  departureTime: string;
  arrivalTime: string;
  priceText: string;
  carrier: string;
  stopsText: string;
  bookingLink: string;
  source?: Exclude<FlightSource, "none">;
  expiresAt?: string;
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
};
