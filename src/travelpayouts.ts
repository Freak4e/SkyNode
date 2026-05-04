import axios, { AxiosError } from "axios";
import { config, requireTravelpayoutsAccessToken } from "./config.js";
import type { FlightOffer } from "./types.js";

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
};

export async function fetchTravelpayoutsOffers(
  from: string,
  to: string,
  date: string,
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
          currency: config.travelpayouts.currency,
        },
      },
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "Travelpayouts returned an unsuccessful response.");
    }

    return normalizeCheapPrices(response.data.data, from, to);
  } catch (error) {
    throw new Error(`Travelpayouts request failed: ${describeError(error)}`);
  }
}

function normalizeCheapPrices(
  data: CheapPricesResponse["data"],
  from: string,
  to: string,
): FlightOffer[] {
  const tickets = Object.values(data?.[to] || {}).filter(Boolean);

  return tickets
    .map((ticket) => ({
      departureTime: formatDateTime(ticket.departure_at),
      arrivalTime: "",
      priceText: formatPrice(ticket.price),
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

function formatPrice(value: number | undefined): string {
  if (typeof value !== "number") {
    return "";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: config.travelpayouts.currency,
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
