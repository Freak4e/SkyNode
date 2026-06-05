import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Loader2, Lock, MapPin, Star, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { listPublicTrips, loadPublicTripPreview, profileFromUser, rateTrip, requestJoinTrip } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { CitySearchPicker } from "../components/CitySearchPicker";
import { FilterDropdown } from "../components/FilterDropdown";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, EmptyState, HeroPanel, PageShell } from "../components/ui";
import { TripCommunityCard } from "../features/trip-community/TripCommunityCard";
import { tripDisplayCity, useDestinationImage } from "../utils/destinationImage";
import type { SavedTripDetail, SavedTripSummary } from "../../shared/types.js";

const budgetOptions = [
  { value: "", label: "Any budget", description: "Show all price levels" },
  { value: "low", label: "Low", description: "Budget-friendly trips" },
  { value: "medium", label: "Medium", description: "Balanced spending" },
  { value: "high", label: "High", description: "Premium experiences" },
];

const paceOptions = [
  { value: "", label: "Any pace", description: "Relaxed to packed" },
  { value: "relaxed", label: "Relaxed", description: "Slow and easy days" },
  { value: "balanced", label: "Balanced", description: "Mix of activity and rest" },
  { value: "packed", label: "Packed", description: "See as much as possible" },
];

const sortOptions = [
  { value: "highest-rated", label: "Highest rated", description: "Best community score first" },
  { value: "soonest", label: "Soonest date", description: "Closest upcoming trips first" },
  { value: "newest", label: "Newest", description: "Recently published first" },
];

type TripSort = (typeof sortOptions)[number]["value"];

function mergePreviewRating(detail: SavedTripDetail, summary: SavedTripSummary): SavedTripDetail {
  return {
    ...detail,
    ratingAverage: summary.ratingAverage ?? detail.ratingAverage,
    ratingCount: summary.ratingCount ?? detail.ratingCount,
    ownRating: summary.ownRating ?? detail.ownRating,
  };
}

function sortPublicTrips(trips: SavedTripSummary[], sort: TripSort): SavedTripSummary[] {
  return [...trips].sort((left, right) => {
    if (sort === "soonest") {
      return tripStartDistance(left) - tripStartDistance(right)
        || ratingScore(right) - ratingScore(left)
        || newestFirst(left, right);
    }

    if (sort === "newest") {
      return newestFirst(left, right);
    }

    return ratingScore(right) - ratingScore(left)
      || Number(right.ratingCount || 0) - Number(left.ratingCount || 0)
      || tripStartDistance(left) - tripStartDistance(right);
  });
}

function ratingScore(trip: SavedTripSummary): number {
  return (trip.ratingAverage || 0) * 1000 + Math.min(trip.ratingCount || 0, 999);
}

