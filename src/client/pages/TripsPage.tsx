import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { listSavedTrips } from "../api/assistantApi";
import { listJoinedTrips } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { ButtonLink, EmptyState, HeroPanel, PageShell } from "../components/ui";
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
      if (authLoading) {
        return;
      }

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
        <HeroPanel
          eyebrow="Trip library"
          title={tab === "created" ? "Trips you created." : "Trips you joined."}
          description={
            tab === "created"
              ? "Manage visibility, invite links, join requests, and group chat for your saved itineraries."
              : "Trips where your join request was accepted."
          }
          actions={
            <>
              <ButtonLink to="/explore-trips" tone="light" size="lg">Community</ButtonLink>
              <ButtonLink to="/planner" tone="ghost" size="lg" icon={<Plus className="h-4 w-4" />} className="bg-white text-slate-900">New trip</ButtonLink>
            </>
          }
        >
          <div className="mt-7 inline-flex rounded-full border border-white/10 bg-slate-950/40 p-1">
            {([
              { id: "created" as const, label: "Created" },
              { id: "joined" as const, label: "Joined" },
            ]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${tab === item.id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </HeroPanel>

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
