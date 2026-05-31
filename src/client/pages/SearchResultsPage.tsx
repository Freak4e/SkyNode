import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Bus,
  ChevronDown,
  Clock,
  Luggage,
  MapPin,
  Plane,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import { searchFlights } from "../api/flightsApi";
import { Footer } from "../components/Footer";
import { MultiPlacePicker } from "../components/MultiPlacePicker";
import { Navbar } from "../components/Navbar";
import type { CurrencyCode, FlightOffer, Place } from "../../shared/types.js";
import {
  estimateDurationMinutes,
  parseClockMinutes,
  parseDurationMinutes,
  parseStopsCount,
  resolveStopsCount,
} from "../../shared/flightParsing.js";
import {
  currencyChangedEvent,
  currencyOptions,
  formatCurrencyAmount,
  getStoredCurrency,
  normalizeCurrency,
} from "../utils/currency.js";

const today = new Date().toISOString().slice(0, 10);

type SortMode = "best" | "price" | "duration" | "earliest";
type TripType = "one-way" | "return";
type StopsFilter = "any" | "direct" | "up-to-1" | "up-to-2";
type FlightPair = {
  outbound: FlightOffer;
  inbound?: FlightOffer;
};
type LayoverInfo = {
  durationMinutes: number;
  city: string;
  airport: string;
  code: string;
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

const AIRLINE_LOGO_CODES: Record<string, string> = {
  ANA: "NH",
  "All Nippon": "NH",
  "Japan Airlines": "JL",
  "Korean Air": "KE",
  "Cathay Pacific": "CX",
  Delta: "DL",
  Lufthansa: "LH",
  "Air France": "AF",
  KLM: "KL",
  "British Airways": "BA",
  Emirates: "EK",
  "Qatar Airways": "QR",
  "Turkish Airlines": "TK",
  Ryanair: "FR",
  easyJet: "U2",
  Wizz: "W6",
  "TAP Air Portugal": "TP",
  Iberia: "IB",
  Vueling: "VY",
  "United Airlines": "UA",
  "American Airlines": "AA",
  "TAP Portugal": "TP",
  "TAP Air": "TP",
  Transavia: "HV",
  Volotea: "V7",
  "Air Serbia": "JU",
  "Austrian Airlines": "OS",
  Swiss: "LX",
  "Brussels Airlines": "SN",
  "SAS": "SK",
  Norwegian: "DY",
  Finnair: "AY",
  LOT: "LO",
};

const CURRENCY_RATES_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  CHF: 0.9,
  CAD: 1.36,
  AUD: 1.51,
  CNY: 7.24,
};

