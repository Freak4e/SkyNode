import { FormEvent, useEffect, useState } from "react";
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
  const [query, setQuery] = useState({ destination: "", budget: "", pace: "" });

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
      setPreviewTrip(await loadPublicTripPreview(trip.id));
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

        {!loading && trips.length === 0 && (
          <EmptyState
            title="No public trips yet."
            action={<ButtonLink to="/planner" size="lg">Create the first trip</ButtonLink>}
          >
            Save a trip as public in the planner and it will appear here for other travelers.
          </EmptyState>
        )}

        {!loading && trips.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => {
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Close trip preview" onClick={onClose} />
      <section className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-56 shrink-0 bg-slate-200 sm:h-72">
          {imageUrl ? (
            <img src={imageUrl} alt={`${cityName} destination`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-blue-500 to-cyan-400" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]">
              <MapPin className="h-3.5 w-3.5" />
              {cityName}
            </p>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">{trip.title}</h2>
            {trip.description && <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-slate-200">{trip.description}</p>}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 p-5 sm:p-7 md:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-3 overflow-visible">
            <PreviewInfoRow icon={<CalendarDays className="h-4 w-4" />} label="Duration" value={`${trip.days} days`} />
            <PreviewInfoRow icon={<CircleDollarSign className="h-4 w-4" />} label="Budget" value={`$${trip.estimatedTotalCost.toLocaleString()}`} />
            <PreviewInfoRow icon={<Users className="h-4 w-4" />} label="Pace" value={trip.pace} />
            <PreviewInfoRow icon={<Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />} label="Rating" value={`${ratingAverage.toFixed(1)} (${ratingCount})`} />
            <div className="flex flex-wrap gap-2 pt-2">
              {[trip.budget, trip.pace, ...(trip.tags?.length ? trip.tags : trip.interests)].slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black capitalize text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </aside>

          <div className="relative min-h-0 overflow-hidden">
            <div className="h-full space-y-3 overflow-y-auto pb-36 pr-1">
              {previewDays.map((day) => (
                <article key={day.dayNumber} className="px-1 py-2">
                  <div className="flex items-center gap-3">
                    <p className="shrink-0 text-xs font-black uppercase tracking-widest text-blue-500">Day {day.dayNumber}</p>
                    <span className="h-px flex-1 bg-linear-to-r from-blue-300/80 to-transparent" />
                  </div>
                  <h3 className="mt-1 font-black text-slate-950">{day.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{day.summary}</p>
                  <ul className="mt-3 space-y-2">
                    {day.items.slice(0, 2).map((item) => (
                      <li key={`${day.dayNumber}-${item.title}`} className="rounded-xl bg-white p-3 text-sm text-slate-600 ring-1 ring-slate-100">
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
              <article className="relative overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 text-center">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/90 to-transparent" />
                <p className="relative mx-auto flex max-w-md items-center justify-center gap-2 text-sm font-black leading-6 text-blue-700">
                  <Lock className="h-4 w-4" />
                  Preview of {previewDays.length} of {trip.itinerary.days.length} days{hiddenDays > 0 ? ` - ${hiddenDays} more included` : ""} - request to join to unlock the full trip room
                </p>
              </article>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-white via-white/95 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-4">
              {accepted ? (
                <ButtonLink to={`/trips/${trip.id}`} tone="secondary" size="lg">Open trip room</ButtonLink>
              ) : pending ? (
                <Button type="button" size="lg" disabled>Request pending</Button>
              ) : (
                <Button type="button" icon={joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} disabled={joining} onClick={onJoin} size="lg">
                  Request to join
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PreviewInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="group relative min-h-24 overflow-hidden rounded-3xl border border-white/80 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-linear-to-br from-blue-400/20 to-cyan-300/20 blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-cyan-400 to-indigo-500 opacity-70" />
      <p className="relative flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">{icon}{label}</p>
      <p className="relative mt-2 text-lg font-black capitalize text-slate-950">{value}</p>
    </div>
  );
}
