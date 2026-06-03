import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftRight, CalendarDays, Search, ChevronDown,
  Zap, Globe, Shield, MessageCircle, CreditCard, Map,
  Star, Plane, Mountain, Waves, Sparkles as Aurora,
  Check, ChevronRight, User,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { MultiPlacePicker } from "../components/MultiPlacePicker";
import { useDestinationImage } from "../utils/destinationImage.js";
import type { Place } from "../../shared/types.js";
import heroBanner from "../../../assets/hero_banner.jpg";

const today = new Date().toISOString().slice(0, 10);
const defaultFrom: Place = { code: "NYC", name: "New York", cityName: "New York", countryName: "USA", type: "city" };
const defaultTo: Place = { code: "TYO", name: "Tokyo", cityName: "Tokyo", countryName: "Japan", type: "city" };
type TripType = "one-way" | "return";

const features = [
  { icon: <Aurora className="w-5 h-5 text-blue-500" />, title: "Smart AI Planner", desc: "Generates day-by-day itineraries tuned to your taste, time and budget." },
  { icon: <Zap className="w-5 h-5 text-cyan-500" />, title: "Best-fare engine", desc: "Scans 1,200+ airlines and hidden-city routes in under half a second." },
  { icon: <Map className="w-5 h-5 text-violet-500" />, title: "Living maps", desc: "Interactive maps that update with weather, crowds and travel time." },
  { icon: <MessageCircle className="w-5 h-5 text-emerald-500" />, title: "Always with you", desc: "Chat with your AI travel buddy mid-trip for last-minute changes." },
  { icon: <Shield className="w-5 h-5 text-orange-500" />, title: "Trip protection", desc: "Optional cancellation, delay and weather guarantees on every booking." },
  { icon: <CreditCard className="w-5 h-5 text-pink-500" />, title: "Instant booking", desc: "One-click checkout across flights, stays and experiences." },
];

const testimonials = [
  { quote: "Built my 3-week Asia trip in 4 minutes. Honestly cried a little.", name: "Mira K.", role: "Solo traveler · Berlin", stars: 5 },
  { quote: "Like Linear, but for the world. The interface alone is worth it.", name: "Daniel A.", role: "Founder · NYC", stars: 5 },
  { quote: "Found a hidden $312 flight to Lisbon. SkyNode pays for itself.", name: "Priya S.", role: "Student · Mumbai", stars: 5 },
];

const itineraryDays = [
  { day: 1, title: "Shibuya, Harajuku & teamLab Planets", sub: "3 activities · 2 meals · transit included", price: "$84" },
  { day: 2, title: "Mt. Fuji day trip + Hakone onsen", sub: "3 activities · 2 meals · transit included", price: "$162" },
  { day: 3, title: "Ghibli Museum & Shinjuku jazz bars", sub: "3 activities · 2 meals · transit included", price: "$70" },
];

