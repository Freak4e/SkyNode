import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  MapPin,
  Plane,
  Search,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { searchFlights } from "../api/flightsApi";
import { ChipPlacePicker } from "../components/ChipPlacePicker";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import type { FlightOffer, Place } from "../../shared/types.js";

const today = new Date().toISOString().slice(0, 10);

type SortMode = "best" | "price" | "duration" | "earliest";
type TripType = "one-way" | "return";
type StopsFilter = "any" | "direct" | "up-to-1" | "up-to-2";
type FlightPair = {
  outbound: FlightOffer;
  inbound?: FlightOffer;
};

const AIRLINE_COLORS: Record<string, string> = {
  ANA: "bg-blue-600",
  "Japan Airlines": "bg-red-600",
  "Korean Air": "bg-indigo-700",
  "Cathay Pacific": "bg-emerald-700",
  Delta: "bg-blue-800",
};

const AIRLINE_ABBR: Record<string, string> = {
  ANA: "ANA",
  "Japan Airlines": "JAL",
  "Korean Air": "KAL",
  "Cathay Pacific": "CX",
  Delta: "DL",
};

function getAirlineBg(carrier: string) {
  for (const key of Object.keys(AIRLINE_COLORS)) {
    if (carrier.includes(key)) return AIRLINE_COLORS[key];
  }

  return "bg-blue-600";
}

function getAirlineAbbr(carrier: string) {
  for (const key of Object.keys(AIRLINE_ABBR)) {
    if (carrier.includes(key)) return AIRLINE_ABBR[key];
  }

  return carrier.slice(0, 2).toUpperCase() || "FL";
}

function parsePrice(text: string): number {
  const match = text.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
}

function pairPrice(pair: FlightPair): number {
  return parsePrice(pair.outbound.priceText) + (pair.inbound ? parsePrice(pair.inbound.priceText) : 0);
}

function parseTimeMinutes(value: string): number | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function estimateOfferDurationMinutes(offer: FlightOffer): number {
  const departure = parseTimeMinutes(offer.departureTime);
  const arrival = parseTimeMinutes(offer.arrivalTime);

  if (departure !== null && arrival !== null) {
    const sameDayMinutes = arrival >= departure ? arrival - departure : arrival + 24 * 60 - departure;
    return Math.max(60, sameDayMinutes);
  }

  const stops = parseStopsCount(offer.stopsText);
  if (stops !== null) return 150 + stops * 150;

  return 24 * 60;
}

function estimateOfferDurationHours(offer: FlightOffer): number {
  return estimateOfferDurationMinutes(offer) / 60;
}

function pairDurationHours(pair: FlightPair): number {
  return estimateOfferDurationHours(pair.outbound) + (pair.inbound ? estimateOfferDurationHours(pair.inbound) : 0);
}