function newestFirst(left: SavedTripSummary, right: SavedTripSummary): number {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function tripStartDistance(trip: SavedTripSummary): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${trip.startDate}T00:00:00`).getTime();

  if (!Number.isFinite(start)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const distance = start - today.getTime();

  return distance >= 0 ? distance : Number.MAX_SAFE_INTEGER + Math.abs(distance);
}

export function ExploreTripsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<SavedTripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [ratingId, setRatingId] = useState("");
  const [previewTrip, setPreviewTrip] = useState<SavedTripDetail | null>(null);
  const [error, setError] = useState("");
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("");
  const [pace, setPace] = useState("");
  const [sort, setSort] = useState<TripSort>("highest-rated");
  const [query, setQuery] = useState({ destination: "", budget: "", pace: "" });

  const visibleTrips = useMemo(() => sortPublicTrips(trips, sort), [sort, trips]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const nextTrips = await listPublicTrips(query);
        if (!cancelled) {
          setTrips(nextTrips);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query]);

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    setQuery({ destination: destination.trim(), budget, pace });
  }

  async function joinTrip(trip: SavedTripSummary) {
    if (!user) {
      navigate("/auth", { state: { from: `/explore-trips` } });
      return;
    }

    setJoiningId(trip.id);
    setError("");

    try {
      await requestJoinTrip(trip.id, profileFromUser(user));
      navigate(`/trips/${trip.id}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to request join.");
    } finally {
      setJoiningId("");
    }
  }

  async function previewCommunityTrip(trip: SavedTripSummary) {
    setPreviewLoadingId(trip.id);
    setError("");

    try {
      setPreviewTrip(mergePreviewRating(await loadPublicTripPreview(trip.id), trip));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to load trip preview.");
    } finally {
      setPreviewLoadingId("");
    }
  }

  async function submitRating(trip: SavedTripSummary, rating: number) {
    if (!user) {
      navigate("/auth", { state: { from: "/explore-trips" } });
      return;
    }

    setRatingId(trip.id);
    setError("");

    try {
      const result = await rateTrip(trip.id, rating);
      setTrips((current) => current.map((item) => (
        item.id === trip.id
          ? {
            ...item,
            ratingAverage: result.ratingAverage,
            ratingCount: result.ratingCount,
            ownRating: result.ownRating,
          }
          : item
      )));
      setPreviewTrip((current) => current?.id === trip.id
        ? {
          ...current,
          ratingAverage: result.ratingAverage,
          ratingCount: result.ratingCount,
          ownRating: result.ownRating,
        }
        : current);
    } catch (ratingError) {
      setError(ratingError instanceof Error ? ratingError.message : "Failed to rate trip.");
    } finally {
      setRatingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <Navbar />

      <PageShell>
        <HeroPanel
          eyebrow={<><Users className="h-3.5 w-3.5" />Community trips</>}
          title="Find travelers going your way."
          description="Browse public SkyNode itineraries, request to join, and coordinate with the group after you are accepted."
          actions={
            <form onSubmit={submitFilters} className="relative z-20 w-full min-w-0 sm:w-96 lg:w-[26rem]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <CitySearchPicker
                    label="Destination city"
                    value={destination}
                    onChange={setDestination}
                    placeholder="Search city only"
                    variant="dark"
                  />
                </div>
                <FilterDropdown
                  label="Budget"
                  value={budget}
                  options={budgetOptions}
                  onChange={setBudget}
                  variant="dark"
                />
                <FilterDropdown
                  label="Pace"
                  value={pace}
                  options={paceOptions}
                  onChange={setPace}
                  variant="dark"
                />
                <div className="sm:col-span-2">
                  <FilterDropdown
                    label="Order"
                    value={sort}
                    options={sortOptions}
                    onChange={(value) => setSort(value as TripSort)}
                    variant="dark"
                  />
                </div>
              </div>
              <Button type="submit" tone="ghost" className="mt-4 w-full rounded-full bg-white text-slate-900 hover:bg-slate-100">
                Search trips
              </Button>
            </form>
          }
        />

        {!authLoading && !user && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            <Link to="/auth" state={{ from: "/explore-trips" }} className="font-black text-blue-800 underline">Sign in</Link> to request joining a trip and chat with the group.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-3xl bg-white shadow-xl" />
            ))}
          </div>
        )}

        {!loading && visibleTrips.length === 0 && (
          <EmptyState
            title="No public trips yet."
            action={<ButtonLink to="/planner" size="lg">Create the first trip</ButtonLink>}
          >
            Save a trip as public in the planner and it will appear here for other travelers.
          </EmptyState>
        )}

        {!loading && visibleTrips.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTrips.map((trip) => {
              const membership = trip.access?.membershipStatus;
              const pending = membership === "pending";
              const accepted = membership === "accepted";

              return (
                <TripCommunityCard
                  key={trip.id}
                  trip={trip}
                  canRate={Boolean(user)}
                  ratingSaving={ratingId === trip.id}
                  onRate={(rating) => void submitRating(trip, rating)}
                  showOwner
                  footer={
                    accepted ? (
                      <ButtonLink to={`/trips/${trip.id}`} tone="secondary" size="lg" className="w-full">Open room</ButtonLink>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          tone="ghost"
                          size="lg"
                          className="w-full"
                          disabled={previewLoadingId === trip.id}
                          icon={previewLoadingId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                          onClick={() => void previewCommunityTrip(trip)}
                        >
                          Preview
                        </Button>
                        {pending ? (
                        <Button tone="ghost" size="lg" className="w-full" disabled>Pending</Button>
                        ) : (
                          <Button
                            type="button"
                            size="lg"
                            className="w-full"
                            disabled={joiningId === trip.id}
                            icon={joiningId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                            onClick={() => void joinTrip(trip)}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </PageShell>

      {previewTrip && (
        <CommunityTripPreviewModal
          joining={joiningId === previewTrip.id}
          onClose={() => setPreviewTrip(null)}
          onJoin={() => void joinTrip(previewTrip)}
          trip={previewTrip}
        />
      )}

      <Footer />
    </div>
  );
}

function CommunityTripPreviewModal({
  joining,
  onClose,
  onJoin,
  trip,
}: {
  joining: boolean;
  onClose: () => void;
  onJoin: () => void;
  trip: SavedTripDetail;
}) {
  const cityName = tripDisplayCity(trip);
  const imageUrl = useDestinationImage(cityName);
  const previewDays = trip.itinerary.days.slice(0, Math.min(2, Math.max(1, trip.itinerary.days.length)));
  const hiddenDays = Math.max(0, trip.itinerary.days.length - previewDays.length);
  const ratingAverage = trip.ratingAverage || 0;
  const ratingCount = trip.ratingCount || 0;
  const membership = trip.access?.membershipStatus;
  const accepted = membership === "accepted";
  const pending = membership === "pending";

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

        <div className="relative h-[34vh] max-h-72 min-h-52 shrink-0 bg-slate-200 sm:h-72">
          {imageUrl ? (
            <img src={imageUrl} alt={`${cityName} destination`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-blue-500 to-cyan-400" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 pr-16 text-white sm:p-7 sm:pr-20">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]">
              <MapPin className="h-3.5 w-3.5" />
              {cityName}
            </p>
            <h2 className="text-2xl font-black leading-tight sm:text-4xl">{trip.title}</h2>
            {trip.description && <p className="mt-3 line-clamp-3 max-w-3xl text-sm font-bold leading-relaxed text-slate-200 sm:line-clamp-2">{trip.description}</p>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-6 lg:p-7">
          <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <PreviewInfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Duration" value={`${trip.days} days`} />
              <PreviewInfoRow icon={<CircleDollarSign className="h-3.5 w-3.5" />} label="Budget" value={`$${trip.estimatedTotalCost.toLocaleString()}`} />
              <PreviewInfoRow icon={<Users className="h-3.5 w-3.5" />} label="Pace" value={trip.pace} />
              <PreviewInfoRow icon={<Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />} label="Rating" value={ratingCount ? `${ratingAverage.toFixed(1)} (${ratingCount})` : "No ratings"} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Trip style</p>
              <div className="flex flex-wrap gap-1.5">
                {[trip.budget, trip.pace, ...(trip.tags?.length ? trip.tags : trip.interests)].slice(0, 6).map((tag) => (
                  <span key={tag} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black capitalize text-blue-700">
                    {tag}
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
                            {item.location.name}{item.location.city ? `, ${item.location.city}` : ""}
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
                  Preview of {previewDays.length} of {trip.itinerary.days.length} days{hiddenDays > 0 ? ` - ${hiddenDays} more included` : ""} - request to join to unlock the full trip room
                </p>
              </article>
          </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:px-7">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold leading-6 text-slate-500">
              Request access to chat with the group and unlock the full shared trip room.
            </p>
            {accepted ? (
              <ButtonLink to={`/trips/${trip.id}`} tone="secondary" size="lg" className="w-full shrink-0 sm:w-auto">Open trip room</ButtonLink>
            ) : pending ? (
              <Button type="button" size="lg" disabled className="w-full shrink-0 sm:w-auto">Request pending</Button>
            ) : (
              <Button type="button" icon={joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} disabled={joining} onClick={onJoin} size="lg" className="w-full shrink-0 sm:w-auto">
                Request to join
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function PreviewInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="group relative min-h-16 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full bg-linear-to-br from-blue-400/12 to-cyan-300/12 blur-xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-blue-500 via-cyan-400 to-indigo-500 opacity-70" />
      <p className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="relative mt-1 break-words text-sm font-black capitalize text-slate-950">{value}</p>
    </div>
  );
}
