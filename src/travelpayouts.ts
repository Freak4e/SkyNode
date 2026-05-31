import axios, { AxiosError } from "axios";
import { config, requireTravelpayoutsAccessToken } from "./config.js";
import type { CurrencyCode, ExploreDeal, FlightOffer } from "./types.js";

type CheapPricesResponse = {
  success: boolean;
  data: Record<string, Record<string, TravelpayoutsTicket>> | null;
  error: string | null;
};

type TravelpayoutsTicket = {
  price?: number;
  airline?: string;
  flight_number?: number | string;
  departure_at?: string;
  return_at?: string;
  expires_at?: string;
  duration?: number;
  duration_to?: number;
  duration_back?: number;
};

type LatestPricesResponse = {
  success: boolean;
  data: Array<{
    origin: string;
    destination: string;
    price: number;
    airline?: string;
    flight_number?: string | number;
    depart_date?: string;
    return_date?: string;
    expires_at?: string;
  }>;
  error?: string;
};

export async function fetchTravelpayoutsOffers(
  from: string,
  to: string,
  date: string,
  currency: CurrencyCode = "USD",
): Promise<FlightOffer[]> {
  const accessToken = requireTravelpayoutsAccessToken();

  try {
    console.log(`[travelpayouts] fetching cached prices ${from}-${to} on ${date}`);

    const response = await axios.get<CheapPricesResponse>(
      `${config.travelpayouts.apiUrl}/v1/prices/cheap`,
      {
        timeout: config.travelpayouts.timeoutMs,
        headers: {
          "X-Access-Token": accessToken,
          "Accept-Encoding": "gzip, deflate",
        },
        params: {
          origin: from,
          destination: to,
          depart_date: date,
          currency,
        },
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "Travelpayouts returned an unsuccessful response.");
    }

    return normalizeCheapPrices(response.data.data, from, to, currency);
  } catch (error) {
    throw new Error(`Travelpayouts request failed: ${describeError(error)}`);
  }
}

export async function fetchTravelpayoutsExploreDeals(input: {
  origin: string;
  destination?: string;
  currency?: CurrencyCode;
  limit?: number;
  oneWay?: boolean;
}): Promise<ExploreDeal[]> {
  const accessToken = requireTravelpayoutsAccessToken();
  const origin = input.origin.trim().toUpperCase();
  const currency = input.currency || "USD";
  const limit = typeof input.limit === "number" ? Math.max(1, Math.min(100, input.limit)) : 100;
  const oneWay = input.oneWay ?? true;

  try {
    console.log(`[travelpayouts] fetching latest explore prices from ${origin}`);

    const response = await axios.get<LatestPricesResponse>(
      `${config.travelpayouts.apiUrl}/v2/prices/latest`,
      {
        timeout: config.travelpayouts.timeoutMs,
        headers: {
          "X-Access-Token": accessToken,
          "Accept-Encoding": "gzip, deflate",
        },
        params: {
          origin,
          destination: input.destination?.trim().toUpperCase() || undefined,
          currency,
          period_type: "year",
          one_way: oneWay ? "true" : "false",
          sorting: "price",
          limit,
          show_to_affiliates: "true",
          trip_class: 0,
          page: 1,
        },
      },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || "Travelpayouts returned an unsuccessful response.");
    }

    const latestDeals = (response.data.data || [])
      .filter((entry) => entry && typeof entry.price === "number" && entry.destination)
      .map((entry) => ({
        origin: entry.origin || origin,
        destination: entry.destination,
        price: entry.price,
        currency,
        airline: entry.airline,
        flightNumber: entry.flight_number ? String(entry.flight_number) : undefined,
        departDate: entry.depart_date,
        returnDate: entry.return_date,
        destinationPlace: null,
        link: buildSearchLink(origin, entry.destination, entry.depart_date ? `${entry.depart_date}T00:00:00` : undefined),
      }));

    if (latestDeals.length > 0) {
      return latestDeals;
    }

    return fetchTravelpayoutsCheapExploreDeals({
      origin,
      destination: input.destination,
      currency,
      limit,
    });
  } catch (error) {
    try {
      return await fetchTravelpayoutsCheapExploreDeals({
        origin,
        destination: input.destination,
        currency,
        limit,
      });
    } catch {
      throw new Error(`Travelpayouts request failed: ${describeError(error)}`);
    }
  }
}

async function fetchTravelpayoutsCheapExploreDeals(input: {
  origin: string;
  destination?: string;
  currency: CurrencyCode;
  limit: number;
}): Promise<ExploreDeal[]> {
  const accessToken = requireTravelpayoutsAccessToken();
  const destination = input.destination?.trim().toUpperCase() || "-";

  const response = await axios.get<CheapPricesResponse>(
    `${config.travelpayouts.apiUrl}/v1/prices/cheap`,
    {
      timeout: config.travelpayouts.timeoutMs,
      headers: {
        "X-Access-Token": accessToken,
        "Accept-Encoding": "gzip, deflate",
      },
      params: {
        origin: input.origin,
        destination,
        currency: input.currency,
      },
    },
  );

  if (!response.data?.data) return [];

  return Object.entries(response.data.data)
    .flatMap(([destinationCode, ticketsByStops]) =>
      Object.entries(ticketsByStops || {}).map(([stops, ticket]) => ({
        origin: input.origin,
        destination: destinationCode,
        price: ticket.price || 0,
        currency: input.currency,
        airline: ticket.airline,
        flightNumber: ticket.flight_number ? String(ticket.flight_number) : undefined,
        departDate: ticket.departure_at?.slice(0, 10),
        returnDate: ticket.return_at?.slice(0, 10),
        destinationPlace: null,
        link: buildSearchLink(input.origin, destinationCode, ticket.departure_at),
        stopsText: stops === "0" ? "Direct" : `${stops} stop${stops === "1" ? "" : "s"}`,
      }))
    )
    .filter((deal) => deal.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, input.limit);
}

function normalizeCheapPrices(
  data: CheapPricesResponse["data"],
  from: string,
  to: string,
  currency: CurrencyCode,
): FlightOffer[] {
  const tickets = Object.values(data?.[to] || {}).filter(Boolean);

  return tickets
    .map((ticket) => ({
      departureTime: formatDateTime(ticket.departure_at),
      arrivalTime: "",
      priceText: formatPrice(ticket.price, currency),
      carrier: formatCarrier(ticket),
      stopsText: "Cached fare from recent Aviasales searches",
      bookingLink: buildSearchLink(from, to, ticket.departure_at),
      source: "travelpayouts" as const,
      expiresAt: ticket.expires_at,
    }))
    .filter((offer) => offer.departureTime || offer.priceText || offer.carrier);
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(value: number | undefined, currency: CurrencyCode): string {
  if (typeof value !== "number") {
    return "";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCarrier(ticket: TravelpayoutsTicket): string {
  const flightNumber = ticket.flight_number ? String(ticket.flight_number) : "";
  return [ticket.airline, flightNumber].filter(Boolean).join(" ");
}

function buildSearchLink(from: string, to: string, departureAt: string | undefined): string {
  const params = new URLSearchParams({
    origin_iata: from,
    destination_iata: to,
  });

  if (departureAt) {
    params.set("depart_date", departureAt.slice(0, 10));
    params.set("one_way", "true");
  }

  return `https://www.aviasales.com/search?${params.toString()}`;
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return describeAxiosError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
}

function describeAxiosError(error: AxiosError): string {
  const status = error.response?.status ? `status ${error.response.status}` : "no status";
  return `${status}, ${error.code || "no code"}, ${error.message}`;
}