function formatDuration(offer: FlightOffer): string {
  const totalMinutes = estimateOfferDurationMinutes(offer);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function pairEarliestMinutes(pair: FlightPair): number {
  return parseTimeMinutes(pair.outbound.departureTime) ?? 24 * 60;
}

function parseStopsCount(text: string | undefined): number | null {
  const normalized = text?.toLowerCase() || "";

  if (!normalized) return null;
  if (normalized.includes("nonstop") || normalized.includes("direct")) return 0;

  const match = normalized.match(/\b(\d+)\b/);
  return match ? Number(match[1]) : null;
}

function matchesStopsFilter(offer: FlightOffer, filters: StopsFilter[]): boolean {
  if (filters.length === 0 || filters.includes("any")) return true;

  const stops = parseStopsCount(offer.stopsText);
  if (stops === null) return true;

  return filters.some((filter) => {
    if (filter === "direct") return stops === 0;
    if (filter === "up-to-1") return stops <= 1;
    if (filter === "up-to-2") return stops <= 2;
    return true;
  });
}

function displayStopsText(offer: FlightOffer): string {
  const stops = parseStopsCount(offer.stopsText);

  if (stops === 0) return "Direct";
  if (typeof stops === "number") return stops === 1 ? "1 stop" : `${stops} stops`;

  return offer.stopsText?.replace(/nonstop/gi, "Direct") || "Flight";
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes} min`;
}

function layoverDetails(offer: FlightOffer): string[] {
  const stops = parseStopsCount(offer.stopsText);

  if (!stops || stops < 1) return [];

  return Array.from({ length: stops }, (_, index) => {
    const layoverMinutes = 120 + index * 35 + stops * 20;
    const stopLabel = stops === 1 ? "layover" : `layover ${index + 1}`;

    return `${formatMinutes(layoverMinutes)} ${stopLabel}`;
  });
}

function buildPairs(outboundOffers: FlightOffer[], inboundOffers: FlightOffer[], mode: TripType): FlightPair[] {
  if (mode === "one-way") {
    return outboundOffers.map((outbound) => ({ outbound }));
  }

  return outboundOffers.map((outbound, index) => ({
    outbound,
    inbound: inboundOffers[index % Math.max(inboundOffers.length, 1)],
  }));
}

function formatDisplayDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-24 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function FlightSegment({
  label,
  date,
  offer,
  origin,
  destination,
  direction,
}: {
  label: string;
  date: string;
  offer?: FlightOffer;
  origin: Place;
  destination: Place;
  direction: "outbound" | "inbound";
}) {
  if (!offer) {
    return (
      <div className="py-5">
        <p className="mb-2 text-xs font-semibold text-slate-500">{formatDisplayDate(date)} · {label}</p>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          No offers found for this return leg.
        </div>
      </div>
    );
  }

  const carrier = offer.carrier || "Unknown airline";
  const planeDirectionClass = direction === "outbound" ? "" : "rotate-180";
  const layovers = layoverDetails(offer);

  return (
    <div className="py-5">
      <p className="mb-3 text-xs font-semibold text-slate-500">{formatDisplayDate(date)} · {label}</p>
      <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3">
        <div>
          <p className="text-xl font-black leading-none text-slate-950">{offer.departureTime || "--:--"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{origin.code}</p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {formatDuration(offer)}
              </span>
              <Plane className={`h-4 w-4 text-blue-500 ${planeDirectionClass}`} />
              <div className="group relative">
                <span
                  className={`text-xs font-bold text-slate-600 ${layovers.length > 0 ? "cursor-help decoration-dotted underline-offset-2 hover:underline" : ""}`}
                  tabIndex={layovers.length > 0 ? 0 : undefined}
                >
                  {displayStopsText(offer)}
                </span>
                {layovers.length > 0 && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 hidden w-max min-w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-left text-xs font-bold text-white shadow-xl group-hover:block group-focus-within:block">
                    <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-slate-900" />
                    <div className="space-y-2">
                      {layovers.map((layover) => (
                        <p key={layover}>{layover}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md ${getAirlineBg(carrier)} px-1.5 text-[10px] font-black text-white`}>
              {getAirlineAbbr(carrier)}
            </span>
            <span className="truncate">{carrier}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-black leading-none text-slate-950">{offer.arrivalTime || "--:--"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{destination.code}</p>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialFromCode = params.get("from") ?? "JFK";
  const initialToCode = params.get("to") ?? "HND";
  const initialDate = params.get("date") ?? today;
  const initialReturnDate = params.get("returnDate") ?? initialDate;
  const initialTripType = params.get("tripType") === "one-way" ? "one-way" : "return";
  const parsedPassengers = Number(params.get("passengers") || 1);
  const initialPassengers = Number.isFinite(parsedPassengers)
    ? Math.min(Math.max(parsedPassengers, 1), 9)
    : 1;
  const initialFromName = params.get("fromName") ?? "New York";
  const initialToName = params.get("toName") ?? "Tokyo";

  const [from, setFrom] = useState<Place>({ code: initialFromCode, name: initialFromName, cityName: initialFromName, countryName: "", type: "city" });
  const [to, setTo] = useState<Place>({ code: initialToCode, name: initialToName, cityName: initialToName, countryName: "", type: "city" });
  const [date, setDate] = useState(initialDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [tripType, setTripType] = useState<TripType>(initialTripType);
  const [passengers, setPassengers] = useState(initialPassengers);

  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [returnOffers, setReturnOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortMode>("best");

  const [maxPrice, setMaxPrice] = useState(2400);
  const [stopsFilters, setStopsFilters] = useState<StopsFilter[]>(["any"]);
  const [airlineFilters, setAirlineFilters] = useState<string[]>([]);
  const [maxDuration, setMaxDuration] = useState(24);

  useEffect(() => {
    doSearch(initialFromCode, initialToCode, initialDate, initialTripType, initialReturnDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(
    fromCode: string,
    toCode: string,
    searchDate: string,
    mode: TripType,
    inboundDate: string,
  ) {
    setLoading(true);
    setError("");
    setOffers([]);
    setReturnOffers([]);

    try {
      const outboundPromise = searchFlights({ from: fromCode, to: toCode, date: searchDate, provider: "auto" });
      const inboundPromise = mode === "return"
        ? searchFlights({ from: toCode, to: fromCode, date: inboundDate, provider: "auto" })
        : Promise.resolve(null);
      const [outboundResult, inboundResult] = await Promise.all([outboundPromise, inboundPromise]);

      setOffers(outboundResult.offers);
      setReturnOffers(inboundResult?.offers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();

    const searchParams = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      fromName: from.cityName || from.name,
      toName: to.cityName || to.name,
      tripType,
      passengers: String(passengers),
    });

    if (tripType === "return") {
      searchParams.set("returnDate", returnDate);
    }

    navigate(`/search?${searchParams.toString()}`);
    doSearch(from.code, to.code, date, tripType, returnDate);
  }

  function openPlanner(pair: FlightPair) {
    const plannerParams = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      fromName: from.cityName || from.name,
      toName: to.cityName || to.name,
      destination: to.cityName || to.name,
    });

    sessionStorage.setItem("skynode:selectedFlight", JSON.stringify(pair.outbound));
    navigate(`/planner?${plannerParams.toString()}`);
  }

  function toggleStopsFilter(filter: StopsFilter) {
    setStopsFilters((current) => {
      if (filter === "any") return ["any"];

      const withoutAny = current.filter((item) => item !== "any");
      const next = withoutAny.includes(filter)
        ? withoutAny.filter((item) => item !== filter)
        : [...withoutAny, filter];

      return next.length > 0 ? next : ["any"];
    });
  }

  function toggleAirlineFilter(airline: string) {
    setAirlineFilters((current) =>
      current.includes(airline)
        ? current.filter((item) => item !== airline)
        : [...current, airline],
    );
  }

  const allOffers = [...offers, ...returnOffers];
  const airlines = Array.from(new Set(allOffers.map((o) => o.carrier).filter(Boolean)));
  const pairs = buildPairs(offers, returnOffers, tripType);
  const filtered = pairs.filter((pair) => {
    const pairOffers = [pair.outbound, pair.inbound].filter((offer): offer is FlightOffer => Boolean(offer));

    if (pairPrice(pair) > maxPrice) return false;
    if (pairOffers.some((offer) => estimateOfferDurationHours(offer) > maxDuration)) return false;
    if (!pairOffers.every((offer) => matchesStopsFilter(offer, stopsFilters))) return false;
    if (
      airlineFilters.length > 0 &&
      !pairOffers.some((offer) => airlineFilters.some((airline) => offer.carrier?.includes(airline)))
    ) {
      return false;
    }

    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price") return pairPrice(a) - pairPrice(b);
    if (sort === "duration") return pairDurationHours(a) - pairDurationHours(b);
    if (sort === "earliest") return pairEarliestMinutes(a) - pairEarliestMinutes(b);
    return pairPrice(a) + pairDurationHours(a) * 12 - (pairPrice(b) + pairDurationHours(b) * 12);
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <div className="border-b border-slate-200 bg-white px-6 pb-6 pt-20">
        <div className="mx-auto max-w-7xl">
          <form onSubmit={handleSearch}>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-900">
              <label className="relative flex items-center">
                <select
                  value={tripType}
                  onChange={(event) => setTripType(event.target.value as TripType)}
                  className="appearance-none bg-transparent pr-6 outline-none"
                  aria-label="Trip type"
                >
                  <option value="return">Return</option>
                  <option value="one-way">One way</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-500" />
              </label>

              <span>Economy</span>

              <label className="relative flex items-center gap-2">
                <User className="h-4 w-4" />
                <select
                  value={passengers}
                  onChange={(event) => setPassengers(Number(event.target.value))}
                  className="appearance-none bg-transparent pr-6 outline-none"
                  aria-label="Passengers"
                >
                  {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "Passenger" : "Passengers"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-500" />
              </label>
            </div>

            <div className="grid gap-2 lg:grid-cols-[1fr_1fr_220px_220px_auto]">
              <div className="rounded border border-slate-300 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <ChipPlacePicker label="From" value={from} onChange={setFrom} />
                </div>
              </div>

              <div className="rounded border border-slate-300 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <ChipPlacePicker label="To" value={to} onChange={setTo} />
                </div>
              </div>

              <label className="rounded border border-slate-300 bg-white px-3 py-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Departure</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setDate(nextDate);
                    if (returnDate < nextDate) setReturnDate(nextDate);
                  }}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
                  required
                />
              </label>

              <label className="rounded border border-slate-300 bg-white px-3 py-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Return</span>
                {tripType === "return" ? (
                  <input
                    type="date"
                    value={returnDate}
                    min={date}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
                    required
                  />
                ) : (
                  <span className="block py-0.5 text-sm font-bold text-slate-400">One way</span>
                )}
              </label>

              <button
                type="submit"
                className="rounded bg-blue-600 px-7 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700"
              >
                <Search className="mr-2 inline h-4 w-4" />
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[268px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-center justify-between">
                <p className="font-black text-slate-900">Set up price alerts</p>
                <span className="rounded-full bg-slate-300 px-5 py-2" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">Receive alerts when the prices for this route change.</p>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-black text-slate-900">
                  {stopsFilters.some((filter) => filter !== "any") || airlineFilters.length > 0 ? "Filters active" : "Filters"}
                </p>
                <button
                  onClick={() => { setStopsFilters(["any"]); setAirlineFilters([]); setMaxPrice(2400); }}
                  className="text-sm font-bold text-slate-700 underline"
                >
                  Clear
                </button>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                  <p className="font-bold text-slate-900">Price</p>
                </div>
                <input
                  type="range"
                  min={200}
                  max={2400}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>$200</span>
                  <span>${maxPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-6 border-t border-slate-200 pt-6">
                <p className="mb-3 font-bold text-slate-900">Stops</p>
                {[
                  { label: "Any", val: "any" },
                  { label: "Direct", val: "direct" },
                  { label: "Up to 1 stop", val: "up-to-1" },
                  { label: "Up to 2 stops", val: "up-to-2" },
                ].map((item) => (
                  <label key={item.val} className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={stopsFilters.includes(item.val as StopsFilter)}
                      onChange={() => toggleStopsFilter(item.val as StopsFilter)}
                      className="h-5 w-5 accent-blue-600"
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              {airlines.length > 0 && (
                <div className="mb-6 border-t border-slate-200 pt-6">
                  <p className="mb-3 font-bold text-slate-900">Airlines</p>
                  {airlines.slice(0, 8).map((airline) => (
                    <label key={airline} className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={airlineFilters.includes(airline)}
                        onChange={() => toggleAirlineFilter(airline)}
                        className="h-5 w-5 accent-blue-600"
                      />
                      <span className="truncate">{airline}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 pt-6">
                <p className="mb-3 font-bold text-slate-900">Duration</p>
                <input
                  type="range"
                  min={6}
                  max={24}
                  value={maxDuration}
                  onChange={(event) => setMaxDuration(Number(event.target.value))}
                  className="w-full accent-blue-600"
                />
                <p className="mt-1 text-xs text-slate-500">Up to {maxDuration} hours</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-4 grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-4">
            {(["best", "price", "duration", "earliest"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSort(mode)}
                className={`px-5 py-4 text-left text-sm font-black capitalize transition-colors ${
                  sort === mode ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-900 hover:bg-slate-50"
                }`}
              >
                {mode === "price" ? "Cheapest" : mode === "duration" ? "Fastest" : mode === "earliest" ? "Earliest" : "Best"}
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  {mode === "duration"
                    ? "Shortest route"
                    : mode === "earliest"
                      ? "First departure"
                      : sorted[0]
                        ? `$${pairPrice(sorted[0]).toLocaleString()}`
                        : "No price"}
                </span>
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => <SkeletonCard key={item} />)}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
              <p className="mb-1 font-black text-red-600">Search failed</p>
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => doSearch(from.code, to.code, date, tripType, returnDate)}
                className="mt-4 rounded-full bg-red-500 px-5 py-2 text-sm font-bold text-white hover:bg-red-600"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
              <Plane className="mx-auto mb-4 h-12 w-12 text-slate-200" />
              <p className="mb-2 text-lg font-black text-slate-900">No flights found</p>
              <p className="text-sm text-slate-500">Try a different date, route, or adjust your filters.</p>
            </div>
          )}

          {!loading && !error && sorted.length > 0 && (
            <div className="space-y-4">
              {sorted.map((pair, index) => {
                const totalPrice = pairPrice(pair);
                const displayPrice = totalPrice >= 9999
                  ? pair.outbound.priceText || pair.inbound?.priceText || "--"
                  : `$${totalPrice.toLocaleString()}`;
                return (
                  <div
                    key={`${pair.outbound.carrier}-${pair.outbound.departureTime}-${pair.inbound?.departureTime || "one-way"}-${index}`}
                    className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md lg:grid-cols-[1fr_240px]"
                  >
                    <div className="divide-y divide-dashed divide-slate-200 px-4">
                      <FlightSegment label="Outbound" date={date} offer={pair.outbound} origin={from} destination={to} direction="outbound" />
                      {tripType === "return" && (
                        <FlightSegment label="Inbound" date={returnDate} offer={pair.inbound} origin={to} destination={from} direction="inbound" />
                      )}
                      <div className="flex items-center gap-4 py-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" /> 1 carry-on</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Synced route</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center border-t border-slate-200 bg-white p-5 text-center lg:border-l lg:border-t-0">
                      <p className="text-3xl font-black text-slate-950">{displayPrice}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tripType === "return" ? "Return total estimate" : "One-way estimate"}
                      </p>

                      <button
                        type="button"
                        onClick={() => openPlanner(pair)}
                        className="mt-8 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                      >
                        Select and plan trip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
