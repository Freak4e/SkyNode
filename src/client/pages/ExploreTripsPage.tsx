import { FormEvent, useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { listPublicTrips, profileFromUser, requestJoinTrip } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { CitySearchPicker } from "../components/CitySearchPicker";
import { FilterDropdown } from "../components/FilterDropdown";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, EmptyState, HeroPanel, PageShell } from "../components/ui";
import { TripCommunityCard } from "../features/trip-community/TripCommunityCard";
import type { SavedTripSummary } from "../../shared/types.js";

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
                  showOwner
                  footer={
                    accepted ? (
                      <ButtonLink to={`/trips/${trip.id}`} tone="secondary" size="lg" className="w-full">Open trip room</ButtonLink>
                    ) : pending ? (
                      <Button tone="ghost" size="lg" className="w-full" disabled>Request pending</Button>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        disabled={joiningId === trip.id}
                        icon={joiningId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        onClick={() => void joinTrip(trip)}
                      >
                        Request to join
                      </Button>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </PageShell>

      <Footer />
    </div>
  );
}
