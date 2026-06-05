import {
  CalendarDays,
  Camera,
  ImageOff,
  Loader2,
  LockKeyhole,
  LogOut,
  Maximize2,
  MapPin,
  PencilLine,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import { authHeaders } from "../api/authHeaders.js";
import { readApiJson } from "../api/http.js";
import { listSavedTrips } from "../api/assistantApi";
import { listTravelMissionUnlocks, submitTravelMission } from "../api/travelMissionsApi.js";
import { syncTripProfile } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, Card, PageShell } from "../components/ui";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useDestinationImage } from "../utils/destinationImage.js";
import { missionCountries, type MissionCountry } from "../../shared/countries.js";
import type { SavedTripSummary, TravelMissionSubmitResponse, TravelMissionUnlock } from "../../shared/types.js";
import airplaneHero from "../../../assets/test4.lottie";
import countries110mUrl from "world-atlas/countries-110m.json?url";

const interestOptions = ["Culture", "Food", "Nature", "Beaches", "Nightlife", "Museums", "Hiking", "Photography", "Wellness", "Budget trips"];
const missionGestures = ["show an open hand", "show a peace sign", "give a thumbs up"];

type ProfileForm = {
  firstName: string;
  lastName: string;
  birthDate: string;
  homeCity: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
};

function userImage(user: User | null) {
  const metadata = user?.user_metadata || {};
  const direct = metadata.avatar_url || metadata.picture;
  const identityData = user?.identities?.find((identity) => identity.identity_data)?.identity_data || {};
  const identityImage = identityData.avatar_url || identityData.picture;

  return typeof direct === "string" && direct
    ? direct
    : typeof identityImage === "string" && identityImage
    ? identityImage
    : "";
}

