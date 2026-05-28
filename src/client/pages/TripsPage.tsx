import { useEffect, useState } from "react";
import { CalendarDays, CircleDollarSign, MapPin, Plus, Tags } from "lucide-react";
import { listSavedTrips } from "../api/assistantApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { ButtonLink, Card, EmptyState, HeroPanel, PageShell } from "../components/ui";
import type { SavedTripSummary } from "../../shared/types.js";

export function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<SavedTripSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrips() {
      if (authLoading) {
        return;
      }

      if (!user) {
        setTrips([]);
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      setError("");

      try {
        setTrips(await listSavedTrips());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
      } finally {
        setLoadingTrips(false);
      }
    }

    void loadTrips();
  }, [authLoading, user]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell>
          <HeroPanel
            eyebrow="All trips"
            title="Your saved SkyNode trips."
            description="Review generated and custom itineraries saved to your account."
            actions={<ButtonLink to="/planner" tone="ghost" size="lg" icon={<Plus className="h-4 w-4" />}>New trip</ButtonLink>}
          />

          {!authLoading && !user && (
            <EmptyState
              title="Sign in to see saved trips."
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
            <EmptyState title="No saved trips yet." action={<ButtonLink to="/planner" size="lg">Open trips planner</ButtonLink>}>
              Generate an itinerary or create your own plan, then save it here.
            </EmptyState>
          )}

          {!loadingTrips && user && trips.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trips.map((trip) => (
                <Card as="article" key={trip.id}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-blue-500">{trip.destinationCode}</p>
                      <h2 className="mt-1 text-xl font-black text-slate-950">{trip.title}</h2>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                      {trip.days} days
                    </span>
                  </div>

                  <div className="space-y-2 text-sm font-bold text-slate-500">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {trip.originCode ? `${trip.originCode} to ` : ""}{trip.destinationName}
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      {trip.startDate}
                    </p>
                    <p className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-blue-500" />
                      ${trip.estimatedTotalCost.toLocaleString()} activity estimate
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[trip.budget, trip.pace, ...trip.interests].slice(0, 7).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">
                        <Tags className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ButtonLink to="/assistant" tone="secondary" size="lg" className="mt-5 w-full">Open in assistant</ButtonLink>
                </Card>
              ))}
            </div>
          )}
      </PageShell>

      <Footer />
    </div>
  );
}