const popularDestinations = [
  {
    city: "Barcelona",
    country: "Spain",
    airport: "Barcelona-El Prat",
    route: "Budapest to BCN",
    price: "$72",
    href: "/search?from=BUD&to=BCN&fromName=Budapest&toName=Barcelona&date=2026-07-12",
  },
  {
    city: "Antalya",
    country: "Turkey",
    airport: "Antalya Airport",
    route: "Skopje to AYT",
    price: "$118",
    href: "/search?from=SKP&to=AYT&fromName=Skopje&toName=Antalya&date=2026-07-19",
  },
  {
    city: "Malta",
    country: "Malta",
    airport: "Malta International",
    route: "Belgrade to MLA",
    price: "$54",
    imageCity: "Valletta",
    href: "/search?from=BEG&to=MLA&fromName=Belgrade&toName=Malta&date=2026-08-02",
  },
  {
    city: "Madrid",
    country: "Spain",
    airport: "Adolfo Suarez Madrid-Barajas",
    route: "Prague to MAD",
    price: "$89",
    href: "/search?from=PRG&to=MAD&fromName=Prague&toName=Madrid&date=2026-08-10",
    wide: true,
  },
  {
    city: "Palma, Majorca",
    country: "Spain",
    airport: "Palma de Mallorca",
    route: "Milan to PMI",
    price: "$61",
    href: "/search?from=MIL&to=PMI&fromName=Milan&toName=Palma%2C%20Majorca&date=2026-07-25",
    wide: true,
  },
  {
    city: "Berlin",
    country: "Germany",
    airport: "Berlin Brandenburg",
    route: "Munich to BER",
    price: "$47",
    href: "/search?from=MUC&to=BER&fromName=Munich&toName=Berlin&date=2026-06-28",
  },
];

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return ref;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHomeDate(value: string): string {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

function SearchDropdown({
  value,
  icon,
  children,
}: {
  value: string;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/70"
      >
        {icon}
        <span>{value}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-60 mt-2 max-h-56 w-48 overflow-y-auto rounded-2xl border border-white/70 bg-white p-1 shadow-2xl shadow-slate-900/15">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function TripTypeDropdown({ value, onChange }: { value: TripType; onChange: (value: TripType) => void }) {
  const options: Array<{ value: TripType; label: string; description: string }> = [
    { value: "return", label: "Return", description: "Fly out and back" },
    { value: "one-way", label: "One way", description: "Single direction" },
  ];

  return (
    <SearchDropdown value={value === "return" ? "Return" : "One way"}>
      {(close) => options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => { onChange(option.value); close(); }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-blue-50"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-slate-950">{option.label}</span>
            <span className="block text-[11px] font-semibold text-slate-500">{option.description}</span>
          </span>
          {value === option.value && <Check className="h-4 w-4 text-blue-600" />}
        </button>
      ))}
    </SearchDropdown>
  );
}

function PassengerDropdown({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <SearchDropdown
      value={`${value} ${value === 1 ? "Passenger" : "Passengers"}`}
      icon={<User className="h-3.5 w-3.5 text-slate-400" />}
    >
      {(close) => Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
        <button
          key={count}
          type="button"
          onClick={() => { onChange(count); close(); }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-blue-50"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">{count}</span>
          <span className="flex-1 text-sm font-black text-slate-950">{count === 1 ? "Passenger" : "Passengers"}</span>
          {value === count && <Check className="h-4 w-4 text-blue-600" />}
        </button>
      ))}
    </SearchDropdown>
  );
}