function metadataString(user: User | null, key: string): string {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataInterests(user: User | null): string[] {
  const value = user?.user_metadata?.interests;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function displayNameFromForm(form: ProfileForm, fallback = "SkyNode traveler") {
  return [form.firstName, form.lastName].map((part) => part.trim()).filter(Boolean).join(" ") || fallback.trim() || "SkyNode traveler";
}

function profileFormFromUser(user: User | null): ProfileForm {
  return {
    firstName: metadataString(user, "first_name"),
    lastName: metadataString(user, "last_name"),
    birthDate: metadataString(user, "birth_date"),
    homeCity: metadataString(user, "home_city"),
    avatarUrl: metadataString(user, "avatar_url") || userImage(user),
    bio: metadataString(user, "bio"),
    interests: metadataInterests(user),
  };
}

function profileSnapshotFromForm(form: ProfileForm, fallbackName: string) {
  const fullName = displayNameFromForm(form, fallbackName);

  return {
    displayName: fullName,
    avatarUrl: form.avatarUrl.trim() || undefined,
    birthDate: form.birthDate || undefined,
    homeCity: form.homeCity.trim() || undefined,
    bio: form.bio.trim() || undefined,
    interests: form.interests,
  };
}

export function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdTrips, setCreatedTrips] = useState<SavedTripSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [missionUnlocks, setMissionUnlocks] = useState<TravelMissionUnlock[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [missionCountry, setMissionCountry] = useState<MissionCountry | null>(null);
  const [missionImage, setMissionImage] = useState("");
  const [missionSubmitting, setMissionSubmitting] = useState(false);
  const [missionResult, setMissionResult] = useState<TravelMissionSubmitResponse | null>(null);
  const [missionError, setMissionError] = useState("");
  const [form, setForm] = useState<ProfileForm>(() => profileFormFromUser(user));
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  useEffect(() => {
    setForm(profileFormFromUser(user));
  }, [user]);

  useEffect(() => {
    async function loadTrips() {
      if (loading) return;
      if (!user) {
        setCreatedTrips([]);
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      try {
        setCreatedTrips(await listSavedTrips());
      } catch {
        setCreatedTrips([]);
      } finally {
        setLoadingTrips(false);
      }
    }

    void loadTrips();
  }, [loading, user]);

  useEffect(() => {
    async function loadMissions() {
      if (loading) return;
      if (!user) {
        setMissionUnlocks([]);
        setLoadingMissions(false);
        return;
      }

      setLoadingMissions(true);
      try {
        const result = await listTravelMissionUnlocks();
        setMissionUnlocks(result.unlocks);
      } catch {
        setMissionUnlocks([]);
      } finally {
        setLoadingMissions(false);
      }
    }

    void loadMissions();
  }, [loading, user]);

  const metadataName = metadataString(user, "full_name") || metadataString(user, "name");
  const displayName = displayNameFromForm(form, metadataName || user?.email?.split("@")[0] || "SkyNode traveler");
  const avatarUrl = form.avatarUrl || userImage(user);
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown";
  const visibleTrips = createdTrips.slice(0, 4);
  const unlockedCodes = useMemo(() => new Set(missionUnlocks.map((unlock) => unlock.countryCode)), [missionUnlocks]);
  const nextLockedCountry = missionCountries.find((country) => !unlockedCodes.has(country.code)) || missionCountries[0];

  if (!loading && !user) {
    return <Navigate to="/auth" replace state={{ from: "/account" }} />;
  }

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleInterest(interest: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  function handlePhotoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("Choose an image under 1 MB. Large profile photos should be optimized first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const nextAvatarUrl = reader.result;
        setForm((current) => ({ ...current, avatarUrl: nextAvatarUrl }));
        setError("");
        void saveAvatarUrl(nextAvatarUrl);
      }
    };
    reader.onerror = () => setError("Could not read that image file.");
    reader.readAsDataURL(file);
  }

  async function saveAvatarUrl(nextAvatarUrl: string) {
    if (!supabase) {
      setError("Auth is disabled: missing Supabase environment variables.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          full_name: displayNameFromForm(form, ""),
          birth_date: form.birthDate,
          home_city: form.homeCity.trim(),
          avatar_url: nextAvatarUrl,
          bio: form.bio.trim(),
          interests: form.interests,
        },
      });

      if (updateError) throw updateError;
      await syncTripProfile(profileSnapshotFromForm({ ...form, avatarUrl: nextAvatarUrl }, user?.email?.split("@")[0] || "Traveler"));
      setSuccess(nextAvatarUrl ? "Profile photo updated." : "Profile photo removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile photo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError("Auth is disabled: missing Supabase environment variables.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const fullName = displayNameFromForm(form, "");
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          full_name: fullName,
          birth_date: form.birthDate,
          home_city: form.homeCity.trim(),
          avatar_url: form.avatarUrl.trim(),
          bio: form.bio.trim(),
          interests: form.interests,
        },
      });

      if (updateError) throw updateError;
      await syncTripProfile(profileSnapshotFromForm(form, user?.email?.split("@")[0] || "Traveler"));

      setEditing(false);
      setSuccess("Profile updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!supabase || !user?.email) {
      setError("Password reset is unavailable for this account.");
      return;
    }

    setResettingPassword(true);
    setError("");
    setSuccess("");

    try {
      const redirectTo = `${window.location.origin}/auth?callback=recovery`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
      if (resetError) throw resetError;
      setSuccess(`Password reset email sent to ${user.email}.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to send password reset email.");
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your SkyNode account and saved trips? This cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: await authHeaders(),
      });

      if (!response.ok) {
        const body = await readApiJson<{ warnings?: string[] }>(response, "Failed to delete account.");
        throw new Error(body.warnings?.[0] || "Failed to delete account.");
      }

      await signOut();
      navigate("/", { replace: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  }

  function openMission(country: MissionCountry) {
    setMissionCountry(country);
    setMissionImage("");
    setMissionResult(null);
    setMissionError("");
  }

  function handleMissionFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMissionError("Upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4_000_000) {
      setMissionError("Choose an image under 4 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMissionImage(reader.result);
        setMissionError("");
        setMissionResult(null);
      }
    };
    reader.onerror = () => setMissionError("Could not read that image.");
    reader.readAsDataURL(file);
  }

  async function handleSubmitMission() {
    if (!missionCountry || !missionImage) {
      setMissionError("Choose a mission and upload your travel proof photo.");
      return;
    }

    setMissionSubmitting(true);
    setMissionError("");

    try {
      const result = await submitTravelMission({
        countryCode: missionCountry.code,
        countryName: missionCountry.name,
        imageDataUrl: missionImage,
        requiredGesture: missionGestureFor(missionCountry),
      });
      setMissionResult(result);
      if (result.unlock) {
        setMissionUnlocks((current) => [
          result.unlock!,
          ...current.filter((unlock) => unlock.countryCode !== result.unlock!.countryCode),
        ]);
      }
    } catch (missionSubmitError) {
      setMissionError(missionSubmitError instanceof Error ? missionSubmitError.message : "Failed to validate travel proof.");
    } finally {
      setMissionSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell containerClassName="max-w-6xl">
        <section className="mb-6 overflow-visible rounded-3xl border border-slate-100 bg-white shadow-card">
          <div className="relative h-48 overflow-hidden rounded-t-3xl bg-[#eefbff] sm:h-56 md:h-60">
            <DotLottieReact
              src={airplaneHero}
              loop
              autoplay
              layout={{ fit: "cover", align: [0.08, 0.42] }}
              className="pointer-events-none absolute inset-0 h-full w-full scale-[1.00]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-white via-white/5 to-transparent" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5 px-6 pb-6">
            <div className="-mt-16 flex min-w-0 flex-1 flex-wrap items-end gap-4">
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    handlePhotoFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPhotoMenuOpen((open) => !open)}
                  className="group relative block rounded-3xl focus:outline-none focus:ring-4 focus:ring-sky-100"
                  aria-label="Change profile picture"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-28 w-28 rounded-3xl border-4 border-white bg-white object-contain shadow-md transition group-hover:brightness-95"
                    />
                  ) : (
                    <div className="grid h-28 w-28 place-items-center rounded-3xl border-4 border-white bg-slate-900 text-white shadow-md transition group-hover:bg-slate-800">
                      <UserRound className="h-9 w-9" />
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>
                {photoMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-44 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-2xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setPhotoMenuOpen(false);
                      }}
                    >
                      <Camera className="h-4 w-4" />
                      Change photo
                    </button>
                    <button
                      type="button"
                      disabled={!avatarUrl}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        updateField("avatarUrl", "");
                        void saveAvatarUrl("");
                        setPhotoMenuOpen(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-xs font-black uppercase tracking-widest text-sky-700">My account</p>
                <h1 className="mt-1 break-words text-3xl font-black leading-tight text-slate-950 md:text-4xl">{displayName}</h1>
                <p className="mt-1 break-all text-sm font-semibold text-slate-500">{user?.email}</p>
                <p className="mt-2 text-xs font-bold text-slate-400">Member since {createdAt}</p>
              </div>
            </div>
            <Button type="button" tone="ghost" onClick={() => void signOut()} icon={<LogOut className="h-4 w-4" />}>
              Sign out
            </Button>
          </div>
        </section>

        {error && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>}
        {success && <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{success}</div>}

        <section className="space-y-6">
          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_340px]">
            <Card as="form" className="p-6" onSubmit={handleSaveProfile}>
              <div className="relative flex flex-wrap items-start justify-between gap-4 pr-12">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Personal details</h2>
                </div>
                <button
                  type="button"
                  className="absolute right-0 top-0 grid h-12 w-12 place-items-center rounded-full border border-sky-100 bg-sky-50 text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  aria-label={editing ? "Cancel editing" : "Edit personal details"}
                  title={editing ? "Cancel editing" : "Edit personal details"}
                  onClick={() => {
                    setEditing((value) => !value);
                    setError("");
                    setSuccess("");
                    if (editing) setForm(profileFormFromUser(user));
                  }}
                >
                  {editing ? <X className="h-5 w-5" /> : <PencilLine className="h-5 w-5" />}
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProfileInput label="First name" value={form.firstName} disabled={!editing} onChange={(value) => updateField("firstName", value)} />
                <ProfileInput label="Last name" value={form.lastName} disabled={!editing} onChange={(value) => updateField("lastName", value)} />
                <ProfileInput label="Date of birth" type="date" value={form.birthDate} disabled={!editing} onChange={(value) => updateField("birthDate", value)} />
                <ProfileInput label="Home city" value={form.homeCity} disabled={!editing} placeholder="Ljubljana, Vienna, Berlin..." onChange={(value) => updateField("homeCity", value)} />

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-bold text-slate-600">Short bio</span>
                  <textarea
                    value={form.bio}
                    disabled={!editing}
                    onChange={(event) => updateField("bio", event.target.value)}
                    rows={4}
                    maxLength={220}
                    placeholder="Write a short introduction about yourself."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-500 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  />
                </label>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-black text-slate-900">Travel interests</p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => {
                    const selected = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        disabled={!editing}
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full px-3 py-2 text-xs font-black transition disabled:cursor-default ${
                          selected
                            ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editing && (
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={saving} icon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                    {saving ? "Saving..." : "Save profile"}
                  </Button>
                </div>
              )}
            </Card>

            <aside className="grid h-full gap-6">
              <Card as="section" className="flex flex-col p-6">
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">Security</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Password access</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Send a password reset link to your email if you forgot your password or want to change it.
                </p>
                <Button
                  type="button"
                  tone="ghost"
                  size="lg"
                  className="mt-auto w-full rounded-2xl"
                  disabled={resettingPassword || !isSupabaseConfigured}
                  onClick={handlePasswordReset}
                  icon={resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                >
                  {resettingPassword ? "Sending..." : "Send reset email"}
                </Button>
              </Card>

              <Card as="section" className="flex flex-col p-6">
                <p className="text-xs font-black uppercase tracking-widest text-red-500">Danger zone</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Delete your account and saved trip data from SkyNode.
                </p>
                <Button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  tone="danger"
                  size="lg"
                  className="mt-auto w-full rounded-2xl"
                  icon={deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                >
                  {deleting ? "Deleting..." : "Delete account"}
                </Button>
              </Card>
            </aside>
          </div>

          <TravelMissionsCard
            loading={loadingMissions}
            nextCountry={nextLockedCountry}
            onOpenMission={openMission}
            unlockedCodes={unlockedCodes}
            unlocks={missionUnlocks}
          />

          <Card as="section" className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">My trips</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Trips you created</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">A cleaner view of your saved itineraries and trip rooms.</p>
              </div>
              <ButtonLink to="/trip-library" tone="ghost">Open all trips</ButtonLink>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {loadingTrips && [1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}
              {!loadingTrips && visibleTrips.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500 sm:col-span-2 lg:col-span-4">
                  No created trips yet. Build a trip in the planner and save it to your account.
                </div>
              )}
              {!loadingTrips && visibleTrips.map((trip) => <AccountTripCard key={trip.id} trip={trip} />)}
            </div>
          </Card>
        </section>
      </PageShell>

      {missionCountry && (
        <TravelMissionModal
          country={missionCountry}
          imageDataUrl={missionImage}
          error={missionError}
          gesture={missionGestureFor(missionCountry)}
          onClose={() => setMissionCountry(null)}
          onFile={handleMissionFile}
          onSubmit={() => void handleSubmitMission()}
          result={missionResult}
          submitting={missionSubmitting}
        />
      )}

      <Footer />
    </div>
  );
}

function AccountTripCard({ trip }: { trip: SavedTripSummary }) {
  const imageUrl = useDestinationImage(trip.destinationName);

  return (
    <Link to={`/trips/${trip.id}`} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-950 no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center bg-linear-to-br from-sky-50 to-slate-100 text-slate-400">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black capitalize text-slate-800 shadow-sm">
          {trip.visibility || "private"}
        </span>
      </div>
      <div className="p-4">
        <p className="line-clamp-1 text-base font-black text-slate-950">{trip.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {trip.destinationName}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-slate-600">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {trip.days} days
          </span>
          <span className="rounded-full bg-sky-50 px-2.5 py-1 capitalize text-sky-800">{trip.pace}</span>
        </div>
      </div>
    </Link>
  );
}

function TravelMissionsCard({
  loading,
  nextCountry,
  onOpenMission,
  unlockedCodes,
  unlocks,
}: {
  loading: boolean;
  nextCountry: MissionCountry;
  onOpenMission: (country: MissionCountry) => void;
  unlockedCodes: Set<string>;
  unlocks: TravelMissionUnlock[];
}) {
  const progress = Math.round((unlockedCodes.size / missionCountries.length) * 100);
  const [countrySearch, setCountrySearch] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const filteredCountries = useMemo(() => {
    const term = countrySearch.trim().toLowerCase();
    if (!term) return missionCountries;
    return missionCountries.filter((country) =>
      country.name.toLowerCase().includes(term) || country.code.toLowerCase().includes(term),
    );
  }, [countrySearch]);

  return (
    <Card as="section" className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600">
                <Trophy className="h-4 w-4" />
                Travel Proof Missions
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Unlock the world with verified travel proof</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Upload a photo with the requested gesture and a recognizable landmark. AI checks face, gesture, and location evidence before unlocking a country.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-sm">
              <p className="text-2xl font-black leading-none">{unlockedCodes.size}/{missionCountries.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/60">Unlocked</p>
            </div>
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-500 to-teal-400 transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={countrySearch}
              onChange={(event) => setCountrySearch(event.target.value)}
              placeholder="Search all 195 countries..."
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
              {filteredCountries.length}
            </span>
          </div>

          <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {loading && [1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-100" />)}
              {!loading && filteredCountries.map((country) => {
                const unlocked = unlockedCodes.has(country.code);
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => onOpenMission(country)}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition ${
                      unlocked
                        ? "bg-cyan-50 text-cyan-950 ring-1 ring-cyan-100"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-sky-200 hover:shadow-sm"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{country.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{unlocked ? "Verified" : missionGestureFor(country)}</span>
                    </span>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${unlocked ? "bg-cyan-400 text-slate-950" : "bg-slate-100 text-slate-500"}`}>
                      {unlocked ? <ShieldCheck className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
            {!loading && filteredCountries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                No country matches that search.
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-96 overflow-hidden bg-linear-to-br from-sky-50 via-white to-cyan-50 p-6 text-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(45,212,191,0.16),transparent_32%),radial-gradient(circle_at_18%_78%,rgba(56,189,248,0.14),transparent_34%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">World progress map</p>
                <button
                  type="button"
                  onClick={() => setMapExpanded(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-sky-700 hover:ring-sky-200"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expand
                </button>
              </div>
              <WorldMissionMap unlockedCodes={unlockedCodes} onOpenMission={onOpenMission} compact />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Next mission</p>
              <h3 className="mt-2 text-2xl font-black">{nextCountry.name}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Take a photo near a tourist attraction and {missionGestureFor(nextCountry)}.</p>
              <Button type="button" size="lg" className="mt-5 w-full rounded-2xl" icon={<Sparkles className="h-4 w-4" />} onClick={() => onOpenMission(nextCountry)}>
                Start mission
              </Button>
            </div>
          </div>
        </div>
      </div>

      {unlocks.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Latest unlock</p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {unlocks[0].countryName} verified with {Math.round(unlocks[0].confidence * 100)}% AI confidence.
          </p>
        </div>
      )}
      {mapExpanded && (
        <TravelMissionMapModal
          onClose={() => setMapExpanded(false)}
          onOpenMission={(country) => {
            setMapExpanded(false);
            onOpenMission(country);
          }}
          unlockedCodes={unlockedCodes}
        />
      )}
    </Card>
  );
}

function TravelMissionModal({
  country,
  error,
  gesture,
  imageDataUrl,
  onClose,
  onFile,
  onSubmit,
  result,
  submitting,
}: {
  country: MissionCountry;
  error: string;
  gesture: string;
  imageDataUrl: string;
  onClose: () => void;
  onFile: (file: File | undefined) => void;
  onSubmit: () => void;
  result: TravelMissionSubmitResponse | null;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close travel mission" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-600">Verify {country.name}</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Travel proof mission</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-[1fr_220px]">
          <div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">Required photo</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <li>Visible face in the photo</li>
                <li>Recognizable landmark or tourist attraction in {country.name}</li>
                <li>Hand gesture: {gesture}</li>
              </ul>
            </div>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/60 px-5 py-8 text-center transition hover:bg-sky-50">
              <Upload className="h-8 w-8 text-sky-600" />
              <span className="mt-3 text-sm font-black text-slate-950">Upload travel proof photo</span>
              <span className="mt-1 text-xs font-semibold text-slate-500">JPG, PNG, or WebP under 4 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
            </label>

            {error && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</div>}
            {result && (
              <div className={`mt-4 rounded-2xl border p-4 text-sm font-bold ${
                result.validation.accepted ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-800"
              }`}>
                <p>{result.validation.summary}</p>
                {!result.validation.accepted && result.validation.issues.length > 0 && <p className="mt-2">{result.validation.issues[0]}</p>}
              </div>
            )}
          </div>

          <div>
            <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-slate-100">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center p-5 text-center text-sm font-bold text-slate-400">
                  Preview appears here
                </div>
              )}
            </div>
            <Button
              type="button"
              disabled={!imageDataUrl || submitting}
              className="mt-4 w-full rounded-2xl"
              icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              onClick={onSubmit}
            >
              {submitting ? "Validating..." : "Validate mission"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorldMissionMap({
  compact = false,
  onOpenMission,
  unlockedCodes,
}: {
  compact?: boolean;
  onOpenMission: (country: MissionCountry) => void;
  unlockedCodes: Set<string>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [features, setFeatures] = useState<Array<Feature<Geometry, { name?: string }>>>([]);
  const [mapError, setMapError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const featureCountries = useMemo(() => features.map((item) => ({
    feature: item,
    country: countryFromMapName(item.properties?.name || ""),
  })).filter((item) => item.feature.properties?.name !== "Antarctica"), [features]);
  const projection = useMemo(() => {
    const collection: FeatureCollection<Geometry, { name?: string }> = {
      type: "FeatureCollection",
      features: featureCountries.map((item) => item.feature),
    };
    return geoEqualEarth().fitSize([900, 480], collection);
  }, [featureCountries]);
  const path = useMemo(() => geoPath(projection), [projection]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorld() {
      try {
        const response = await fetch(countries110mUrl);
        if (!response.ok) throw new Error("Could not load world map.");
        const topology = await response.json() as { objects?: { countries?: unknown } };
        if (!topology.objects?.countries) throw new Error("World map data is incomplete.");
        const collection = feature(
          topology as never,
          topology.objects.countries as never,
        ) as unknown as FeatureCollection<Geometry, { name?: string }>;
        if (!cancelled) {
          setFeatures(collection.features);
          setMapError("");
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Could not load world map.");
        }
      }
    }

    void loadWorld();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (compact || !svgRef.current || !mapGroupRef.current) return;

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [900, 500]])
      .extent([[0, 0], [900, 500]])
      .on("zoom", (event: { transform: ZoomTransform }) => {
        if (mapGroupRef.current) {
          select(mapGroupRef.current).attr("transform", event.transform.toString());
        }
        setZoomLevel(Number(event.transform.k.toFixed(1)));
      });

    zoomBehaviorRef.current = behavior;
    select(svgRef.current).call(behavior);

    return () => {
      select(svgRef.current).on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [compact, features.length]);

  function applyZoom(action: "in" | "out" | "reset") {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const selection = select(svgRef.current);
    if (action === "reset") {
      selection.transition().duration(220).call(zoomBehaviorRef.current.transform, zoomIdentity);
      return;
    }
    selection.transition().duration(180).call(action === "in" ? zoomBehaviorRef.current.scaleBy : zoomBehaviorRef.current.scaleBy, action === "in" ? 1.45 : 0.7);
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-sky-100 bg-white/80 shadow-[0_24px_80px_rgba(14,165,233,0.12)] backdrop-blur ${compact ? "mb-6 aspect-[1.55] min-h-64" : "aspect-[1.8] min-h-[30rem]"}`}>
      <svg ref={svgRef} viewBox="0 0 900 500" className={`absolute inset-0 h-full w-full ${compact ? "" : "cursor-grab active:cursor-grabbing"}`} role="img" aria-label="Travel mission world map">
        <rect width="900" height="500" rx="28" fill="rgba(240,249,255,0.85)" />
        <path d="M0 390 C160 348 302 432 456 388 C594 349 722 358 900 314 L900 500 L0 500 Z" fill="rgba(207,250,254,0.38)" />
        <g ref={mapGroupRef}>
          {featureCountries.map(({ country, feature: mapFeature }) => {
            const d = path(mapFeature);
            if (!d) return null;
            const unlocked = country ? unlockedCodes.has(country.code) : false;
            return (
              <path
                key={`${mapFeature.id || mapFeature.properties?.name}`}
                d={d}
                role={country ? "button" : undefined}
                tabIndex={country ? 0 : -1}
                onClick={() => country && onOpenMission(country)}
                onKeyDown={(event) => {
                  if (country && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onOpenMission(country);
                  }
                }}
                className={`transition duration-200 ${
                  country
                    ? "cursor-pointer hover:brightness-95 focus:outline-none"
                    : "pointer-events-none"
                }`}
                fill={unlocked ? "url(#missionUnlockedGradient)" : country ? "#cbd5e1" : "#e2e8f0"}
                stroke={unlocked ? "#ecfeff" : "#f8fafc"}
                strokeWidth={compact ? 0.8 : 0.9}
              >
                <title>{country ? `${country.name} - ${unlocked ? "unlocked" : "locked"}` : mapFeature.properties?.name}</title>
              </path>
            );
          })}
        </g>
        <defs>
          <linearGradient id="missionUnlockedGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="52%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>

      {features.length === 0 && !mapError && (
        <div className="absolute inset-0 grid place-items-center text-sm font-black text-slate-400">
          Loading map...
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-black text-red-500">
          {mapError}
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-cyan-400" />
        Unlocked
        <span className="ml-2 h-2 w-2 rounded-full bg-slate-300" />
        Locked
      </div>
      <div className="absolute right-3 top-3 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-sm backdrop-blur">
        {unlockedCodes.size}/{missionCountries.length}
      </div>
      {!compact && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-white/80 bg-white/90 p-1 shadow-sm backdrop-blur">
          <button type="button" onClick={() => applyZoom("out")} className="grid h-8 w-8 place-items-center rounded-full text-sm font-black text-slate-600 hover:bg-slate-100" aria-label="Zoom out">-</button>
          <button type="button" onClick={() => applyZoom("reset")} className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100" aria-label="Reset map zoom">{zoomLevel}x</button>
          <button type="button" onClick={() => applyZoom("in")} className="grid h-8 w-8 place-items-center rounded-full text-sm font-black text-slate-600 hover:bg-slate-100" aria-label="Zoom in">+</button>
        </div>
      )}
    </div>
  );
}

function TravelMissionMapModal({
  onClose,
  onOpenMission,
  unlockedCodes,
}: {
  onClose: () => void;
  onOpenMission: (country: MissionCountry) => void;
  unlockedCodes: Set<string>;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close world map" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-600">World mission map</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Locked and unlocked countries</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Click a country to start its travel proof mission.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">
          <WorldMissionMap unlockedCodes={unlockedCodes} onOpenMission={onOpenMission} />
        </div>
      </div>
    </div>
  );
}

function countryFromMapName(name: string): MissionCountry | undefined {
  const normalized = normalizeCountryName(name);
  const alias = mapNameAliases[normalized];
  return missionCountries.find((country) => normalizeCountryName(country.name) === (alias || normalized));
}

function normalizeCountryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

const mapNameAliases: Record<string, string> = {
  "bosnia and herz": "bosnia and herzegovina",
  "central african rep": "central african republic",
  "cote d ivoire": "cote d ivoire",
  "dem rep congo": "democratic republic of the congo",
  "dominican rep": "dominican republic",
  "eq guinea": "equatorial guinea",
  "eswatini": "eswatini",
  "macedonia": "north macedonia",
  "n korea": "north korea",
  "s korea": "south korea",
  "s sudan": "south sudan",
  "solomon is": "solomon islands",
  "turkey": "turkiye",
  "united states of america": "united states",
};

function missionGestureFor(country: MissionCountry): string {
  return missionGestures[country.code.charCodeAt(0) % missionGestures.length];
}

function ProfileInput({
  className,
  disabled,
  icon,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 has-disabled:bg-slate-50">
        {icon && <span className="text-slate-400">{icon}</span>}
        <input
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-500"
        />
      </span>
    </label>
  );
}