const AIRLINE_HUB_CONNECTIONS: Array<{ match: string; layover: LayoverInfo }> = [
  { match: "tap",              layover: { durationMinutes: 150, city: "Lisbon",    airport: "Lisbon Portela",                code: "LIS" } },
  { match: "lufthansa",        layover: { durationMinutes: 120, city: "Frankfurt", airport: "Frankfurt am Main",             code: "FRA" } },
  { match: "air france",       layover: { durationMinutes: 120, city: "Paris",     airport: "Paris Charles de Gaulle",       code: "CDG" } },
  { match: "klm",              layover: { durationMinutes: 120, city: "Amsterdam", airport: "Amsterdam Schiphol",            code: "AMS" } },
  { match: "british airways",  layover: { durationMinutes: 130, city: "London",    airport: "London Heathrow",               code: "LHR" } },
  { match: "iberia",           layover: { durationMinutes: 130, city: "Madrid",    airport: "Adolfo Suarez Madrid-Barajas",  code: "MAD" } },
  { match: "vueling",          layover: { durationMinutes: 110, city: "Barcelona", airport: "Barcelona El Prat",             code: "BCN" } },
  { match: "swiss",            layover: { durationMinutes: 110, city: "Zurich",    airport: "Zurich Airport",                code: "ZRH" } },
  { match: "austrian",         layover: { durationMinutes: 110, city: "Vienna",    airport: "Vienna International",          code: "VIE" } },
  { match: "brussels",         layover: { durationMinutes: 110, city: "Brussels",  airport: "Brussels Airport",              code: "BRU" } },
  { match: "finnair",          layover: { durationMinutes: 130, city: "Helsinki",  airport: "Helsinki-Vantaa",               code: "HEL" } },
  { match: "sas",              layover: { durationMinutes: 120, city: "Copenhagen",airport: "Copenhagen Kastrup",            code: "CPH" } },
  { match: "norwegian",        layover: { durationMinutes: 120, city: "Oslo",      airport: "Oslo Gardermoen",               code: "OSL" } },
  { match: "lot",              layover: { durationMinutes: 120, city: "Warsaw",    airport: "Warsaw Chopin",                 code: "WAW" } },
  { match: "turkish",          layover: { durationMinutes: 180, city: "Istanbul",  airport: "Istanbul Airport",              code: "IST" } },
  { match: "emirates",         layover: { durationMinutes: 200, city: "Dubai",     airport: "Dubai International",           code: "DXB" } },
  { match: "qatar",            layover: { durationMinutes: 180, city: "Doha",      airport: "Hamad International",           code: "DOH" } },
  { match: "delta",            layover: { durationMinutes: 150, city: "Atlanta",   airport: "Hartsfield-Jackson Atlanta",    code: "ATL" } },
  { match: "united",           layover: { durationMinutes: 150, city: "Newark",    airport: "Newark Liberty International",  code: "EWR" } },
  { match: "american",         layover: { durationMinutes: 150, city: "Dallas",    airport: "Dallas/Fort Worth International", code: "DFW" } },
  { match: "ana",              layover: { durationMinutes: 180, city: "Tokyo",     airport: "Tokyo Haneda",                  code: "HND" } },
  { match: "japan airlines",   layover: { durationMinutes: 180, city: "Tokyo",     airport: "Tokyo Haneda",                  code: "HND" } },
  { match: "korean air",       layover: { durationMinutes: 180, city: "Seoul",     airport: "Incheon International",         code: "ICN" } },
  { match: "cathay",           layover: { durationMinutes: 180, city: "Hong Kong", airport: "Hong Kong International",       code: "HKG" } },
];
const GENERIC_LAYOVER: LayoverInfo = {
  durationMinutes: 120,
  city: "Connecting airport",
  airport: "Layover stop",
  code: "—",
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

function getAirlineLogoCode(carrier: string): string | null {
  const iataMatch = carrier.match(/\b[A-Z0-9]{2}\b/);
  if (iataMatch) return iataMatch[0];

  for (const key of Object.keys(AIRLINE_LOGO_CODES)) {
    if (carrier.toLowerCase().includes(key.toLowerCase())) return AIRLINE_LOGO_CODES[key];
  }

  return null;
}

function getAirlineLogoUrl(carrier: string): string | null {
  const code = getAirlineLogoCode(carrier);
  return code ? `https://pics.avs.io/64/64/${code}.png` : null;
}

function isGroundTransportOffer(offer: FlightOffer | undefined): boolean {
  const text = `${offer?.carrier || ""} ${offer?.stopsText || ""}`.toLowerCase();
  return text.includes("flixbus") || text.includes("bus");
}

function isGroundTransportPair(pair: FlightPair): boolean {
  return isGroundTransportOffer(pair.outbound) || isGroundTransportOffer(pair.inbound);
}

function CarrierLogo({ carrier }: { carrier: string }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = getAirlineLogoUrl(carrier);

  if (!logoUrl || logoFailed) {
    return <>{getAirlineAbbr(carrier)}</>;
  }

  return (
    <img
      src={logoUrl}
      alt={`${carrier} logo`}
      className="h-full w-full bg-white object-contain"
      onError={() => setLogoFailed(true)}
    />
  );
}

function parsePrice(text: string): number {
  const match = text.replace(/,/g, "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 9999;
}

function pairPrice(pair: FlightPair): number {
  return parsePrice(pair.outbound.priceText) + (pair.inbound ? parsePrice(pair.inbound.priceText) : 0);
}

function convertUsdAmount(amount: number, currency: CurrencyCode): number {
  return amount * CURRENCY_RATES_FROM_USD[currency];
}

function offerDisplayAmount(offer: FlightOffer, currency: CurrencyCode): number {
  const amount = parsePrice(offer.priceText);

  if (amount >= 9999) return amount;
  if (offer.source === "travelpayouts") return amount;

  return convertUsdAmount(amount, currency);
}

function formatDisplayPrice(pair: FlightPair, currency: CurrencyCode): string {
  const outboundPrice = offerDisplayAmount(pair.outbound, currency);
  const inboundPrice = pair.inbound ? offerDisplayAmount(pair.inbound, currency) : 0;
  const totalPrice = outboundPrice + inboundPrice;

  if (totalPrice >= 9999) {
    return pair.outbound.priceText || pair.inbound?.priceText || "--";
  }

  return formatCurrencyAmount(convertUsdAmount(totalPrice, currency), currency);
}

function formatClockTime(value: string): string {
  const minutes = parseClockMinutes(value);

  if (minutes === null) {
    return value.replace(/\s*\b(?:AM|PM)\b\.?/gi, "").trim();
  }

  const dayOffset = Math.floor(minutes / (24 * 60));
  const clock = minutes % (24 * 60);
  const hours = Math.floor(clock / 60);
  const mins = clock % 60;

  const formatted = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  return dayOffset > 0 ? `${formatted}+${dayOffset}` : formatted;
}

function estimateOfferDurationMinutes(offer: FlightOffer): number {
  const stopsCount = resolveStopsCount(offer);
  const estimated = estimateDurationMinutes({
    durationMinutes: offer.durationMinutes,
    durationText: offer.durationText,
    departureTime: offer.departureTime,
    arrivalTime: offer.arrivalTime,
    stopsCount,
  });

  return estimated > 0 ? estimated : 24 * 60;
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
  return parseClockMinutes(pair.outbound.departureTime) ?? 24 * 60;
}

function matchesStopsFilter(offer: FlightOffer, filters: StopsFilter[]): boolean {
  if (filters.length === 0 || filters.includes("any")) return true;

  const stops = resolveStopsCount(offer);
  if (stops === null) return true;

  return filters.some((filter) => {
    if (filter === "direct") return stops === 0;
    if (filter === "up-to-1") return stops <= 1;
    if (filter === "up-to-2") return stops <= 2;
    return true;
  });
}

function displayStopsText(offer: FlightOffer): string {
  const stops = resolveStopsCount(offer);

  if (stops === 0) return "Direct";
  if (typeof stops === "number") return stops === 1 ? "1 stop" : `${stops} stops`;

  const fromText = offer.stopsText?.replace(/non[- ]?stop/gi, "Direct").trim();
  if (fromText && !parseDurationMinutes(fromText)) return fromText;

  return "Flight";
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function splitEstimatedFlightMinutes(totalFlightMinutes: number, segmentCount: number): number[] {
  if (segmentCount <= 1) return [Math.max(45, totalFlightMinutes)];

  if (segmentCount === 2) {
    const firstLeg = Math.min(totalFlightMinutes - 45, roundToNearestFive(totalFlightMinutes * 0.55));
    return [Math.max(45, firstLeg), Math.max(45, totalFlightMinutes - firstLeg)];
  }

  const baseMinutes = Math.max(45, Math.floor(totalFlightMinutes / segmentCount));
  const minutes = Array.from({ length: segmentCount }, () => baseMinutes);
  const assignedMinutes = baseMinutes * segmentCount;
  minutes[minutes.length - 1] += Math.max(0, totalFlightMinutes - assignedMinutes);

  return minutes;
}

function roundToNearestFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function layoverDetails(offer: FlightOffer, origin?: Place, destination?: Place): LayoverInfo[] {
  const realLayovers = (offer.layovers || []).filter((layover) => !isOriginOrDestinationCode(layover.code, origin, destination));

  if (realLayovers.length > 0) {
    return realLayovers.map((layover) => ({
      city: layover.city || layover.airport.split(" Airport")[0] || layover.airport,
      airport: layover.airport,
      code: layover.code,
      durationMinutes: layover.durationMinutes ?? GENERIC_LAYOVER.durationMinutes,
    }));
  }

  const stops = resolveStopsCount(offer);

  if (stops === null || stops < 1) return [];

  const airlineHub = findAirlineHub(offer.carrier);

  return Array.from({ length: stops }, (_, index) => {
    if (index === 0 && airlineHub && !isOriginOrDestination(airlineHub, origin, destination)) {
      return {
        ...airlineHub,
        durationMinutes: airlineHub.durationMinutes + index * 20,
      };
    }

    return {
      ...GENERIC_LAYOVER,
      durationMinutes: GENERIC_LAYOVER.durationMinutes + index * 30,
    };
  });
}

function isOriginOrDestinationCode(code: string, origin?: Place, destination?: Place): boolean {
  if (!code || code === "—") return false;
  const codes = [origin?.code, destination?.code].filter(Boolean).map((value) => value!.toUpperCase());
  return codes.includes(code.toUpperCase());
}

function findAirlineHub(carrier: string | undefined): LayoverInfo | null {
  if (!carrier) return null;

  const lower = carrier.toLowerCase();
  const match = AIRLINE_HUB_CONNECTIONS.find((entry) => lower.includes(entry.match));

  return match ? match.layover : null;
}

function isOriginOrDestination(layover: LayoverInfo, origin?: Place, destination?: Place): boolean {
  const codes = [origin?.code, destination?.code].filter(Boolean).map((code) => code!.toUpperCase());
  return codes.includes(layover.code.toUpperCase());
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

function addMinutesToClock(value: string, minutesToAdd: number): string {
  const minutes = parseClockMinutes(value);

  if (minutes === null) return "--:--";

  const next = (minutes + minutesToAdd) % (24 * 60);
  const hours = Math.floor(next / 60);
  const mins = next % 60;

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

type FlightLeg = {
  departureTime: string;
  arrivalTime: string;
  carrier?: string;
  departureCity: string;
  departureCode: string;
  departureAirport: string;
  arrivalCity: string;
  arrivalCode: string;
  arrivalAirport: string;
  flightMinutes: number;
};

type SegmentBlock = {
  label: string;
  date: string;
  offer: FlightOffer;
  origin: Place;
  destination: Place;
  legs: FlightLeg[];
  layovers: LayoverInfo[];
};

function buildSegmentBlocks(
  pair: FlightPair,
  tripType: TripType,
  outboundDate: string,
  inboundDate: string,
  from: Place,
  to: Place,
): SegmentBlock[] {
  const blocks: SegmentBlock[] = [];

  blocks.push(buildSegmentBlock("Outbound", outboundDate, pair.outbound, from, to));

  if (tripType === "return" && pair.inbound) {
    blocks.push(buildSegmentBlock("Inbound", inboundDate, pair.inbound, to, from));
  }

  return blocks;
}

function buildSegmentBlock(
  label: string,
  date: string,
  offer: FlightOffer,
  origin: Place,
  destination: Place,
): SegmentBlock {
  const layovers = layoverDetails(offer, origin, destination);

  if (offer.segments && offer.segments.length > 1) {
    const legs: FlightLeg[] = offer.segments.map((segment) => ({
      departureTime: segment.departureTime ? formatClockTime(segment.departureTime) : "--:--",
      arrivalTime: segment.arrivalTime ? formatClockTime(segment.arrivalTime) : "--:--",
      carrier: segment.carrier,
      departureCity: segment.originAirport || segment.originCode,
      departureCode: segment.originCode || origin.code,
      departureAirport: segment.originAirport || origin.name,
      arrivalCity: segment.destinationAirport || segment.destinationCode,
      arrivalCode: segment.destinationCode || destination.code,
      arrivalAirport: segment.destinationAirport || destination.name,
      flightMinutes: segment.durationMinutes || 60,
    }));

    return { label, date, offer, origin, destination, legs, layovers };
  }

  if (offer.segments?.length === 1 && layovers.length > 0) {
    const segment = offer.segments[0];
    const layover = layovers[0];
    const totalMinutes = offer.durationMinutes || estimateOfferDurationMinutes(offer);
    const layoverMinutes = layover.durationMinutes || 90;
    const flightMinutes = Math.max(45, Math.floor((totalMinutes - layoverMinutes) / 2));

    const legs: FlightLeg[] = [
      {
        departureTime: segment.departureTime ? formatClockTime(segment.departureTime) : "--:--",
        arrivalTime: segment.arrivalTime ? formatClockTime(segment.arrivalTime) : "--:--",
        departureCity: segment.originAirport || origin.cityName || origin.name,
        departureCode: segment.originCode || origin.code,
        departureAirport: segment.originAirport || origin.name,
        arrivalCity: layover.city || layover.airport,
        arrivalCode: layover.code,
        arrivalAirport: layover.airport,
        flightMinutes,
      },
      {
        departureTime: segment.departureTime ? formatClockTime(segment.departureTime) : "--:--",
        arrivalTime: segment.arrivalTime ? formatClockTime(segment.arrivalTime) : "--:--",
        departureCity: layover.city || layover.airport,
        departureCode: layover.code,
        departureAirport: layover.airport,
        arrivalCity: segment.destinationAirport || destination.cityName || destination.name,
        arrivalCode: segment.destinationCode || destination.code,
        arrivalAirport: segment.destinationAirport || destination.name,
        flightMinutes,
      },
    ];

    return { label, date, offer, origin, destination, legs, layovers };
  }

  if (offer.segments?.length === 1) {
    const segment = offer.segments[0];
    const legs: FlightLeg[] = [{
      departureTime: segment.departureTime ? formatClockTime(segment.departureTime) : "--:--",
      arrivalTime: segment.arrivalTime ? formatClockTime(segment.arrivalTime) : "--:--",
      departureCity: segment.originAirport || origin.cityName || origin.name,
      departureCode: segment.originCode || origin.code,
      departureAirport: segment.originAirport || origin.name,
      arrivalCity: segment.destinationAirport || destination.cityName || destination.name,
      arrivalCode: segment.destinationCode || destination.code,
      arrivalAirport: segment.destinationAirport || destination.name,
      flightMinutes: segment.durationMinutes || estimateOfferDurationMinutes(offer),
    }];

    return { label, date, offer, origin, destination, legs, layovers };
  }

  const totalDuration = estimateOfferDurationMinutes(offer);
  const totalLayoverMinutes = layovers.reduce((sum, layover) => sum + layover.durationMinutes, 0);
  const segmentCount = layovers.length + 1;
  const flightMinutesBySegment = splitEstimatedFlightMinutes(
    Math.max(45, totalDuration - totalLayoverMinutes),
    segmentCount,
  );

  let currentTime = offer.departureTime ? formatClockTime(offer.departureTime) : "--:--";
  const legs: FlightLeg[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const isFirst = index === 0;
    const isLast = index === segmentCount - 1;
    const layover = layovers[index - 1];
    const previousLayover = layovers[index];

    const legDepartureTime = isFirst
      ? currentTime
      : addMinutesToClock(currentTime, layover.durationMinutes);

    const flightMinutes = flightMinutesBySegment[index] ?? flightMinutesBySegment[flightMinutesBySegment.length - 1] ?? 60;
    const legArrivalTime = isLast && offer.arrivalTime
      ? formatClockTime(offer.arrivalTime)
      : addMinutesToClock(legDepartureTime, flightMinutes);

    const legOriginCity = isFirst ? (origin.cityName || origin.name) : layover.city;
    const legOriginCode = isFirst ? origin.code : layover.code;
    const legOriginAirport = isFirst ? origin.name : layover.airport;

    const legDestinationCity = isLast ? (destination.cityName || destination.name) : previousLayover.city;
    const legDestinationCode = isLast ? destination.code : previousLayover.code;
    const legDestinationAirport = isLast ? destination.name : previousLayover.airport;

    legs.push({
      departureTime: legDepartureTime,
      arrivalTime: legArrivalTime,
      departureCity: legOriginCity,
      departureCode: legOriginCode,
      departureAirport: legOriginAirport,
      arrivalCity: legDestinationCity,
      arrivalCode: legDestinationCode,
      arrivalAirport: legDestinationAirport,
      flightMinutes,
    });

    currentTime = legArrivalTime;
  }

  return { label, date, offer, origin, destination, legs, layovers };
}

function TripDetailsModal({
  pair,
  tripType,
  outboundDate,
  inboundDate,
  from,
  to,
  passengers,
  onClose,
}: {
  pair: FlightPair;
  tripType: TripType;
  outboundDate: string;
  inboundDate: string;
  from: Place;
  to: Place;
  passengers: number;
  onClose: () => void;
}) {
  const blocks = buildSegmentBlocks(pair, tripType, outboundDate, inboundDate, from, to);

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-slate-950">Trip details</h2>
          <div className="flex items-center gap-4 text-sm font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{passengers}</span>
            <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />1</span>
            <span className="flex items-center gap-1.5"><Luggage className="h-4 w-4" />0</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="Close trip details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="max-h-[75vh] space-y-8 overflow-y-auto bg-slate-100 px-6 py-6">
          {blocks.map((block) => (
            <SegmentBlockView key={`${block.label}-${block.offer.departureTime}-${block.offer.arrivalTime}`} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentBlockView({ block }: { block: SegmentBlock }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{block.label}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {block.origin.cityName || block.origin.name}
            <span className="mx-2 text-slate-400">→</span>
            {block.destination.cityName || block.destination.name}
          </h3>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          {formatDuration(block.offer)}
        </span>
      </div>

      <div className="space-y-3">
        {block.legs.map((leg, index) => (
          <div key={`${leg.departureCode}-${leg.arrivalCode}-${index}`}>
            <FlightLegCard leg={leg} date={block.date} carrier={leg.carrier || block.offer.carrier || "Unknown airline"} />

            {index < block.legs.length - 1 && (
              <div className="flex items-center justify-center py-4">
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {formatMinutes(block.layovers[index].durationMinutes)} layover
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FlightLegCard({ leg, date, carrier }: { leg: FlightLeg; date: string; carrier: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-stretch px-5 py-5">
        <div className="flex w-20 flex-col justify-between text-right">
          <div>
            <p className="text-base font-black leading-none text-slate-950">{leg.departureTime}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDisplayDate(date)}</p>
          </div>
          <div className="py-3 text-sm font-black text-slate-500">
            {formatMinutes(leg.flightMinutes)}
          </div>
          <div>
            <p className="text-base font-black leading-none text-slate-950">{leg.arrivalTime}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDisplayDate(date)}</p>
          </div>
        </div>

        <div className="relative mx-4 flex w-3 flex-col items-center justify-between">
          <span className="absolute top-2 bottom-2 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
          <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
          <span className="relative z-10 rounded-full bg-white p-1 ring-1 ring-slate-200">
            <Plane className="h-3.5 w-3.5 rotate-90 text-blue-600" />
          </span>
          <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">
              {leg.departureCity} <span className="text-slate-400">·</span> {leg.departureCode}
            </p>
            <p className="mt-1 text-sm text-slate-500">{leg.departureAirport}</p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-slate-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white text-[10px] font-black text-blue-700 ring-1 ring-slate-200">
              <CarrierLogo carrier={carrier} />
            </span>
            <span className="flex-1 truncate text-sm font-bold text-slate-800">{carrier}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>

          <div>
            <p className="text-sm font-black text-slate-950">
              {leg.arrivalCity} <span className="text-slate-400">·</span> {leg.arrivalCode}
            </p>
            <p className="mt-1 text-sm text-slate-500">{leg.arrivalAirport}</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-sm text-slate-600">
          <p>Operated by {carrier}. Economy cabin. Standard carry-on included.</p>
        </div>
      )}
    </div>
  );
}

function FlightSearchLoader({ from, to }: { from: Place; to: Place }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <SkySvgScene />
      <div className="px-6 py-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600">SkyNode</p>
        <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
          Searching flights from {from.cityName || from.name} to {to.cityName || to.name}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          Comparing live fares
          <span className="inline-flex items-center gap-1">
            <span className="plane-loader-sky__dot" />
            <span className="plane-loader-sky__dot" />
            <span className="plane-loader-sky__dot" />
          </span>
        </p>
      </div>
    </div>
  );
}

function SkySvgScene() {
  return (
    <svg
      viewBox="0 0 600 280"
      preserveAspectRatio="xMidYMid slice"
      className="block h-56 w-full sm:h-64"
      role="img"
      aria-label="Plane flying through clouds"
    >
      <defs>
        <linearGradient id="sky-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="0.78" cy="0.18" r="0.4">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <path id="flight-path" d="M 30 220 C 180 60, 420 60, 570 220" fill="none" />
        <symbol id="cloud-shape" viewBox="0 0 80 30">
          <ellipse cx="20" cy="20" rx="20" ry="10" fill="white" />
          <ellipse cx="40" cy="14" rx="22" ry="14" fill="white" />
          <ellipse cx="62" cy="20" rx="18" ry="10" fill="white" />
        </symbol>
        <symbol id="plane-shape" viewBox="-40 -40 80 80">
          <g fill="#ffffff" stroke="#1e3a8a" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M -30 0 L -8 -3 L 5 -22 L 12 -22 L 8 -5 L 28 -7 L 32 -2 L 28 2 L 8 0 L 14 18 L 9 20 L -2 4 L -16 6 L -20 12 L -24 12 L -22 4 L -28 2 Z" />
          </g>
        </symbol>
      </defs>

      <rect width="600" height="280" fill="url(#sky-gradient)" />
      <rect width="600" height="280" fill="url(#sun-glow)" />

      <g opacity="0.95">
        <use href="#cloud-shape" width="120" height="44" y="40">
          <animate attributeName="x" from="-140" to="640" dur="18s" repeatCount="indefinite" />
        </use>
        <use href="#cloud-shape" width="80" height="30" y="170" opacity="0.85">
          <animate attributeName="x" from="-100" to="660" dur="14s" repeatCount="indefinite" begin="-3s" />
        </use>
        <use href="#cloud-shape" width="160" height="60" y="100" opacity="0.85">
          <animate attributeName="x" from="-200" to="720" dur="22s" repeatCount="indefinite" begin="-7s" />
        </use>
        <use href="#cloud-shape" width="100" height="36" y="210" opacity="0.7">
          <animate attributeName="x" from="-120" to="700" dur="16s" repeatCount="indefinite" begin="-10s" />
        </use>
        <use href="#cloud-shape" width="70" height="24" y="20" opacity="0.65">
          <animate attributeName="x" from="-90" to="660" dur="12s" repeatCount="indefinite" begin="-5s" />
        </use>
      </g>

      <path
        d="M 30 220 C 180 60, 420 60, 570 220"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="6 9"
        fill="none"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1.6s" repeatCount="indefinite" />
      </path>

      <circle cx="30" cy="220" r="5" fill="white" stroke="#1e3a8a" strokeWidth="1.5" />
      <circle cx="570" cy="220" r="5" fill="white" stroke="#1e3a8a" strokeWidth="1.5" />

      <g>
        <use href="#plane-shape" width="54" height="54" x="-27" y="-27">
          <animate attributeName="opacity" values="1;1" dur="6s" repeatCount="indefinite" />
        </use>
        <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
          <mpath href="#flight-path" />
        </animateMotion>
      </g>
    </svg>
  );
}

function FlightSegment({
  label,
  date,
  offer,
  origin,
  destination,
  direction,
  onShowDetails,
}: {
  label: string;
  date: string;
  offer?: FlightOffer;
  origin: Place;
  destination: Place;
  direction: "outbound" | "inbound";
  onShowDetails: () => void;
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
  const layovers = layoverDetails(offer, origin, destination);
  const isGroundTransport = isGroundTransportOffer(offer);
  const TransportIcon = isGroundTransport ? Bus : Plane;

  return (
    <div className="py-5">
      <p className="mb-3 text-xs font-semibold text-slate-500">{formatDisplayDate(date)} · {label}</p>
      <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3">
        <div>
          <p className="text-xl font-black leading-none text-slate-950">{offer.departureTime ? formatClockTime(offer.departureTime) : "--:--"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{origin.code}</p>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onShowDetails}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                title="Open trip details"
              >
                {formatDuration(offer)}
              </button>
              <TransportIcon className={`h-4 w-4 text-blue-500 ${isGroundTransport ? "" : planeDirectionClass}`} />
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
                        <p key={`${layover.code}-${layover.durationMinutes}`}>
                          {formatMinutes(layover.durationMinutes)} layover · {layover.airport} ({layover.code})
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className={`inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ${getAirlineBg(carrier)} text-[10px] font-black text-white ring-1 ring-slate-200`}>
              <CarrierLogo carrier={carrier} />
            </span>
            <span className="truncate">{carrier}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-black leading-none text-slate-950">{offer.arrivalTime ? formatClockTime(offer.arrivalTime) : "--:--"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{destination.code}</p>
        </div>
      </div>
    </div>
  );
}

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const initialFromCodes = parseCodeParam(params.get("fromAll") || params.get("from") || "JFK");
  const initialToCodes = parseCodeParam(params.get("toAll") || params.get("to") || "HND");
  const initialFromCode = initialFromCodes[0] ?? "JFK";
  const initialToCode = initialToCodes[0] ?? "HND";
  const initialDate = params.get("date") ?? today;
  const initialReturnDate = params.get("returnDate") ?? initialDate;
  const initialTripType = params.get("tripType") === "one-way" ? "one-way" : "return";
  const parsedPassengers = Number(params.get("passengers") || 1);
  const initialPassengers = Number.isFinite(parsedPassengers)
    ? Math.min(Math.max(parsedPassengers, 1), 9)
    : 1;
  const initialFromName = params.get("fromName") ?? "New York";
  const initialToName = params.get("toName") ?? "Tokyo";

  const [fromPlaces, setFromPlaces] = useState<Place[]>(() => initialFromCodes.map((code, index) => ({ code, name: index === 0 ? initialFromName : code, cityName: index === 0 ? initialFromName : code, countryName: "", type: "city" })));
  const [toPlaces, setToPlaces] = useState<Place[]>(() => initialToCodes.map((code, index) => ({ code, name: index === 0 ? initialToName : code, cityName: index === 0 ? initialToName : code, countryName: "", type: "city" })));
  const from = fromPlaces[0];
  const to = toPlaces[0];
  const [date, setDate] = useState(initialDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [tripType, setTripType] = useState<TripType>(initialTripType);
  const [passengers, setPassengers] = useState(initialPassengers);

  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [returnOffers, setReturnOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortMode>("best");
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    const currencyParam = params.get("currency");
    return currencyParam ? normalizeCurrency(currencyParam) : getStoredCurrency();
  });
  const [detailsPair, setDetailsPair] = useState<FlightPair | null>(null);

  const [maxPrice, setMaxPrice] = useState(2400);
  const [stopsFilters, setStopsFilters] = useState<StopsFilter[]>(["any"]);
  const [airlineFilters, setAirlineFilters] = useState<string[]>([]);
  const [maxDuration, setMaxDuration] = useState(24);

  useEffect(() => {
    doSearch(initialFromCodes, initialToCodes, initialDate, initialTripType, initialReturnDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleCurrencyChange = (event: Event) => {
      const nextCurrency = normalizeCurrency((event as CustomEvent<CurrencyCode>).detail);
      setCurrency(nextCurrency);
      doSearch(fromPlaces.map((place) => place.code), toPlaces.map((place) => place.code), date, tripType, returnDate, nextCurrency);
    };

    window.addEventListener(currencyChangedEvent, handleCurrencyChange);
    return () => window.removeEventListener(currencyChangedEvent, handleCurrencyChange);
  }, [fromPlaces, toPlaces, date, tripType, returnDate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(
    fromCodes: string[],
    toCodes: string[],
    searchDate: string,
    mode: TripType,
    inboundDate: string,
    searchCurrency = currency,
  ) {
    setLoading(true);
    setError("");
    setOffers([]);
    setReturnOffers([]);

    try {
      const outboundPromise = searchFlights({ from: fromCodes, to: toCodes, date: searchDate, provider: "auto", currency: searchCurrency });
      const inboundPromise = mode === "return"
        ? searchFlights({ from: toCodes, to: fromCodes, date: inboundDate, provider: "auto", currency: searchCurrency })
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
      from: fromPlaces.map((place) => place.code).join(","),
      to: toPlaces.map((place) => place.code).join(","),
      date,
      fromName: from.cityName || from.name,
      toName: to.cityName || to.name,
      tripType,
      passengers: String(passengers),
      currency,
    });

    if (tripType === "return") {
      searchParams.set("returnDate", returnDate);
    }

    navigate(`/search?${searchParams.toString()}`);
    doSearch(fromPlaces.map((place) => place.code), toPlaces.map((place) => place.code), date, tripType, returnDate);
  }

  function openPlanner(pair: FlightPair) {
    const outboundFrom = placeByCode(fromPlaces, pair.outbound.searchFrom) || from;
    const outboundTo = placeByCode(toPlaces, pair.outbound.searchTo) || to;
    const plannerParams = new URLSearchParams({
      from: outboundFrom.code,
      to: outboundTo.code,
      date,
      fromName: outboundFrom.cityName || outboundFrom.name,
      toName: outboundTo.cityName || outboundTo.name,
      destination: outboundTo.cityName || outboundTo.name,
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
  const sortedByMode = [...filtered].sort((a, b) => {
    if (sort === "price") return pairPrice(a) - pairPrice(b);
    if (sort === "duration") return pairDurationHours(a) - pairDurationHours(b);
    if (sort === "earliest") return pairEarliestMinutes(a) - pairEarliestMinutes(b);
    return pairPrice(a) + pairDurationHours(a) * 12 - (pairPrice(b) + pairDurationHours(b) * 12);
  });
  const flightPairs = sortedByMode.filter((pair) => !isGroundTransportPair(pair));
  const groundTransportPairs = sortedByMode.filter(isGroundTransportPair);
  const sorted = [...flightPairs, ...groundTransportPairs];
  const currencySymbol = currencyOptions.find((option) => option.code === currency)?.symbol || currency;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />

      <div className="app-search-header border-b border-slate-200 bg-white">
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

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_180px_180px_auto]">
              <div className="rounded border border-slate-300 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <MultiPlacePicker label="From" values={fromPlaces} onChange={setFromPlaces} placeholder="Add departure" />
                </div>
              </div>

              <div className="rounded border border-slate-300 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <MultiPlacePicker label="To" values={toPlaces} onChange={setToPlaces} placeholder="Add destination" />
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
                  <p className="font-bold text-slate-900">Price ({currencySymbol})</p>
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
                  <span>{formatCurrencyAmount(convertUsdAmount(200, currency), currency)}</span>
                  <span>{formatCurrencyAmount(convertUsdAmount(maxPrice, currency), currency)}</span>
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
                        ? formatDisplayPrice(sorted[0], currency)
                        : "No price"}
                </span>
              </button>
            ))}
          </div>

          {loading && <FlightSearchLoader from={from} to={to} />}

          {!loading && error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
              <p className="mb-1 font-black text-red-600">Search failed</p>
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => doSearch(fromPlaces.map((place) => place.code), toPlaces.map((place) => place.code), date, tripType, returnDate)}
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
              {flightPairs.map((pair, index) => {
                const displayPrice = formatDisplayPrice(pair, currency);
                const outboundOrigin = placeByCode(fromPlaces, pair.outbound.searchFrom) || from;
                const outboundDestination = placeByCode(toPlaces, pair.outbound.searchTo) || to;
                const inboundOrigin = placeByCode(toPlaces, pair.inbound?.searchFrom) || outboundDestination;
                const inboundDestination = placeByCode(fromPlaces, pair.inbound?.searchTo) || outboundOrigin;
                return (
                  <div
                    key={`${pair.outbound.carrier}-${pair.outbound.departureTime}-${pair.inbound?.departureTime || "one-way"}-${index}`}
                    className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md lg:grid-cols-[1fr_240px]"
                  >
                    <div className="divide-y divide-dashed divide-slate-200 px-4">
                      <FlightSegment label="Outbound" date={date} offer={pair.outbound} origin={outboundOrigin} destination={outboundDestination} direction="outbound" onShowDetails={() => setDetailsPair(pair)} />
                      {tripType === "return" && (
                        <FlightSegment label="Inbound" date={returnDate} offer={pair.inbound} origin={inboundOrigin} destination={inboundDestination} direction="inbound" onShowDetails={() => setDetailsPair(pair)} />
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

              {groundTransportPairs.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    <Bus className="h-4 w-4" />
                    FlixBus / ground transport option shown separately
                  </div>

                  {groundTransportPairs.map((pair, index) => {
                    const displayPrice = formatDisplayPrice(pair, currency);
                    const outboundOrigin = placeByCode(fromPlaces, pair.outbound.searchFrom) || from;
                    const outboundDestination = placeByCode(toPlaces, pair.outbound.searchTo) || to;
                    const inboundOrigin = placeByCode(toPlaces, pair.inbound?.searchFrom) || outboundDestination;
                    const inboundDestination = placeByCode(fromPlaces, pair.inbound?.searchTo) || outboundOrigin;
                    return (
                      <div
                        key={`ground-${pair.outbound.carrier}-${pair.outbound.departureTime}-${pair.inbound?.departureTime || "one-way"}-${index}`}
                        className="grid overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm transition-shadow hover:shadow-md lg:grid-cols-[1fr_240px]"
                      >
                        <div className="divide-y divide-dashed divide-slate-200 px-4">
                          <FlightSegment label="Outbound" date={date} offer={pair.outbound} origin={outboundOrigin} destination={outboundDestination} direction="outbound" onShowDetails={() => setDetailsPair(pair)} />
                          {tripType === "return" && (
                            <FlightSegment label="Inbound" date={returnDate} offer={pair.inbound} origin={inboundOrigin} destination={inboundDestination} direction="inbound" onShowDetails={() => setDetailsPair(pair)} />
                          )}
                          <div className="flex items-center gap-4 py-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Bus className="h-3.5 w-3.5" /> Ground transport</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Separate route option</span>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center border-t border-amber-100 bg-amber-50/40 p-5 text-center lg:border-l lg:border-t-0">
                          <p className="text-3xl font-black text-slate-950">{displayPrice}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {tripType === "return" ? "Return total estimate" : "One-way estimate"}
                          </p>

                          <button
                            type="button"
                            onClick={() => openPlanner(pair)}
                            className="mt-8 rounded-lg bg-amber-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                          >
                            Select and plan trip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {detailsPair && (
        <TripDetailsModal
          pair={detailsPair}
          tripType={tripType}
          outboundDate={date}
          inboundDate={returnDate}
          from={placeByCode(fromPlaces, detailsPair.outbound.searchFrom) || from}
          to={placeByCode(toPlaces, detailsPair.outbound.searchTo) || to}
          passengers={passengers}
          onClose={() => setDetailsPair(null)}
        />
      )}

      <Footer />
    </div>
  );
}

function parseCodeParam(value: string): string[] {
  return value
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .filter((code, index, all) => all.indexOf(code) === index);
}

function placeByCode(places: Place[], code?: string): Place | undefined {
  if (!code) {
    return undefined;
  }

  return places.find((place) => place.code.toUpperCase() === code.toUpperCase());
}
