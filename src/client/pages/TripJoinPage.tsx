import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { loadTripInvite, profileFromUser, requestJoinTrip } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, EmptyState, HeroPanel, PageShell } from "../components/ui";
import { TripCommunityCard } from "../features/trip-community/TripCommunityCard";
import { TripVisibilityBadge } from "../features/trip-community/TripVisibilityBadge";
import type { SavedTripDetail } from "../../shared/types.js";

export function TripJoinPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<SavedTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const loaded = await loadTripInvite(token);
        if (!cancelled) {
          setTrip(loaded);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Invite link is invalid.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (token) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function joinNow() {
    if (!trip) {
      return;
    }

    if (!user) {
      navigate("/auth", { state: { from: `/trips/join/${token}` } });
      return;
    }

    setJoining(true);
    setError("");

    try {
      await requestJoinTrip(trip.id, profileFromUser(user));
      navigate(`/trips/${trip.id}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to request join.");
    } finally {
      setJoining(false);
    }
  }

  const membership = trip?.access?.membershipStatus;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell>
        {loading && <div className="h-80 animate-pulse rounded-3xl bg-white shadow-xl" />}

        {!loading && error && !trip && (
          <EmptyState title="Invite not found." action={<ButtonLink to="/explore-trips">Browse community trips</ButtonLink>}>
            {error}
          </EmptyState>
        )}

        {!loading && trip && (
          <>
            <HeroPanel
              eyebrow="Trip invitation"
              title={trip.title}
              description={`You were invited to join this ${trip.visibility === "public" ? "public" : "invite-only"} trip to ${trip.destinationName}.`}
              actions={
                <>
                  {trip.visibility && <TripVisibilityBadge visibility={trip.visibility} className="bg-white/10 text-white ring-white/20" />}
                  {membership === "accepted" ? (
                    <ButtonLink to={`/trips/${trip.id}`} tone="ghost" className="bg-white text-slate-900">Open trip room</ButtonLink>
                  ) : membership === "pending" ? (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">Request pending</span>
                  ) : (
                    <Button
                      type="button"
                      disabled={joining || authLoading}
                      icon={joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                      onClick={() => void joinNow()}
                    >
                      Request to join
                    </Button>
                  )}
                </>
              }
            />

            {error && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            {!user && !authLoading && (
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                <Link to="/auth" state={{ from: `/trips/join/${token}` }} className="font-black text-blue-800 underline">Sign in</Link> to request joining this trip.
              </div>
            )}

            <div className="max-w-2xl">
              <TripCommunityCard trip={trip} showOwner actionTo={membership === "accepted" ? `/trips/${trip.id}` : undefined} actionLabel="Open trip room" />
            </div>
          </>
        )}
      </PageShell>

      <Footer />
    </div>
  );
}
