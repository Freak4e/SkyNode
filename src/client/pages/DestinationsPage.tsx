import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowRight, CalendarDays, Expand, MapPin, Plane, Search, Sparkles, Ticket, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import type { CurrencyCode, ExploreDeal, Place } from "../../shared/types.js";
import { fetchExploreDeals } from "../api/exploreApi";
import { searchPlaces } from "../api/flightsApi";
import { currencyOptions, getStoredCurrency } from "../utils/currency.js";

type ViewState = "idle" | "loading" | "ready" | "error";
type PlaceGroup = {
  cityKey: string;
  city: Place | null;
  airports: Array<Place & { distanceKm?: number }>;
};

const exploreDealLimit = 100;

export function DestinationsPage() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());
  const [state, setState] = useState<ViewState>("idle");
  const [deals, setDeals] = useState<ExploreDeal[]>([]);
  const [error, setError] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    if (!origin) {
      setState("idle");
      setDeals([]);
      setError("");
      return;
    }

    let cancelled = false;
    setState("loading");
    setError("");

    fetchExploreDeals({
      origin: origin.code,
      destination: destination?.code,
      currency,
      limit: exploreDealLimit,
    })
      .then((response) => {
        if (cancelled) return;
        setDeals(response.deals || []);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setDeals([]);
        setError(err instanceof Error ? err.message : "Failed to load destination deals.");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [currency, destination?.code, origin]);

  const mappableDeals = useMemo(() => deals.filter(hasCoordinates), [deals]);
  const cheapest = deals[0];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden bg-white px-6 pb-10 pt-8 sm:px-8 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(16,185,129,0.14),transparent_30%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-sky-700">
                  <Sparkles className="h-4 w-4" />
                  Explore cheap destinations
                </span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  {origin ? `Find affordable places to fly from ${origin.cityName || origin.name}` : "Find affordable places to fly next"}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Choose your departure city first, then explore destination ideas on the map.
                </p>
              </div>

              <div className="rounded-4xl border border-stone-200 bg-white p-4 shadow-xl shadow-stone-200/60">
                <div className="grid gap-3">
                  <PlaceSearchBox label="From" value={origin} onChange={setOrigin} placeholder="Search departure city" />
                  <DestinationPicker value={destination} onChange={setDestination} />
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                    Currency
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none"
                    >
                      {currencyOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_430px]">
            <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                <StatCard label="Deals found" value={String(deals.length)} icon={<Ticket className="h-5 w-5" />} />
                <StatCard
                  label="Cheapest fare"
                  value={cheapest ? formatMoney(cheapest.price, cheapest.currency) : "—"}
                  icon={<Plane className="h-5 w-5" />}
                />
              </div>

              <section className="relative min-h-130 overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-xl shadow-stone-200/70">
                <button
                  type="button"
                  onClick={() => setMapExpanded(true)}
                  disabled={mappableDeals.length === 0}
                  className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-slate-700 shadow-lg ring-1 ring-stone-200 backdrop-blur transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Expand className="h-4 w-4" />
                  Expand map
                </button>
                {origin ? <ExploreMap deals={mappableDeals} /> : <EmptyMapState />}
              </section>
            </div>

            <aside className="space-y-4">
                <div className="rounded-4xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Popular flight boards</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Best current offers</h2>
                  </div>
                  <Search className="h-5 w-5 text-slate-400" />
                </div>

                  {state === "idle" && (
                    <p className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm font-semibold text-slate-600">
                      Select a departure city to load destination deals.
                    </p>
                  )}
                  {state === "loading" && <LoadingBoards />}
                {state === "error" && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
                {state === "ready" && deals.length === 0 && (
                  <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    No destination deals were returned for this route. Try a larger origin city like Vienna, Zagreb, Belgrade, London, or Paris.
                  </p>
                )}
                {state === "ready" && deals.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {deals.slice(0, 14).map((deal) => (
                      <DealBoard key={`${deal.origin}-${deal.destination}-${deal.price}-${deal.departDate}`} deal={deal} />
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>
      {mapExpanded && (
        <div className="fixed inset-0 z-90 bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative h-full overflow-hidden rounded-4xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="absolute right-5 top-5 z-30 rounded-full bg-white p-3 text-slate-700 shadow-lg ring-1 ring-stone-200"
              aria-label="Close expanded map"
            >
              <X className="h-5 w-5" />
            </button>
            <ExploreMap deals={mappableDeals} />
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

function PlaceSearchBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const groupedPlaces = useMemo(() => groupPlaces(places), [places]);

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPlaces([]);
      return () => controller.abort();
    }

    const timeout = window.setTimeout(() => {
      searchPlaces(trimmed, controller.signal).then(setPlaces).catch(() => setPlaces([]));
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <label className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-slate-400">{label}</span>
          <input
            value={value ? `${value.cityName || value.name} (${value.code})` : query}
            onChange={(event) => {
              onChange(null);
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
        {value ? (
          <button type="button" onClick={() => { onChange(null); setQuery(""); }} className="rounded-full bg-stone-200 p-2 text-slate-600">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">
            {label === "From" ? "Required" : "Any"}
          </span>
        )}
      </div>

      {open && !value && groupedPlaces.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {groupedPlaces.slice(0, 8).map((group) => (
            <div key={group.cityKey} className="border-b border-slate-100 last:border-b-0">
              {group.city && (
                <PlaceOption
                  place={group.city}
                  title={group.city.cityName || group.city.name}
                  subtitle={`City code · all airports${group.airports.length > 0 ? ` · ${group.airports.length} airport${group.airports.length === 1 ? "" : "s"}` : ""}`}
                  badge="City"
                  onSelect={() => {
                    onChange(group.city);
                    setQuery("");
                    setOpen(false);
                  }}
                />
              )}

              {group.airports.map((airport) => (
                <PlaceOption
                  key={`${airport.code}-${airport.name}`}
                  place={airport}
                  title={airport.mainAirportName || airport.name}
                  subtitle={[
                    airport.cityName || airport.name,
                    airport.countryName,
                    typeof airport.distanceKm === "number" ? `${airport.distanceKm} km from city center` : "",
                  ].filter(Boolean).join(" · ")}
                  badge="Airport"
                  onSelect={() => {
                    onChange(airport);
                    setQuery("");
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceOption({
  place,
  title,
  subtitle,
  badge,
  onSelect,
}: {
  place: Place;
  title: string;
  subtitle: string;
  badge: "City" | "Airport";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sky-50"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
          badge === "City" ? "bg-sky-50 text-sky-700" : "bg-stone-100 text-stone-600"
        }`}
        >
          {badge}
        </span>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{place.code}</span>
      </span>
    </button>
  );
}

function DestinationPicker({ value, onChange }: { value: Place | null; onChange: (place: Place | null) => void }) {
  return (
    <PlaceSearchBox
      label="Where to"
      value={value}
      onChange={onChange}
      placeholder="Anywhere or search a city"
    />
  );
}

function groupPlaces(places: Place[]): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();

  for (const place of places) {
    const key = (place.cityCode || place.cityName || place.code || place.name).toUpperCase();

    if (!groups.has(key)) {
      groups.set(key, { cityKey: key, city: null, airports: [] });
    }

    const group = groups.get(key)!;

    if (place.type === "city") {
      group.city = place;
    } else {
      group.airports.push({ ...place });
    }
  }

  for (const group of groups.values()) {
    if (group.city?.coordinates) {
      group.airports = group.airports.map((airport) => ({
        ...airport,
        distanceKm: distanceKm(group.city?.coordinates, airport.coordinates),
      }));
    }

    group.airports.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.city && !b.city) return -1;
    if (!a.city && b.city) return 1;
    return 0;
  });
}

function distanceKm(a?: { lat: number; lon: number }, b?: { lat: number; lon: number }): number | undefined {
  if (!a || !b) return undefined;

  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(h)));
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="flex items-center justify-between">
        <span className="rounded-2xl bg-sky-50 p-3 text-sky-700">{icon}</span>
        <p className="text-2xl font-black text-slate-950">{value}</p>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  );
}

function DealBoard({ deal }: { deal: ExploreDeal }) {
  const rawName = deal.destinationPlace?.cityName || deal.destinationPlace?.name || deal.destination;
  const name = normalizeDestinationName(rawName, deal.destination);
  const country = deal.destinationPlace?.countryName || "";
  const coordinates = deal.destinationPlace?.coordinates;
  const airportName = deal.destinationPlace?.mainAirportName || deal.destinationPlace?.name || "";
  const searchLink = buildInternalSearchLink(deal);

  return (
    <Link
      to={searchLink}
      className="group grid grid-cols-[112px_1fr] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-xl"
    >
      <DestinationPhoto
        placeName={name}
        country={country}
        code={deal.destination}
        airportName={airportName}
        coordinates={coordinates}
      />
      <div>
        <div className="bg-linear-to-r from-slate-800 to-sky-700 px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{deal.origin} to {deal.destination}</p>
              <p className="mt-1 text-lg font-black">{name}</p>
            </div>
            <p className="text-xl font-black">{formatMoney(deal.price, deal.currency)}</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">{country || "Destination idea"}</p>
            <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-400">
              <CalendarDays className="h-4 w-4" />
              {deal.departDate || "Flexible dates"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {deal.stopsText || "Flight offer"} {deal.airline ? `· ${deal.airline}` : ""}
            </p>
          </div>
          <span className="self-center rounded-full bg-stone-100 p-2 text-slate-600 transition group-hover:bg-sky-700 group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function DestinationPhoto({
  placeName,
  country,
  code,
  airportName,
  coordinates,
}: {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
  coordinates?: { lat: number; lon: number };
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    setPhotoUnavailable(false);

    fetchDestinationImage({ placeName, country, code, airportName, coordinates }).then((url) => {
      if (cancelled) return;
      setImageUrl(url || null);
      setPhotoUnavailable(!url);
    });

    return () => {
      cancelled = true;
    };
  }, [airportName, code, coordinates, country, placeName]);

  return (
    <div className="relative min-h-full overflow-hidden bg-linear-to-br from-stone-100 via-sky-50 to-cyan-100">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${placeName} destination`}
          className="h-full min-h-40 w-full object-cover transition duration-300 group-hover:scale-105"
          onError={() => {
            setImageUrl(null);
            setPhotoUnavailable(true);
          }}
        />
      ) : coordinates ? (
        <CityMapPreview coordinates={coordinates} placeName={placeName} dimmed={!photoUnavailable} />
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center">
          <Plane className="h-8 w-8 text-sky-600/70" />
        </div>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/30 to-transparent" />
    </div>
  );
}

function CityMapPreview({
  coordinates,
  placeName,
  dimmed,
}: {
  coordinates: { lat: number; lon: number };
  placeName: string;
  dimmed: boolean;
}) {
  const tiles = getPreviewTiles(coordinates.lat, coordinates.lon, 10);

  return (
    <div className={`relative grid h-full min-h-40 grid-cols-2 grid-rows-2 overflow-hidden ${dimmed ? "opacity-70" : ""}`}>
      {tiles.map((tile) => (
        <img
          key={`${tile.x}-${tile.y}`}
          src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ))}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-white/10" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-1.5 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
      </div>
      <span className="absolute bottom-2 left-2 right-2 truncate rounded-full bg-white/85 px-2 py-1 text-center text-[10px] font-black text-slate-700 shadow-sm">
        {placeName}
      </span>
    </div>
  );
}

function getPreviewTiles(lat: number, lon: number, z: number): Array<{ z: number; x: number; y: number }> {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const centerX = Math.floor(((lon + 180) / 360) * n);
  const centerY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const x = Math.max(0, Math.min(n - 2, centerX));
  const y = Math.max(0, Math.min(n - 2, centerY));

  return [
    { z, x, y },
    { z, x: x + 1, y },
    { z, x, y: y + 1 },
    { z, x: x + 1, y: y + 1 },
  ];
}

function LoadingBoards() {
  return (
    <div className="mt-5 space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyMapState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12),transparent_35%),linear-gradient(135deg,#ffffff,#f5f5f4)]">
      <div className="max-w-sm rounded-4xl border border-stone-200 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-700">
          <MapPin className="h-6 w-6" />
        </span>
        <h3 className="mt-5 text-xl font-black text-slate-950">Start with a departure city</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Choose where you are flying from, then SkyNode will place destination deals on the map.
        </p>
      </div>
    </div>
  );
}

function ExploreMap({ deals }: { deals: ExploreDeal[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [42, 12],
      zoom: 4,
      minZoom: 2,
      maxZoom: 8,
      worldCopyJump: true,
      zoomControl: false,
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.layerGroup().addTo(map);
    const bounds = L.latLngBounds([]);

    deals.forEach((deal) => {
      const coords = deal.destinationPlace?.coordinates;
      if (!coords) return;
      const position: L.LatLngExpression = [coords.lat, coords.lon];
      bounds.extend(position);
      const price = formatMoney(deal.price, deal.currency);
      const city = deal.destinationPlace?.cityName || deal.destination;

      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "",
          html: `
            <div class="group relative -translate-x-1/2 -translate-y-full">
              <div class="whitespace-nowrap rounded-3xl border border-white bg-white/95 px-3.5 py-2.5 text-left shadow-xl shadow-slate-900/15 ring-1 ring-stone-200 backdrop-blur">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 items-center justify-center rounded-2xl bg-sky-50 text-[10px] font-black text-sky-700">${deal.destination}</span>
                  <div>
                    <div class="text-xs font-black leading-none text-slate-950">${city}</div>
                    <div class="mt-1 text-[11px] font-black text-sky-700">${price}</div>
                  </div>
                </div>
              </div>
              <div class="mx-auto h-3 w-3 -translate-y-1 rotate-45 border-b border-r border-stone-200 bg-white"></div>
            </div>
          `,
          iconSize: [160, 56],
          iconAnchor: [80, 56],
        }),
      }).addTo(layer);

      marker.on("click", () => {
        window.location.assign(buildInternalSearchLink(deal));
      });
    });

    if (bounds.isValid()) map.fitBounds(bounds.pad(0.25));

    return () => {
      layer.removeFrom(map);
    };
  }, [deals]);

  return (
    <>
      <div className="absolute left-5 top-5 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-slate-700 shadow-lg backdrop-blur">
        Destination map
      </div>
      <div ref={mapElementRef} className="absolute inset-0 z-0" />
    </>
  );
}

function hasCoordinates(deal: ExploreDeal): boolean {
  const coords = deal.destinationPlace?.coordinates;
  return typeof coords?.lat === "number" && typeof coords?.lon === "number";
}

function formatMoney(value: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildInternalSearchLink(deal: ExploreDeal): string {
  const params = new URLSearchParams({
    from: deal.origin,
    to: deal.destination,
    date: deal.departDate || new Date().toISOString().slice(0, 10),
    fromName: deal.origin,
    toName: deal.destinationPlace?.cityName || deal.destinationPlace?.name || deal.destination,
    tripType: "one-way",
    passengers: "1",
  });

  return `/search?${params.toString()}`;
}

async function fetchDestinationImage(input: {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
  coordinates?: { lat: number; lon: number };
}): Promise<string | undefined> {
  const wikipediaImage = await fetchWikipediaImage(input);
  if (wikipediaImage) return wikipediaImage;

  const categoryImage = await fetchWikimediaCategoryImage(input);
  if (categoryImage) return categoryImage;

  if (input.coordinates) {
    const nearbyImage = await fetchWikimediaNearbyImage(input);
    if (nearbyImage) return nearbyImage;
  }

  return fetchWikimediaCommonsImage(input);
}

async function fetchWikipediaImage(input: {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
}): Promise<string | undefined> {
  const candidates = buildCityImageSearchTerms(input);

  for (const candidate of candidates) {
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`);
      if (!response.ok) continue;
      const data = await response.json();
      const imageUrl = data?.originalimage?.source || data?.thumbnail?.source;
      if (isUsableCityImage(imageUrl)) return imageUrl;
    } catch {
      // Try the next candidate.
    }
  }

  const searchImage = await fetchWikipediaSearchImage(candidates);
  if (searchImage) return searchImage;

  return undefined;
}

function buildCityImageSearchTerms(input: {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
}): string[] {
  const { placeName, country, code, airportName } = input;
  const cleaned = placeName
    .replace(/\b(?:airport|international|intl\.?|metropolitan|all airports)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedCode = code.trim().toUpperCase();
  const terms = new Set<string>();

  [cleaned, placeName].filter(Boolean).forEach((term) => {
    terms.add(term);
    terms.add(`${term} city`);
    terms.add(`${term} skyline`);
    terms.add(`${term} old town`);
    terms.add(`${term} landmark`);
    terms.add(`${term} travel`);
    if (country) terms.add(`${term} ${country}`);
    if (normalizedCode) {
      terms.add(`${term} ${normalizedCode} airport city`);
      terms.add(`${term} ${country} ${normalizedCode}`);
    }
  });

  if (airportName) {
    const cleanedAirport = airportName.replace(/\b(?:airport|international|intl\.?)\b/gi, "").replace(/\s+/g, " ").trim();
    if (cleanedAirport && cleanedAirport.toLowerCase() !== cleaned.toLowerCase()) {
      terms.add(`${cleanedAirport} city`);
      terms.add(`${cleanedAirport} ${country}`);
    }
  }

  return Array.from(terms);
}

async function fetchWikipediaSearchImage(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates.slice(0, 8)) {
    try {
      const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
      searchUrl.searchParams.set("origin", "*");
      searchUrl.searchParams.set("action", "query");
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("list", "search");
      searchUrl.searchParams.set("srlimit", "4");
      searchUrl.searchParams.set("srsearch", candidate);

      const response = await fetch(searchUrl);
      if (!response.ok) continue;

      const data = await response.json();
      const titles = (data?.query?.search || [])
        .map((result: { title?: string }) => result.title)
        .filter((title: unknown): title is string => typeof title === "string" && isLikelyCityPage(title));

      for (const title of titles) {
        const summary = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!summary.ok) continue;
        const summaryData = await summary.json();
        const imageUrl = summaryData?.originalimage?.source || summaryData?.thumbnail?.source;
        if (isUsableCityImage(imageUrl)) return imageUrl;
      }
    } catch {
      // Try the next search term.
    }
  }

  return undefined;
}

function isLikelyCityPage(title: string): boolean {
  const lower = title.toLowerCase();
  return !["airport", "airline", "province", "region", "flag", "coat of arms", "football", "club"].some((term) =>
    lower.includes(term),
  );
}

type DestinationImageInput = {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
  coordinates?: { lat: number; lon: number };
};

type WikimediaImagePage = {
  title?: string;
  imageinfo?: Array<{ thumburl?: string; url?: string }>;
};

async function fetchWikimediaCategoryImage(input: DestinationImageInput): Promise<string | undefined> {
  const categoryTitles = await buildWikimediaCategoryTitles(input);

  for (const categoryTitle of categoryTitles) {
    try {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      url.searchParams.set("origin", "*");
      url.searchParams.set("action", "query");
      url.searchParams.set("format", "json");
      url.searchParams.set("generator", "categorymembers");
      url.searchParams.set("gcmtitle", categoryTitle);
      url.searchParams.set("gcmnamespace", "6");
      url.searchParams.set("gcmtype", "file");
      url.searchParams.set("gcmlimit", "35");
      url.searchParams.set("prop", "imageinfo");
      url.searchParams.set("iiprop", "url");
      url.searchParams.set("iiurlwidth", "700");

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const image = pickBestDestinationImage(Object.values(data?.query?.pages || {}) as WikimediaImagePage[], input);
      if (image) return image;
    } catch {
      // Try the next category.
    }
  }

  return undefined;
}

async function buildWikimediaCategoryTitles(input: DestinationImageInput): Promise<string[]> {
  const { placeName, country } = input;
  const cleaned = cleanPlaceName(placeName);
  const titles = new Set<string>();

  [
    cleaned,
    `${cleaned}, ${country}`,
    `Views of ${cleaned}`,
    `Panoramas of ${cleaned}`,
    `Skylines in ${cleaned}`,
    `Cityscapes of ${cleaned}`,
    `Streets in ${cleaned}`,
    `Squares in ${cleaned}`,
    `Buildings in ${cleaned}`,
    `Tourist attractions in ${cleaned}`,
    `Landmarks in ${cleaned}`,
  ]
    .filter((title) => title.replace(/[, ]/g, "").length > 0)
    .forEach((title) => titles.add(`Category:${title}`));

  const searchedCategories = await searchWikimediaCategories(input);
  searchedCategories.forEach((title) => titles.add(title));

  return Array.from(titles).slice(0, 18);
}

async function searchWikimediaCategories(input: DestinationImageInput): Promise<string[]> {
  const { placeName, country } = input;
  const cleaned = cleanPlaceName(placeName);
  const searches = [`${cleaned} city`, `${cleaned} ${country}`, `Views of ${cleaned}`, `Buildings in ${cleaned}`].filter(Boolean);
  const categories = new Set<string>();

  for (const term of searches) {
    try {
      const url = new URL("https://commons.wikimedia.org/w/api.php");
      url.searchParams.set("origin", "*");
      url.searchParams.set("action", "query");
      url.searchParams.set("format", "json");
      url.searchParams.set("list", "search");
      url.searchParams.set("srnamespace", "14");
      url.searchParams.set("srlimit", "5");
      url.searchParams.set("srsearch", term);

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      (data?.query?.search || [])
        .map((result: { title?: string }) => result.title)
        .filter((title: unknown): title is string => typeof title === "string" && isLikelyDestinationCategory(title, input))
        .forEach((title: string) => categories.add(title));
    } catch {
      // Try the next category search.
    }
  }

  return Array.from(categories).slice(0, 10);
}

function isLikelyDestinationCategory(title: string, input: DestinationImageInput): boolean {
  const lower = title.toLowerCase();
  const city = cleanPlaceName(input.placeName).toLowerCase();
  const country = input.country.toLowerCase();
  const blockedTerms = [
    "airport",
    "aircraft",
    "airline",
    "maps",
    "flags",
    "logos",
    "football",
    "sports",
    "people",
    "food",
    "cuisine",
    "maltesers",
  ];

  if (blockedTerms.some((term) => lower.includes(term))) return false;
  return lower.includes(city) || Boolean(country && lower.includes(country));
}

async function fetchWikimediaNearbyImage(input: DestinationImageInput): Promise<string | undefined> {
  if (!input.coordinates) return undefined;

  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("origin", "*");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "geosearch");
    url.searchParams.set("ggscoord", `${input.coordinates.lat}|${input.coordinates.lon}`);
    url.searchParams.set("ggsradius", "15000");
    url.searchParams.set("ggslimit", "35");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url");
    url.searchParams.set("iiurlwidth", "700");

    const response = await fetch(url);
    if (!response.ok) return undefined;

    const data = await response.json();
    return pickBestDestinationImage(Object.values(data?.query?.pages || {}) as WikimediaImagePage[], input);
  } catch {
    return undefined;
  }
}

async function fetchWikimediaCommonsImage(input: {
  placeName: string;
  country: string;
  code: string;
  airportName: string;
}): Promise<string | undefined> {
  const searchTerms = buildCityImageSearchTerms(input)
    .flatMap((term) => [`${term} city view`, `${term} panorama`, `${term} skyline`, `${term} old town`, `${term} landmark`])
    .slice(0, 24);

  for (const term of searchTerms) {
    try {
      const searchUrl = new URL("https://commons.wikimedia.org/w/api.php");
      searchUrl.searchParams.set("origin", "*");
      searchUrl.searchParams.set("action", "query");
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("generator", "search");
      searchUrl.searchParams.set("gsrnamespace", "6");
      searchUrl.searchParams.set("gsrlimit", "8");
      searchUrl.searchParams.set("gsrsearch", term);
      searchUrl.searchParams.set("prop", "imageinfo");
      searchUrl.searchParams.set("iiprop", "url");
      searchUrl.searchParams.set("iiurlwidth", "700");

      const response = await fetch(searchUrl);
      if (!response.ok) continue;

      const data = await response.json();
      const image = pickBestDestinationImage(Object.values(data?.query?.pages || {}) as WikimediaImagePage[], input);

      if (image) return image;
    } catch {
      // Try the next search term.
    }
  }

  return undefined;
}

function pickBestDestinationImage(pages: WikimediaImagePage[], input: DestinationImageInput): string | undefined {
  return pages
    .map((page) => ({
      title: page.title || "",
      imageUrl: page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url,
      score: scoreDestinationImage(page.title || "", input),
    }))
    .filter(
      (image): image is { title: string; imageUrl: string; score: number } =>
        isLikelyCityPhotoTitle(image.title, input) && isUsableCityImage(image.imageUrl) && image.score >= 2,
    )
    .sort((a, b) => b.score - a.score)
    .map((image) => image.imageUrl)
    .find(Boolean);
}

function scoreDestinationImage(title: string, input: DestinationImageInput): number {
  const lower = title.toLowerCase();
  const city = cleanPlaceName(input.placeName).toLowerCase();
  const country = input.country.toLowerCase();
  let score = 0;

  if (city && lower.includes(city)) score += 8;
  if (country && lower.includes(country)) score += 3;

  cityPhotoTerms.forEach((term) => {
    if (lower.includes(term)) score += 2;
  });

  blockedImageTerms.forEach((term) => {
    if (lower.includes(term)) score -= 6;
  });

  return score;
}

const cityPhotoTerms = [
  "city",
  "town",
  "view",
  "panorama",
  "skyline",
  "old town",
  "street",
  "square",
  "harbour",
  "harbor",
  "waterfront",
  "landmark",
  "cathedral",
  "castle",
  "aerial",
  "center",
  "centre",
  "downtown",
  "historic",
  "architecture",
  "buildings",
  "promenade",
  "port",
  "marina",
  "bay",
  "coast",
  "beach",
];

const blockedImageTerms = [
  "airport",
  "aircraft",
  "airplane",
  "aeroplane",
  "plane",
  "terminal",
  "runway",
  "logo",
  "flag",
  "map",
  "food",
  "restaurant",
  "people",
  "girl",
  "woman",
  "women",
  "man",
  "men",
  "boy",
  "portrait",
  "selfie",
  "model",
  "fashion",
  "wedding",
  "sport",
  "football",
  "club",
  "car",
  "cars",
  "automobile",
  "vehicle",
  "vehicles",
  "bus",
  "taxi",
  "motorcycle",
  "scooter",
  "racing",
  "traffic",
  "parking",
  "candy",
  "sweet",
  "sweets",
  "chocolate",
  "maltesers",
  "snack",
  "confectionery",
];

function isLikelyCityPhotoTitle(title: string, input: DestinationImageInput): boolean {
  const lower = title.toLowerCase();
  const city = cleanPlaceName(input.placeName).toLowerCase();
  const hasLocationMatch = hasDestinationNameMatch(lower, city);
  const hasCityPhotoSignal = cityPhotoTerms.some((term) => lower.includes(term));

  if (blockedImageTerms.some((term) => lower.includes(term))) return false;
  return hasLocationMatch && hasCityPhotoSignal;
}

function hasDestinationNameMatch(text: string, destinationName: string): boolean {
  if (!destinationName) return false;
  if (text.includes(destinationName)) return true;

  const tokens = destinationName
    .split(/[\s,.'()-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !["city", "town", "airport", "international"].includes(token));

  if (tokens.length === 0) return false;
  return tokens.every((token) => text.includes(token));
}

function isUsableCityImage(imageUrl: unknown): imageUrl is string {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) return false;

  const lower = imageUrl.toLowerCase();
  if (blockedImageTerms.some((term) => lower.includes(term))) return false;
  if (["coat_of_arms", "coat-of-arms", "emblem", "seal", "symbol"].some((term) => lower.includes(term))) return false;
  if (lower.endsWith(".svg") || lower.includes(".svg/")) return false;

  return true;
}

function cleanPlaceName(placeName: string): string {
  return placeName
    .replace(/\b(?:airport|international|intl\.?|metropolitan|all airports)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDestinationName(name: string, code: string): string {
  const normalizedCode = code.toUpperCase();
  const corrections: Record<string, string> = {
    JMK: "Mykonos",
  };

  if (corrections[normalizedCode]) return corrections[normalizedCode];
  if (/^mikonos$/i.test(name)) return "Mykonos";

  return name;
}

