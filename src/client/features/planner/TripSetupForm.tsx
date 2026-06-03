import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleGauge,
  DollarSign,
  FilePenLine,
  Hotel,
  Heart,
  List,
  Loader2,
  MapPin,
  Plane,
  Sparkles,
  Tags,
  Users,
  X,
} from "lucide-react";
import { searchCities, type CitySearchResult } from "../../api/geocodeApi";
import type { FlightOffer, ItineraryDay, ItineraryItem, LikedFlight, TravelPace } from "../../../shared/types.js";
import { plannerInterests } from "./plannerUtils";

type TripSetupFormProps = {
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  budgetAmount: number;
  changeDays: (nextDays: number) => void;
  createManual: () => void;
  createWithAi: () => void;
  days: number;
  destinationCode: string;
  destinationName: string;
  draftDays: ItineraryDay[];
  hotelName: string;
  loading: boolean;
  likedFlights: LikedFlight[];
  likedFlightsError: string;
  likedFlightsLoading: boolean;
  manual: boolean;
  notes: string;
  initialStep?: number;
  onAddFlight: () => void;
  onAddLikedFlight: (likedFlight: LikedFlight) => void;
  onOpenTrips: () => void;
  onRemoveFlight: (index: number) => void;
  originCode: string;
  pace: TravelPace;
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  removeDay: (dayIndex: number) => void;
  selectedFlight?: FlightOffer;
  selectedFlights: FlightOffer[];
  selectedInterests: string[];
  setBudgetAmount: (value: number) => void;
  setDestinationName: (value: string) => void;
  setHotelName: (value: string) => void;
  setManual: (value: boolean) => void;
  setNotes: (value: string) => void;
  setPace: (value: TravelPace) => void;
  setStartDate: (value: string) => void;
  setTripCities: (value: string) => void;
  setTravelers: (value: number) => void;
  setTripTitle: (value: string) => void;
  startDate: string;
  toggleInterest: (interest: string) => void;
  travelers: number;
  tripCities: string;
  tripTitle: string;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "cityName" | "title" | "summary">>) => void;
};

type StepId = 0 | 1 | 2 | 3;

const steps = [
  { title: "Basics", subtitle: "Where & when", icon: CircleGauge },
  { title: "Style", subtitle: "Pace & interests", icon: Sparkles },
  { title: "Logistics", subtitle: "Flights & stays", icon: Plane },
  { title: "Review", subtitle: "Generate or build", icon: Check },
] as const;

const paceOptions: Array<{ value: TravelPace; title: string; description: string }> = [
  { value: "relaxed", title: "Relaxed", description: "2-3 things per day, long meals." },
  { value: "balanced", title: "Balanced", description: "Mix of activities and downtime." },
  { value: "packed", title: "Packed", description: "Hit everything, sunrise to late." },
];