function HomeDatePicker({
  label,
  value,
  min,
  disabled,
  disabledText,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  disabled?: boolean;
  disabledText?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseLocalDate(value));
  const ref = useOutsideClose<HTMLDivElement>(() => setOpen(false));
  const minDate = min ? parseLocalDate(min) : null;
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];

  function moveMonth(step: number) {
    setVisibleMonth(new Date(year, month + step, 1));
  }

  function pickDate(date: Date) {
    onChange(toDateValue(date));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative min-h-14 rounded-2xl border border-white/60 bg-white/75 px-4 py-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      {disabled ? (
        <p className="text-slate-400 text-sm font-medium">{disabledText || "Disabled"}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setVisibleMonth(parseLocalDate(value));
            setOpen((current) => !current);
          }}
          className="flex items-center gap-3 text-slate-800 font-semibold text-sm"
        >
          <span>{formatHomeDate(value)}</span>
          <CalendarDays className="h-4 w-4 text-slate-900" />
        </button>
      )}

      {open && !disabled && (
        <div className="absolute right-0 top-full z-60 mt-3 w-64 rounded-2xl border border-white/70 bg-white p-3 shadow-2xl shadow-slate-900/15 max-[640px]:right-auto max-[640px]:left-0 max-[640px]:w-[calc(100vw-2rem)]">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-600 hover:bg-slate-200">
              ‹
            </button>
            <p className="text-sm font-black text-slate-950">
              {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth)}
            </p>
            <button type="button" onClick={() => moveMonth(1)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-600 hover:bg-slate-200">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;

              const dateValue = toDateValue(date);
              const isSelected = dateValue === value;
              const isDisabled = Boolean(minDate && date < minDate);

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => pickDate(date)}
                  disabled={isDisabled}
                  className={`h-8 rounded-lg text-sm font-black transition ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : isDisabled
                      ? "cursor-not-allowed text-slate-300"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function placeCodes(places: Place[]): string[] {
  return places
    .map((place) => place.code.trim().toUpperCase())
    .filter(Boolean)
    .filter((code, index, all) => all.indexOf(code) === index);
}

type PopularDestination = (typeof popularDestinations)[number];

function PopularDestinationCard({ destination }: { destination: PopularDestination }) {
  const imageUrl = useDestinationImage(destination.imageCity || destination.city, destination.country);

  return (
    <Link
      to={destination.href}
      className={`group relative overflow-hidden rounded-lg bg-slate-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
        destination.wide ? "md:col-span-2 lg:col-span-3" : "md:col-span-1 lg:col-span-1"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${destination.city}, ${destination.country}`}
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-white" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white transition duration-300 group-hover:opacity-0">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-black leading-tight">{destination.city}</h3>
            <p className="mt-1 text-sm font-black">Tickets from {destination.price}</p>
          </div>
          <ChevronRight className="h-6 w-6 shrink-0" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-white p-4 text-slate-950 transition duration-300 group-hover:translate-y-0">
        <p className="text-xs font-bold text-slate-500">{destination.route}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{destination.city}, {destination.country}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{destination.airport}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-800" />
        </div>
        <p className="mt-2 text-sm font-black text-slate-950">Tickets from {destination.price}</p>
      </div>
    </Link>
  );
}

function PopularDestinationPromo() {
  return (
    <Link
      to="/destinations"
      className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:col-span-3 lg:col-span-2"
    >
      <div className="grid h-full grid-cols-[1.1fr_0.9fr]">
        <img
          src={heroBanner}
          alt="Travelers looking at flights"
          className="h-full w-full object-cover"
        />
        <div className="flex flex-col justify-center p-6">
          <h3 className="text-2xl font-black leading-tight text-slate-950">Want to fly for even less?</h3>
          <p className="mt-5 text-sm leading-6 text-slate-600">Search our best deals, price drops, and fast weekend routes.</p>
          <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-black text-slate-950">
            Explore deals
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [fromPlaces, setFromPlaces] = useState<Place[]>([defaultFrom]);
  const [toPlaces, setToPlaces] = useState<Place[]>([defaultTo]);
  const from = fromPlaces[0];
  const to = toPlaces[0];
  const [date, setDate] = useState(today);
  const [returnDate, setReturnDate] = useState(today);
  const [tripType, setTripType] = useState<TripType>("return");
  const [passengers, setPassengers] = useState(1);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) {
      return;
    }

    const params = new URLSearchParams({
      from: from.code,
      to: to.code,
      fromAll: placeCodes(fromPlaces).join(","),
      toAll: placeCodes(toPlaces).join(","),
      date,
      fromName: from.cityName,
      toName: to.cityName,
      tripType,
      passengers: String(passengers),
    });

    if (tripType === "return") {
      params.set("returnDate", returnDate);
    }

    navigate(`/search?${params.toString()}`);
  }

  function openPlanner() {
    if (!from || !to) {
      return;
    }

    const params = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      fromName: from.cityName,
      toName: to.cityName,
      destination: to.cityName,
    });

    navigate(`/planner?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-visible px-3">
        {/* Hero image */}
        <img
          src={heroBanner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Semi-transparent overlay so text stays readable */}
        <div className="absolute inset-0 bg-slate-900/40" />
        {/* Bottom fade to blend into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-slate-50 to-transparent" />

        {/* Floating label chips */}
        <div className="absolute top-36 left-[6%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Plane className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">NYC → Tokyo</span>
        </div>
        <div className="absolute top-40 right-[5%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Mountain className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-700">Bali · 7 days</span>
        </div>
        <div className="absolute bottom-52 left-[4%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Waves className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold text-slate-700">Greek isles</span>
        </div>
        <div className="absolute bottom-60 right-[4%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Aurora className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-700">Aurora hunt</span>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 text-center font-black leading-none tracking-tight text-white px-6 mb-4" style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}>
          Travel,{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-200 to-sky-100">
            reimagined
          </span>
          <br />
          by intelligent design.
        </h1>

        <p className="relative z-10 text-center text-white/80 text-base md:text-lg max-w-xl px-6 mb-10 leading-relaxed">
          Find the perfect flight, build day-by-day plans, and discover places worth the journey — all in one stunning, AI-native workspace.
        </p>

        {/* Search box */}
        <form
          onSubmit={handleSearch}
          className="relative z-10 w-full max-w-5xl mx-auto px-0 sm:px-4"
        >
          <div className="rounded-2xl border border-white/45 bg-white/70 p-3 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
            {/* Top options row */}
            <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-slate-200/60 px-1 pb-3">
              <TripTypeDropdown value={tripType} onChange={setTripType} />
              <PassengerDropdown value={passengers} onChange={setPassengers} />
            </div>

            {/* Main search row */}
            <div className="grid gap-2 lg:grid-cols-[minmax(150px,0.6fr)_44px_minmax(150px,0.6fr)_170px_170px_auto]">
              {/* FROM */}
              <div className="min-w-0 rounded-2xl border border-white/60 bg-white/75 px-3 py-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
                <MultiPlacePicker
                  label="From"
                  values={fromPlaces}
                  onChange={setFromPlaces}
                  placeholder="Add departure"
                />
              </div>

              {/* Swap */}
              <button
                type="button"
                onClick={() => {
                  // Swap copies to avoid sharing the same array reference
                  const tmp = [...fromPlaces];
                  setFromPlaces([...toPlaces]);
                  setToPlaces(tmp);
                }}
                className="flex h-full min-h-14 items-center justify-center rounded-2xl border border-white/60 bg-white/75 text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* TO */}
              <div className="min-w-0 rounded-2xl border border-white/60 bg-white/75 px-3 py-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
                <MultiPlacePicker
                  label="To"
                  values={toPlaces}
                  onChange={setToPlaces}
                  placeholder="Add destination"
                />
              </div>

              {/* DEPARTURE */}
              <HomeDatePicker
                label="Departure"
                value={date}
                onChange={(nextDate) => {
                  setDate(nextDate);
                  if (returnDate < nextDate) {
                    setReturnDate(nextDate);
                  }
                }}
              />

              {/* RETURN */}
              <HomeDatePicker
                label="Return"
                value={returnDate}
                min={date}
                disabled={tripType !== "return"}
                disabledText="One way"
                onChange={setReturnDate}
              />

              {/* SEARCH */}
              <button
                type="submit"
                disabled={!from || !to}
                className="flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex justify-center gap-6 mt-4 text-white/70 text-xs">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> No booking fees</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 0.4s search</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 1,200+ airlines</span>
          </div>
        </form>
      </section>

      {/* ── AI PLANNER SECTION ── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> AI ITINERARY PLANNER
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
              An itinerary that actually thinks for you.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Tell SkyNode where you're going, your vibe and your budget. Get a beautiful, editable day-by-day plan in seconds — with maps, weather, costs and bookable activities.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openPlanner}
                className="px-6 py-3 rounded-full bg-linear-to-r from-blue-500 to-cyan-400 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Try the planner →
              </button>
              <button className="px-6 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">
                Chat with AI
              </button>
            </div>
          </div>

          {/* Itinerary card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-500 font-medium">SkyNode AI · Tokyo · 5 days</span>
            </div>
            <div className="space-y-3">
              {itineraryDays.map((d) => (
                <div key={d.day} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    Day {d.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">{d.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{d.sub}</p>
                  </div>
                  <span className="text-slate-900 font-bold text-sm">{d.price}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-center text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors py-2">
              View full itinerary →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-3">
            Everything you need.
          </h2>
          <p className="text-slate-400 text-center mb-12 text-lg">Nothing you don't.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <p className="font-bold text-slate-900 mb-1.5">{f.title}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-12">
            Loved by travelers everywhere.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 font-medium leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-20 bg-white">
        <div className="max-w-6xl mx-auto border-t border-slate-200 pt-12">
          <div className="mb-7">
            <h2 className="text-2xl md:text-3xl font-black text-slate-950">
              Travelers also love these destinations
            </h2>
            <p className="mt-2 text-slate-600">
              Popular city breaks from airports across Europe, with fares, routes and arrival airports at a glance.
            </p>
          </div>

          <div className="grid auto-rows-[236px] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {popularDestinations.map((destination) => (
              <PopularDestinationCard key={destination.city} destination={destination} />
            ))}
            <PopularDestinationPromo />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 px-8 py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Your next trip starts now.
            </h2>
            <p className="text-slate-400 mb-8">Free to start. No card, no commitment. Just smarter travel.</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={openPlanner}
                className="px-6 py-3 rounded-full bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                Create my trip
              </button>
              <Link to="/assistant" className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold text-sm no-underline hover:bg-white/10 transition-colors">
                Talk to AI
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
