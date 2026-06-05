import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Building2, CalendarDays, CircleDollarSign, Compass, CopyPlus, Globe2, Lock, MapPin, Mountain, Plus, Search, Sparkles, Star, Tent, Users, Utensils, Waves, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { listSavedTrips } from "../api/assistantApi";
import { saveTrip } from "../api/plannerApi";
import { listJoinedTrips, profileFromUser } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { AccentCard, Button, ButtonLink, HeroPanel, PageShell, SectionHeader } from "../components/ui";
import { demoTripCategories, demoTrips, type DemoTripCategory, type DemoTripTemplate } from "../data/demoTrips";
import { useDestinationImage } from "../utils/destinationImage";

const pendingTemplateKey = "skynode:pendingDemoTrip";
const pageSize = 6;

const categoryIcons: Record<DemoTripCategory, ReactNode> = {
  all: <Sparkles className="h-4 w-4" />,
  city: <Building2 className="h-4 w-4" />,
  beach: <Waves className="h-4 w-4" />,
  mountains: <Mountain className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
  adventure: <Tent className="h-4 w-4" />,
};

export function TripsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DemoTripCategory>("all");
  const [page, setPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState<DemoTripTemplate | null>(null);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [hasLibraryTrips, setHasLibraryTrips] = useState(false);

  const filteredTrips = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return demoTrips.filter((trip) => {
      const categoryMatch = category === "all" || trip.category === category;
      const textMatch = !cleanQuery
        || [trip.title, trip.destinationName, trip.location, trip.country, trip.description, ...trip.tags, ...trip.interests]
          .join(" ")
          .toLowerCase()
          .includes(cleanQuery);

      return categoryMatch && textMatch;
    });
  }, [category, query]);

  const pageCount = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const visibleTrips = filteredTrips.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [category, query]);

  useEffect(() => {
    if (authLoading || !user) return;

    const pendingTemplateId = sessionStorage.getItem(pendingTemplateKey);
    if (!pendingTemplateId) return;

    const trip = demoTrips.find((item) => item.id === pendingTemplateId);
    sessionStorage.removeItem(pendingTemplateKey);

    if (trip) {
      void cloneTrip(trip);
    }
  }, [authLoading, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadTripLibraryState() {
      if (authLoading) return;

      if (!user) {
        setHasLibraryTrips(false);
        return;
      }

      try {
        const [createdTrips, joinedTrips] = await Promise.all([listSavedTrips(), listJoinedTrips()]);
        if (!cancelled) setHasLibraryTrips(createdTrips.length + joinedTrips.length > 0);
      } catch {
        if (!cancelled) setHasLibraryTrips(false);
      }
    }

    void loadTripLibraryState();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function cloneTrip(trip: DemoTripTemplate) {
    if (!user) {
      sessionStorage.setItem(pendingTemplateKey, trip.id);
      navigate("/auth", { state: { from: "/trips" } });
      return;
    }

    setSavingId(trip.id);
    setError("");

    try {
      const response = await saveTrip({
        destinationCode: trip.destinationCode,
        destinationName: trip.destinationName,
        startDate: trip.itinerary.startDate,
        days: trip.days,
        budget: trip.budget,
        budgetAmount: trip.budgetAmount,
        travelers: trip.travelers,
        pace: trip.pace,
        interests: trip.interests,
        cities: [{ id: "city-1", name: trip.city, country: trip.country, notes: "Template destination" }],
        budgetCategories: [
          { id: "hotels", label: "Hotels", amount: Math.round(trip.budgetAmount * 0.38) },
          { id: "food", label: "Food", amount: Math.round(trip.budgetAmount * 0.22) },
          { id: "activities", label: "Activities", amount: Math.round(trip.budgetAmount * 0.24) },
          { id: "transport", label: "Local transport", amount: Math.round(trip.budgetAmount * 0.16) },
        ],
        tags: trip.tags,
        title: trip.title,
        itinerary: trip.itinerary,
        visibility: "private",
        description: trip.description,
        maxMembers: 6,
        ownerProfile: profileFromUser(user),
      });

      setSelectedTrip(null);
      navigate(`/planner?tripId=${encodeURIComponent(response.tripId)}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save this trip.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell>
        <HeroPanel
          eyebrow={<><Sparkles className="h-3.5 w-3.5" />Explore community trips</>}
          title="Find a trip you love. Make it your own."
          description="Browse itineraries shared by real travelers, or hand the brief to our AI planner and get a custom day-by-day plan in seconds."
          actions={
            <div className="grid w-full min-w-0 gap-3 lg:w-96">
              <label className="relative block w-full min-w-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search destination or trip style"
                  className="w-full rounded-2xl border border-white/15 bg-white/10 py-4 pl-11 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-300 transition focus:border-cyan-200 focus:bg-white/15"
                />
              </label>

              {!authLoading && user && (
                <div className={`grid gap-2 ${hasLibraryTrips ? "sm:grid-cols-2" : ""}`}>
                  <ButtonLink to="/planner" tone="primary" size="md" icon={<Plus className="h-4 w-4" />} className="w-full">
                    New trip
                  </ButtonLink>
                  {hasLibraryTrips && (
                    <ButtonLink to="/trip-library" tone="ghost" size="md" icon={<BookOpen className="h-4 w-4" />} className="w-full">
                      Your trips
                    </ButtonLink>
                  )}
                </div>
              )}
            </div>
          }
        />

        <section>
          <SectionHeader
            className="mb-5"
            eyebrow="Curated trip templates"
            icon={<Compass className="h-4 w-4" />}
            title="Trending this week"
            subtitle="Curated itineraries you can clone and tweak in one click."
          />

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {demoTripCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
                  category === item.id
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                }`}
              >
                {categoryIcons[item.id]}
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleTrips.map((trip) => (
              <DemoTripCard
                key={trip.id}
                trip={trip}
                onView={() => setSelectedTrip(trip)}
              />
            ))}
          </div>

          {filteredTrips.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-card">
              <p className="text-xl font-black text-slate-950">No templates match that search.</p>
              <p className="mt-2 text-sm text-slate-500">Try another destination, interest, or category.</p>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                type="button"
                tone="ghost"
                disabled={page === 1}
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
                {page} / {pageCount}
              </span>
              <Button
                type="button"
                tone="ghost"
                disabled={page === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        <section className="relative mt-12 min-h-72 overflow-hidden rounded-3xl bg-hero-panel p-6 text-white shadow-card-strong sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_88%,rgba(20,184,166,0.34),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.18),transparent_30%)]" />
          <div className="relative grid min-h-52 gap-8 md:grid-cols-[minmax(0,1fr)_30rem] md:items-center">
            <div className="min-w-0">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-100">
                <Compass className="h-3.5 w-3.5" />
                Build your own
              </p>
              <h2 className="text-3xl font-black leading-tight md:text-4xl">Don't see your perfect trip?</h2>
              <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-slate-100">
                Pick a path below — start from a blank canvas, hand it to AI, or get inspired by what the community is planning.
              </p>

              <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
                <CtaStat value="1k+" label="Trips planned" />
                <CtaStat value="120+" label="Destinations" />
                <CtaStat value="4.8★" label="Avg rating" />
              </div>

            </div>

            <div className="relative hidden h-60 md:block">
              <div className="absolute right-0 top-0 w-64 rotate-3 rounded-3xl bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/20">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-blue-700">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight">AI draft ready</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">7-day Lisbon trip</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-4/5 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">Generated in 8s</p>
              </div>

              <div className="absolute bottom-0 left-0 w-56 -rotate-2 rounded-3xl bg-white p-4 text-slate-950 shadow-2xl shadow-slate-950/20">
                <p className="text-xs font-black">Day 2 · Belém</p>
                <div className="mt-3 space-y-2 text-[11px] font-bold text-slate-600">
                  <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-600" />10:00 · Jerónimos</p>
                  <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-500" />13:00 · Pastéis de Belém</p>
                  <p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />18:00 · LX Factory sunset</p>
                </div>
              </div>

              <div className="absolute left-44 top-20 z-10 w-48 rotate-6 rounded-3xl bg-emerald-400 p-4 text-emerald-950 shadow-2xl shadow-emerald-950/20">
                <p className="text-[10px] font-black uppercase tracking-widest">Budget</p>
                <p className="mt-1 text-xl font-black">$1,240 / $1,500</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-900/20">
                  <div className="h-full w-[82%] rounded-full bg-emerald-950" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <CtaActionCard
            to="/planner"
            icon={<Sparkles className="h-4 w-4" />}
            title="Make a new trip"
            description="Start the 4-step wizard and let AI draft your itinerary."
          />
          <CtaActionCard
            to="/explore-trips"
            icon={<Users className="h-4 w-4" />}
            title="View community"
            description="See trips travelers are planning and remixing this week."
          />
          <CtaActionCard
            to="/destinations"
            icon={<Globe2 className="h-4 w-4" />}
            title="Browse destinations"
            description="Explore cities, coastlines and trails by region, then compare route ideas before planning."
          />
        </div>
      </PageShell>

      {selectedTrip && (
        <TripPreviewModal
          trip={selectedTrip}
          saving={savingId === selectedTrip.id}
          onClose={() => setSelectedTrip(null)}
          onClone={() => cloneTrip(selectedTrip)}
        />
      )}

      <Footer />
    </div>
  );
}

function DemoTripCard({ onView, trip }: { onView: () => void; trip: DemoTripTemplate }) {
  const imageUrl = useDestinationImage(trip.imageCity || trip.city, trip.country);
  const categoryLabel = demoTripCategories.find((item) => item.id === trip.category)?.label || "Trip";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-card-strong">
      <div className="relative h-44 bg-slate-200">
        {imageUrl ? (
          <img src={imageUrl} alt={trip.location} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-linear-to-br from-blue-500 to-cyan-400" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-950">
          {categoryLabel}
        </span>
        <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-black text-white">
          {trip.days} days
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-black text-slate-950">{trip.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
          <MapPin className="h-4 w-4" />
          {trip.location}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-slate-600">
          <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
          {trip.rating.toFixed(1)} <span className="text-slate-400">({trip.reviews})</span>
        </p>
      </div>

      <div className="mx-5 border-t border-slate-200" />

      <div className="flex items-center justify-between gap-3 p-5">
        <p className="text-sm font-black text-slate-950">From ${trip.fromPrice.toLocaleString()}</p>
        <button type="button" onClick={onView} className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-cyan-600">
          View trip
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function CtaStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/12 px-5 py-4 text-center shadow-lg shadow-slate-950/10 backdrop-blur">
      <p className="text-xl font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-200">{label}</p>
    </div>
  );
}

function CtaActionCard({
  description,
  icon,
  title,
  to,
}: {
  description: string;
  icon: ReactNode;
  title: string;
  to: string;
}) {
  return (
    <AccentCard as="article" className="flex min-h-44 flex-col items-start">
      <span className="relative mb-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20 transition group-hover:rotate-3 group-hover:scale-105 [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <span className="relative mb-2 block font-black leading-tight text-slate-950">{title}</span>
      <span className="relative block max-w-72 text-sm leading-6 text-slate-500">{description}</span>
      <Link to={to} className="relative mt-auto self-end inline-flex items-center gap-2 pt-5 text-sm font-black text-blue-700 no-underline transition hover:text-cyan-600">
        Open
        <ArrowRight className="h-4 w-4" />
      </Link>
    </AccentCard>
  );
}

function TripPreviewModal({
  onClone,
  onClose,
  saving,
  trip,
}: {
  onClone: () => void;
  onClose: () => void;
  saving: boolean;
  trip: DemoTripTemplate;
}) {
  const imageUrl = useDestinationImage(trip.imageCity || trip.city, trip.country);
  const activityCount = trip.itinerary.days.reduce((sum, day) => sum + day.items.length, 0);
  const previewDays = trip.itinerary.days.slice(0, activityCount > 12 ? 3 : 2);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Close trip preview" onClick={onClose} />
      <div className="relative flex h-[94vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[92vh] sm:rounded-3xl" role="dialog" aria-modal="true">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200/70 transition hover:bg-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-[34dvh] max-h-72 min-h-52 shrink-0 bg-slate-200 sm:h-72">
          {imageUrl ? (
            <img src={imageUrl} alt={trip.location} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-blue-500 to-cyan-400" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 pr-16 text-white sm:p-7 sm:pr-20">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]">
              <MapPin className="h-3.5 w-3.5" />
              {trip.location}
            </p>
            <h2 className="text-2xl font-black leading-tight sm:text-4xl">{trip.title}</h2>
            <p className="mt-3 line-clamp-3 max-w-3xl text-sm font-bold leading-relaxed text-slate-200 sm:line-clamp-2">{trip.description}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-6 lg:p-7">
          <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Duration" value={`${trip.days} days`} />
                <InfoRow icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Budget" value={`$${trip.fromPrice.toLocaleString()}`} />
                <InfoRow icon={<Compass className="h-3.5 w-3.5" />} label="Pace" value={trip.pace} />
                <InfoRow icon={<Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />} label="Rating" value={trip.rating.toFixed(1)} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Trip style</p>
                <div className="flex flex-wrap gap-1.5">
                  {trip.interests.slice(0, 6).map((interest) => (
                    <span key={interest} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-3">
                {previewDays.map((day) => (
                  <article key={day.dayNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-3">
                      <p className="shrink-0 text-xs font-black uppercase tracking-widest text-blue-500">Day {day.dayNumber}</p>
                      <span className="h-px flex-1 bg-linear-to-r from-blue-300/80 to-transparent" />
                    </div>
                    <h3 className="mt-2 text-lg font-black text-slate-950">{day.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{day.summary}</p>
                    <ul className="mt-4 grid gap-2">
                      {day.items.slice(0, 2).map((item) => (
                        <li key={`${day.dayNumber}-${item.title}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-600">{item.timeOfDay}</span>
                            <span className="font-black text-slate-900">{item.title}</span>
                          </div>
                          {item.location?.name && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.location.name}, {item.location.city}
                            </p>
                          )}
                          <p className="mt-2 leading-6">{item.description}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
                <article className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-center sm:p-5">
                  <p className="mx-auto flex max-w-md items-center justify-center gap-2 text-sm font-black leading-6 text-blue-700">
                    <Lock className="h-4 w-4 shrink-0" />
                    Preview of {previewDays.length} of {trip.itinerary.days.length} days — clone to unlock the full itinerary
                  </p>
                </article>
              </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:px-7">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold leading-6 text-slate-500">
              Save a private copy, then edit days, budget, pace, and activities in your planner.
            </p>
            <Button type="button" icon={<CopyPlus className="h-4 w-4" />} disabled={saving} onClick={onClone} size="lg" className="w-full shrink-0 sm:w-auto">
              {saving ? "Saving..." : "Take as your own"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="group relative min-h-16 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full bg-linear-to-br from-blue-400/12 to-cyan-300/12 blur-xl transition group-hover:scale-125" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-blue-500 via-cyan-400 to-indigo-500 opacity-70" />
      <p className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="relative mt-1 break-words text-sm font-black capitalize text-slate-950">{value}</p>
    </div>
  );
}
