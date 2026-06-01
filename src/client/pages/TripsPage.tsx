import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { listSavedTrips } from "../api/assistantApi";
import { listJoinedTrips } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { ButtonLink, EmptyState, PageShell } from "../components/ui";
import { TripCommunityCard } from "../features/trip-community/TripCommunityCard";
import type { SavedTripSummary } from "../../shared/types.js";

type TripsTab = "created" | "joined";

export function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TripsTab>("created");
  const [createdTrips, setCreatedTrips] = useState<SavedTripSummary[]>([]);
  const [joinedTrips, setJoinedTrips] = useState<SavedTripSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrips() {
      if (authLoading) return;

      if (!user) {
        setCreatedTrips([]);
        setJoinedTrips([]);
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      setError("");

      try {
        const [created, joined] = await Promise.all([listSavedTrips(), listJoinedTrips()]);
        setCreatedTrips(created);
        setJoinedTrips(joined);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
      } finally {
        setLoadingTrips(false);
      }
    }

    void loadTrips();
  }, [authLoading, user]);

  const trips = tab === "created" ? createdTrips : joinedTrips;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell>
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-blue-600">Trip library</p>
              <h1 className="text-3xl font-black leading-tight text-slate-950">
                {tab === "created" ? "Trips you created" : "Trips you joined"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                {tab === "created"
                  ? "Manage visibility, invite links, join requests, and group chat for your saved itineraries."
                  : "Trips where your join request was accepted."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ButtonLink to="/explore-trips" tone="ghost" size="md">Community</ButtonLink>
              <ButtonLink to="/planner" tone="primary" size="md" icon={<Plus className="h-4 w-4" />}>New trip</ButtonLink>
            </div>
          </div>

          <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
            {([
              { id: "created" as const, label: "Created" },
              { id: "joined" as const, label: "Joined" },
            ]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  tab === item.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {!authLoading && !user && (
          <EmptyState
            title="Sign in to see your trips."
            action={<ButtonLink to="/auth" state={{ from: "/trips" }} tone="secondary" size="lg">Sign in or register</ButtonLink>}
          >
            You can still create a trip first and sign in when you save it.
          </EmptyState>
        )}

        {(loadingTrips || authLoading) && user && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-56 animate-pulse rounded-3xl bg-white shadow-xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {!loadingTrips && user && trips.length === 0 && (
          <EmptyState
            title={tab === "created" ? "No saved trips yet." : "No joined trips yet."}
            action={
              tab === "created"
                ? <ButtonLink to="/planner" size="lg">Open trips planner</ButtonLink>
                : <ButtonLink to="/explore-trips" size="lg">Explore community trips</ButtonLink>
            }
          >
            {tab === "created"
              ? "Generate an itinerary or create your own plan, then save it here."
              : "Browse public trips and request to join one that matches your travel style."}
          </EmptyState>
        )}

        {!loadingTrips && user && trips.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => (
              <TripCommunityCard
                key={trip.id}
                trip={trip}
                actionTo={`/trips/${trip.id}`}
                actionLabel={tab === "created" ? "Open trip" : "Open trip room"}
                showOwner={tab === "joined"}
              />
            ))}
          </div>
        )}
      </PageShell>

      <Footer />
    </div>
  );
}