export function TripSetupForm(props: TripSetupFormProps) {
  const [step, setStep] = useState<StepId>(() => Math.min(Math.max(props.initialStep || 0, 0), 3) as StepId);
  const [likedDropdownOpen, setLikedDropdownOpen] = useState(false);
  const basicsComplete = props.destinationName.trim().length > 0
    && props.startDate.trim().length > 0
    && props.days > 0
    && props.travelers > 0
    && props.budgetAmount >= 0;
  const styleComplete = props.selectedInterests.length > 0 && Boolean(props.pace);
  const logisticsComplete = true;
  const canContinue = step === 0 ? basicsComplete : step === 1 ? styleComplete : true;
  const budgetPerDay = Math.round(props.budgetAmount / Math.max(props.days, 1));
  const flightSearchUrl = buildFlightSearchUrl({
    date: props.startDate,
    destinationCode: props.destinationCode,
    destinationName: props.destinationName,
    originCode: props.originCode,
  });
  const summaryRows = useMemo(() => ([
    ["Destination", props.destinationName || "-"],
    ["Dates", `${props.days} days from ${props.startDate}`],
    ["Travelers", String(props.travelers)],
    ["Budget", `$${props.budgetAmount.toLocaleString()} - ~$${budgetPerDay}/day`],
    ["Pace", titleCase(props.pace)],
    ["Interests", props.selectedInterests.length ? props.selectedInterests.map(titleCase).join(", ") : "-"],
    ["Stay", props.hotelName || "-"],
    ["Flights", props.selectedFlights.length > 0 ? `${props.selectedFlights.length} selected` : "Skipped"],
  ]), [budgetPerDay, props.budgetAmount, props.days, props.destinationName, props.hotelName, props.pace, props.selectedFlights.length, props.selectedInterests, props.startDate, props.travelers]);

  function goNext() {
    if (step === 0 && !canContinue) return;
    setStep((current) => Math.min(current + 1, 3) as StepId);
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0) as StepId);
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8 overflow-hidden rounded-3xl bg-hero-panel p-8 text-white shadow-card-strong">
        <div className="flex flex-wrap items-stretch justify-between gap-8">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Trip builder
            </p>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">Shape the trip before the itinerary.</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">
              Start with the essentials, tune the travel style, add flights or stays, then choose whether SkyNode generates the plan or you build it manually.
            </p>
          </div>
          <div className="flex min-w-64 flex-col items-end justify-between gap-4">
            <button
              type="button"
              onClick={props.onOpenTrips}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/15"
            >
              <List className="h-4 w-4" />
              All trips
            </button>
            <div className="mt-auto grid w-full gap-2 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold backdrop-blur">
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-300">Destination</span>
                <span className="text-right text-white">{props.destinationName || "Add your destination"}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-300">Dates</span>
                <span className="text-right text-white">{props.days} days from {props.startDate}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-slate-300">Budget</span>
                <span className="text-right text-white">${props.budgetAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-7 grid gap-3 md:grid-cols-4">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const stepComplete = index === 0 ? basicsComplete : index === 1 ? styleComplete : index === 2 ? logisticsComplete : false;
          const completed = index < step && stepComplete;
          const active = index === step;
          const canOpenStep = index === 0 || (index === 1 && basicsComplete) || (index > 1 && basicsComplete && styleComplete);

          return (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                if (canOpenStep) setStep(index as StepId);
              }}
              disabled={!canOpenStep}
              className={`flex min-h-20 items-center gap-3 rounded-2xl border px-4 text-left transition ${
                completed
                  ? "border-emerald-300 bg-emerald-50 text-slate-950"
                  : active
                    ? "border-blue-600 bg-white text-slate-950 shadow-lg shadow-blue-900/5"
                    : canOpenStep
                    ? "border-slate-200 bg-white/80 text-slate-950 hover:border-blue-200"
                    : "cursor-not-allowed border-slate-200 bg-white/50 text-slate-400"
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                completed ? "bg-emerald-400 text-slate-950" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span>
                <span className="block text-sm font-black">{item.title}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-600">{item.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:p-8">
        {step === 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <WizardField icon={<FilePenLine className="h-4 w-4" />} label="Trip name">
              <input className="wizard-input" value={props.tripTitle} onChange={(event) => props.setTripTitle(event.target.value)} placeholder={props.destinationName ? `${props.destinationName} trip` : "Trip name"} />
            </WizardField>
            <WizardField icon={<MapPin className="h-4 w-4" />} label="Destination" required>
              <input className="wizard-input" value={props.destinationName} onChange={(event) => props.setDestinationName(event.target.value)} placeholder="Add your destination" required />
            </WizardField>
            <WizardField icon={<CalendarDays className="h-4 w-4" />} label="Days">
              <input className="wizard-input" type="number" min={1} max={14} value={props.days} onChange={(event) => props.changeDays(Number(event.target.value || 1))} />
            </WizardField>
            <WizardField icon={<CalendarDays className="h-4 w-4" />} label="Start date">
              <input className="wizard-input" type="date" value={props.startDate} onChange={(event) => props.setStartDate(event.target.value)} required />
            </WizardField>
            <WizardField icon={<Users className="h-4 w-4" />} label="Travelers">
              <input className="wizard-input" type="number" min={1} max={12} value={props.travelers} onChange={(event) => props.setTravelers(Number(event.target.value || 1))} />
            </WizardField>
            <WizardField icon={<DollarSign className="h-4 w-4" />} label="Budget (USD)">
              <div className="relative">
                <input className="wizard-input pr-28" type="number" min={0} step={50} value={props.budgetAmount} onChange={(event) => props.setBudgetAmount(Number(event.target.value || 0))} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">~ ${budgetPerDay}/day</span>
              </div>
            </WizardField>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-sm font-black text-slate-950">Pace</p>
              <div className="grid gap-3 md:grid-cols-3">
                {paceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => props.setPace(option.value)}
                    className={`rounded-2xl border px-4 py-5 text-left transition ${
                      props.pace === option.value
                        ? "border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                        : "border-slate-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <span className="block text-base font-black text-slate-950">{option.title}</span>
                    <span className="mt-1.5 block text-xs font-medium text-slate-600">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 flex items-center gap-2 text-base font-black text-slate-950">
                <Tags className="h-4 w-4" />
                Interests <span className="text-sm font-medium text-slate-500">- pick a few</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {plannerInterests.map((interest) => {
                  const selected = props.selectedInterests.includes(interest);
                  return (
                    <button
                      type="button"
                      key={interest}
                      onClick={() => props.toggleInterest(interest)}
                      className={`rounded-full px-4 py-2.5 text-sm font-black capitalize transition ${
                        selected ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "bg-slate-100 text-slate-950 hover:bg-blue-50"
                      }`}
                    >
                      {selected ? "✓ " : ""}{interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <WizardField label="Anything to avoid or must-do? (optional)">
              <input className="wizard-input" value={props.notes} onChange={(event) => props.setNotes(event.target.value)} placeholder="e.g. no early mornings, vegetarian, wheelchair accessible..." />
            </WizardField>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <WizardField icon={<Hotel className="h-4 w-4" />} label="Hotel or neighborhood">
              <input className="wizard-input" value={props.hotelName} onChange={(event) => props.setHotelName(event.target.value)} placeholder="Bairro Alto - or hotel name" />
            </WizardField>

            <WizardField icon={<MapPin className="h-4 w-4" />} label="Cities">
              <div className="wizard-input flex items-center px-3 py-1">
                <TripCityPicker value={props.tripCities} onChange={props.setTripCities} />
              </div>
            </WizardField>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700">
                    <Plane className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-black text-slate-950">Flight details</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Optional - add outbound, return, or open-jaw legs one at a time.
                    </p>
                  </div>
                </div>
                <div className="relative flex flex-wrap gap-2">
                  <a
                    href={flightSearchUrl}
                    onClick={props.onAddFlight}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-900 shadow-md ring-1 ring-slate-200 no-underline hover:bg-blue-50"
                  >
                    + {props.selectedFlights.length > 0 ? "Add another" : "Add"}
                  </a>
                  <button
                    type="button"
                    onClick={() => setLikedDropdownOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:bg-blue-50"
                  >
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    Add from liked
                  </button>

                  {likedDropdownOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-2xl shadow-slate-900/15">
                      <div className="mb-1 flex items-center justify-between gap-3 px-2 py-1.5">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Liked flights</p>
                        {props.likedFlightsLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                      </div>
                      {props.likedFlightsError ? (
                        <p className="px-2 py-3 text-xs font-bold text-red-600">{props.likedFlightsError}</p>
                      ) : props.likedFlights.length === 0 ? (
                        <p className="px-2 py-3 text-xs font-semibold leading-5 text-slate-500">Like flights with the heart button in search, then choose them here.</p>
                      ) : (
                        <div className="grid max-h-72 gap-1 overflow-y-auto">
                          {props.likedFlights.map((likedFlight) => (
                            <button
                              key={likedFlight.id}
                              type="button"
                              onClick={() => {
                                props.onAddLikedFlight(likedFlight);
                                setLikedDropdownOpen(false);
                              }}
                              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-blue-50"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-slate-950">
                                  {flightRouteText(likedFlight.outbound)}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                  {[likedFlight.outbound.carrier, likedFlight.departureDate, likedFlight.totalPriceText || likedFlight.outbound.priceText].filter(Boolean).join(" - ")}
                                </span>
                              </span>
                              <span className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white">Add</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {props.selectedFlights.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {props.selectedFlights.map((flight, index) => (
                    <div key={`${flight.carrier}-${flight.departureTime}-${flight.searchFrom}-${flight.searchTo}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-950">
                          {flight.searchFrom || flight.segments?.[0]?.originCode || "From"} → {flight.searchTo || flight.segments?.[flight.segments.length - 1]?.destinationCode || "To"}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                          {[flight.carrier, `${flight.departureTime} - ${flight.arrivalTime}`, flight.priceText].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => props.onRemoveFlight(index)}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove selected flight"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-100 p-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Trip summary</p>
              <div className="grid gap-x-6 md:grid-cols-2">
                {summaryRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-200 py-2 text-sm">
                    <span className="font-medium text-slate-600">{label}</span>
                    <span className="max-w-60 truncate text-right font-black text-slate-950">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  props.setManual(false);
                  props.createWithAi();
                }}
                disabled={props.loading || props.selectedInterests.length === 0}
                className="rounded-2xl bg-blue-600 p-5 text-left text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-3 text-base font-black">
                  {props.loading && !props.manual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {props.loading && !props.manual ? "Generating..." : "Generate with AI"}
                </span>
                <span className="mt-2 block max-w-md text-xs font-medium leading-5 text-blue-50">
                  A complete day-by-day plan you can edit, swap, or regenerate per activity.
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">Recommended <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>

              <button
                type="button"
                onClick={() => {
                  props.setManual(true);
                  props.createManual();
                }}
                disabled={props.loading}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-3 text-base font-black text-slate-950">
                  <FilePenLine className="h-4 w-4 text-blue-600" />
                  Build manually
                </span>
                <span className="mt-2 block max-w-md text-xs font-medium leading-5 text-slate-600">
                  Get empty day cards. Add activities one at a time at your own pace.
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-black text-blue-700">Start blank <ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || props.loading}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-sm font-medium text-slate-600">Step {step + 1} of 4</span>
          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue || props.loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-sm font-medium text-slate-600">Pick a build mode above</span>
          )}
        </div>
      </div>
    </section>
  );
}

function WizardField({ children, icon, label, required }: { children: ReactNode; icon?: ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function flightRouteText(flight: FlightOffer): string {
  const from = flight.searchFrom || flight.segments?.[0]?.originCode || "From";
  const to = flight.searchTo || flight.segments?.[flight.segments.length - 1]?.destinationCode || "To";
  return `${from} -> ${to}`;
}

function TripCityPicker({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<CitySearchResult[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedCities = useMemo(() => parseCities(value), [value]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setCities([]);
        return;
      }

      try {
        setCities(await searchCities(query, controller.signal));
      } catch {
        setCities([]);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function updateCities(nextCities: string[]) {
    onChange(nextCities.join(", "));
  }

  function addCity(cityName: string) {
    const cleanName = cityName.trim();
    if (!cleanName || selectedCities.some((city) => city.toLowerCase() === cleanName.toLowerCase())) {
      setQuery("");
      setOpen(false);
      return;
    }

    updateCities([...selectedCities, cleanName]);
    setQuery("");
    setOpen(false);
    setCities([]);
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0 flex-1">
      <div className="scrollbar-none flex min-h-11 min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap pr-1">
        {selectedCities.map((city) => (
          <span key={city} className="inline-flex max-w-36 shrink-0 items-center gap-1.5 rounded-lg border border-sky-200/70 bg-sky-50/90 px-2.5 py-1.5 text-sm font-black text-sky-800 shadow-sm">
            <span className="truncate">{city}</span>
            <button type="button" onClick={() => updateCities(selectedCities.filter((item) => item !== city))} className="rounded-full p-0.5 text-sky-500 transition hover:bg-sky-100 hover:text-sky-900" aria-label={`Remove ${city}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <label className="flex min-w-28 shrink-0 items-center">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selectedCities.length === 0 ? "Add city" : "Add more"}
            className="w-32 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/12" style={{ minWidth: 340 }}>
          {cities.length === 0 ? (
            <button type="button" onClick={() => addCity(query)} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-600 hover:bg-blue-50">
              Add "{query.trim()}"
            </button>
          ) : cities.map((city) => (
            <button key={`${city.name}-${city.countryName}-${city.lat}-${city.lon}`} type="button" onClick={() => addCity(city.name)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">{city.name}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{city.countryName || city.address}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parseCities(value: string): string[] {
  const seen = new Set<string>();

  return value
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean)
    .filter((city) => {
      const key = city.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildFlightSearchUrl(input: { date: string; destinationCode: string; destinationName: string; originCode: string }): string {
  const params = new URLSearchParams({
    date: input.date,
    toName: input.destinationName,
    source: "planner",
  });

  if (input.destinationCode.trim()) {
    params.set("to", input.destinationCode.trim());
    params.set("toAll", input.destinationCode.trim());
  }

  if (input.originCode.trim()) {
    params.set("from", input.originCode.trim());
    params.set("fromAll", input.originCode.trim());
  }

  return `/search?${params.toString()}`;
}
