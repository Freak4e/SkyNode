import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature as topojsonFeature } from "topojson-client";
import {
  ArrowLeftRight, Brain, CalendarDays, Search, ChevronDown,
  Zap, Globe, Shield, MessageCircle,
  Plane, Mountain, Waves, Sparkles as Aurora,
  Check, ChevronRight, User,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { MultiPlacePicker } from "../components/MultiPlacePicker";
import { AccentCard, SectionHeader } from "../components/ui";
import { useDestinationImage } from "../utils/destinationImage.js";
import type { Place } from "../../shared/types.js";
import heroBanner from "../../../assets/hero_banner.jpg";
import countries50mUrl from "world-atlas/countries-50m.json?url";

const today = new Date().toISOString().slice(0, 10);
const defaultFrom: Place = { code: "NYC", name: "New York", cityName: "New York", countryName: "USA", type: "city" };
const defaultTo: Place = { code: "TYO", name: "Tokyo", cityName: "Tokyo", countryName: "Japan", type: "city" };
type TripType = "one-way" | "return";

const features = [
  { icon: <Aurora className="h-5 w-5" />, title: "Smart AI Planner", desc: "Generates day-by-day itineraries tuned to your taste, time and budget." },
  { icon: <Plane className="h-5 w-5" />, title: "Flight search", desc: "Compare route ideas, dates, and prices from connected flight data sources." },
  { icon: <User className="h-5 w-5" />, title: "Living maps", desc: "Use maps to understand routes, neighborhoods, and nearby stops while planning." },
  { icon: <MessageCircle className="h-5 w-5" />, title: "Travel chat", desc: "Ask for destination ideas, itinerary changes, and planning context in one place." },
  { icon: <Shield className="h-5 w-5" />, title: "Trip organization", desc: "Keep your trip details organized so changes are easier to review." },
  { icon: <Zap className="h-5 w-5" />, title: "Trip handoff", desc: "Move from search results into planning without rebuilding the same trip details." },
];

const workspaceSteps = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "Find",
    desc: "Search flights, destination ideas, and route options from one focused travel workspace.",
  },
  {
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Plan",
    desc: "Build day-by-day itineraries with maps, budgets, activities, and editable trip details.",
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "Connect",
    desc: "Save trips, invite people, coordinate plans, and keep the whole group aligned.",
  },
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
      className={`group relative min-w-0 overflow-hidden rounded-lg bg-slate-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
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
            <p className="mt-1 text-sm font-black">Sample fare {destination.price}</p>
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
        <p className="mt-2 text-sm font-black text-slate-950">Sample fare {destination.price}</p>
      </div>
    </Link>
  );
}

function PopularDestinationPromo() {
  return (
    <Link
      to="/destinations"
      className="grid min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:col-span-3 lg:col-span-2"
    >
      <div className="grid h-full min-w-0 grid-cols-1 sm:grid-cols-[1.1fr_0.9fr]">
        <img
          src={heroBanner}
          alt="Travelers looking at flights"
          className="h-44 w-full object-cover sm:h-full"
        />
        <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6">
          <h3 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">Looking for more destination ideas?</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:mt-5">Explore route inspiration, city ideas, and sample fares in one place.</p>
          <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-black text-slate-950 sm:mt-6">
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
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white">
      <Navbar transparent />

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen max-w-full flex-col items-center justify-start overflow-x-hidden overflow-y-visible px-3 pb-12 pt-28 sm:justify-center sm:pt-24">
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
        <div className="glass absolute left-[6%] top-36 hidden items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg md:flex">
          <Plane className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">NYC → Tokyo</span>
        </div>
        <div className="glass absolute right-[5%] top-40 hidden items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg md:flex">
          <Mountain className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-700">Bali · 7 days</span>
        </div>
        <div className="glass absolute bottom-52 left-[4%] hidden items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg md:flex">
          <Waves className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold text-slate-700">Greek isles</span>
        </div>
        <div className="glass absolute bottom-60 right-[4%] hidden items-center gap-2 rounded-2xl px-4 py-2.5 shadow-lg md:flex">
          <Aurora className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-700">Aurora hunt</span>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 mb-4 max-w-full px-2 text-center font-black leading-none tracking-tight text-white sm:px-6" style={{ fontSize: "clamp(2.25rem, 11vw, 5.5rem)" }}>
          Travel,{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-200 to-sky-100">
            reimagined
          </span>
          <br />
          by intelligent design.
        </h1>

        <p className="relative z-10 mb-7 max-w-xl px-4 text-center text-sm leading-relaxed text-white/80 sm:mb-10 sm:text-base md:text-lg">
          Find the perfect flight, build day-by-day plans, and discover places worth the journey — all in one stunning, AI-native workspace.
        </p>

        {/* Search box */}
        <form
          onSubmit={handleSearch}
          className="relative z-10 mx-auto w-full max-w-5xl min-w-0 px-0 sm:px-4"
        >
          <div className="min-w-0 rounded-2xl border border-white/45 bg-white/70 p-3 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
            {/* Top options row */}
            <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-slate-200/60 px-1 pb-3">
              <TripTypeDropdown value={tripType} onChange={setTripType} />
              <PassengerDropdown value={passengers} onChange={setPassengers} />
            </div>

            {/* Main search row */}
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] lg:grid-cols-[minmax(150px,0.6fr)_44px_minmax(150px,0.6fr)_170px_170px_auto]">
              {/* FROM */}
              <div className="min-w-0 rounded-2xl border border-white/60 bg-white/75 px-3 py-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 sm:col-span-1">
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
              <div className="min-w-0 rounded-2xl border border-white/60 bg-white/75 px-3 py-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 sm:col-span-1">
                <MultiPlacePicker
                  label="To"
                  values={toPlaces}
                  onChange={setToPlaces}
                  placeholder="Add destination"
                />
              </div>

              {/* DEPARTURE */}
              <div className="sm:col-span-3 lg:col-span-1">
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
              </div>

              {/* RETURN */}
              <div className="sm:col-span-3 lg:col-span-1">
                <HomeDatePicker
                  label="Return"
                  value={returnDate}
                  min={date}
                  disabled={tripType !== "return"}
                  disabledText="One way"
                  onChange={setReturnDate}
                />
              </div>

              {/* SEARCH */}
              <button
                type="submit"
                disabled={!from || !to}
                className="flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3 lg:col-span-1"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 px-2 text-center text-xs text-white/70 sm:gap-x-6">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Flight search</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI trip planning</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Destination ideas</span>
          </div>
        </form>
      </section>

      {/* ── AI PLANNER SECTION ── */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500">
              <Aurora className="h-4 w-4" />
              What is SkyNode
            </p>
            <h2 className="mx-auto max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl md:text-5xl">
              One workspace for your entire trip.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-500">
              SkyNode brings flight discovery, AI planning, saved trips, maps, and group context into one clean workspace so planning feels connected from first search to final itinerary.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {workspaceSteps.map((step) => (
              <AccentCard key={step.title} className="min-h-44">
                <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20 transition group-hover:rotate-3 group-hover:scale-105">
                  {step.icon}
                </div>
                <h3 className="relative mb-2 font-black text-slate-950">{step.title}</h3>
                <p className="relative text-sm leading-6 text-slate-500">{step.desc}</p>
              </AccentCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-blue-950 to-cyan-950 text-white shadow-card-strong">
          <div className="pointer-events-none absolute -left-36 top-1/2 h-[420px] w-[420px] -translate-y-1/2 opacity-95 sm:-left-44 sm:h-[480px] sm:w-[480px] lg:-left-52 lg:h-[520px] lg:w-[520px]" style={{ maskImage: "linear-gradient(90deg, transparent 0%, black 10%, black 72%, transparent 100%)" }}>
            <WorldMapGraphic />
          </div>

          <div className="relative z-10 px-6 py-12 sm:px-10 lg:ml-[30%] lg:w-[70%] lg:py-16 lg:pl-8 lg:pr-14">
              <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
                <Globe className="h-4 w-4" /> Explore destinations
              </p>
              <h2 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
                Explore the world for less.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-300 sm:text-lg">
                Search from your city and discover cheap flight deals across hundreds of destinations. Compare fares, visualize routes, and find your next adventure before you start planning.
              </p>
              <div className="mt-8">
                <Link to="/destinations" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 no-underline transition hover:bg-slate-100">
                  Explore destinations
                </Link>
              </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4" /> AI ITINERARY PLANNER
            </p>
            <h2 className="mb-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              An itinerary that actually thinks for you.
            </h2>
            <p className="mb-8 text-base leading-relaxed text-slate-500 sm:text-lg">
              Tell SkyNode where you're going, your vibe and your budget. Get a beautiful, editable day-by-day plan with maps, estimated costs and activity ideas.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={openPlanner}
                className="rounded-full bg-linear-to-r from-blue-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg sm:hover:scale-105"
              >
                Try the planner →
              </button>
              <button className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                Chat with AI
              </button>
            </div>
          </div>

          {/* Itinerary card */}
          <div className="relative min-w-0">
            <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-linear-to-br from-blue-500/30 via-cyan-300/25 to-blue-600/25 blur-2xl" />
            <div className="relative min-w-0 rounded-3xl border border-blue-100/80 bg-white p-4 shadow-[0_30px_80px_-36px_rgba(37,99,235,0.8)] sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-500 font-medium">SkyNode AI · Tokyo · 5 days</span>
            </div>
            <div className="space-y-3">
              {itineraryDays.map((d) => (
                <div key={d.day} className="flex min-w-0 items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-white shadow-lg shadow-cyan-500/20">
                    Day {d.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">{d.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{d.sub}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">{d.price}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-center text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors py-2">
              View full itinerary →
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl min-w-0">
          <SectionHeader
            className="mb-7"
            eyebrow="Destination ideas"
            icon={<Globe className="h-4 w-4" />}
            title="Travelers also love these destinations"
            subtitle="Popular city breaks with sample routes, fares and arrival airports at a glance."
          />

          <div className="grid auto-rows-[220px] grid-cols-1 gap-4 sm:auto-rows-[236px] md:grid-cols-3 lg:grid-cols-6">
            {popularDestinations.map((destination) => (
              <PopularDestinationCard key={destination.city} destination={destination} />
            ))}
            <PopularDestinationPromo />
            </div>
          </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl min-w-0">
          <SectionHeader
            align="center"
            className="mb-12"
            eyebrow="Travel workspace"
            icon={<Aurora className="h-4 w-4" />}
            title="Everything you need."
            subtitle="Nothing you don't."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {features.map((f, index) => (
              <AccentCard key={f.title}>
                <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20 transition group-hover:rotate-3 group-hover:scale-105">
                  {f.icon}
                </div>
                <p className="relative mb-2 font-black text-slate-950">{f.title}</p>
                <p className="relative text-sm leading-6 text-slate-500">{f.desc}</p>
              </AccentCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      {/* ── CTA ── */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="rounded-3xl bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 px-5 py-14 text-center shadow-card-strong sm:px-8 sm:py-18 lg:px-12">
            <p className="mb-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
              <Zap className="h-4 w-4" /> Start planning
            </p>
            <h2 className="mb-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Your next trip starts now.
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg font-semibold leading-8 text-slate-300">Free to start. No card, no commitment. Just smarter travel.</p>
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

function WorldMapGraphic() {
  const [features, setFeatures] = useState<Array<Feature<Geometry, { name?: string }>>>([]);
  const visibleFeatures = useMemo(
    () => features.filter((item) => item.properties?.name !== "Antarctica"),
    [features],
  );
  const projection = useMemo(() => {
    return geoOrthographic()
      .translate([310, 310])
      .scale(285)
      .rotate([58, -18])
      .precision(0.7);
  }, []);
  const path = useMemo(() => geoPath(projection), [projection]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      try {
        const response = await fetch(countries50mUrl);
        if (!response.ok) return;
        const topology = await response.json() as { objects?: { countries?: unknown } };
        if (!topology.objects?.countries) return;
        const collection = topojsonFeature(
          topology as never,
          topology.objects.countries as never,
        ) as unknown as FeatureCollection<Geometry, { name?: string }>;

        if (!cancelled) setFeatures(collection.features);
      } catch {
        if (!cancelled) setFeatures([]);
      }
    }

    void loadWorld();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <svg viewBox="0 0 620 620" className="h-full w-full" role="img" aria-label="World map globe">
      <path d={path({ type: "Sphere" }) || undefined} fill="#bfdbfe" fillOpacity="0.07" stroke="#bfdbfe" strokeOpacity="0.18" strokeWidth="1.2" />
      <path d={path(geoGraticule10()) || undefined} fill="none" stroke="#bfdbfe" strokeOpacity="0.11" strokeWidth="0.65" />
      <g fill="#bfdbfe" fillOpacity="0.2" stroke="#bfdbfe" strokeOpacity="0.24" strokeWidth="0.45">
        {visibleFeatures.map((item, index) => {
          const d = path(item);
          if (!d) return null;
          return <path key={`${item.properties?.name || "country"}-${index}`} d={d} />;
        })}
      </g>
    </svg>
  );
}
