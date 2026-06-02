import {
  CalendarDays,
  Camera,
  Edit3,
  ImageOff,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { authHeaders } from "../api/authHeaders.js";
import { listSavedTrips } from "../api/assistantApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, Card, PageShell } from "../components/ui";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useDestinationImage } from "../utils/destinationImage.js";
import type { SavedTripSummary } from "../../shared/types.js";

const interestOptions = ["Culture", "Food", "Nature", "Beaches", "Nightlife", "Museums", "Hiking", "Photography", "Wellness", "Budget trips"];

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
  return [form.firstName, form.lastName].filter(Boolean).join(" ") || fallback;
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
  const [form, setForm] = useState<ProfileForm>(() => profileFormFromUser(user));

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

  if (!loading && !user) {
    return <Navigate to="/auth" replace state={{ from: "/account" }} />;
  }

  const metadataName = metadataString(user, "full_name");
  const displayName = displayNameFromForm(form, metadataName || user?.email?.split("@")[0] || "SkyNode traveler");
  const avatarUrl = form.avatarUrl || userImage(user);
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown";
  const visibleTrips = createdTrips.slice(0, 4);

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
    if (file.size > 450_000) {
      setError("Choose an image under 450 KB. Large profile photos should be optimized first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((current) => ({ ...current, avatarUrl: reader.result as string }));
        setError("");
      }
    };
    reader.onerror = () => setError("Could not read that image file.");
    reader.readAsDataURL(file);
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
        const body = await response.json() as { warnings?: string[] };
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell containerClassName="max-w-6xl">
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
          <div className="relative h-36 overflow-hidden bg-slate-50 sm:h-40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_78%_18%,rgba(45,212,191,0.18),transparent_28%),linear-gradient(135deg,#f8fafc,#e0f2fe_56%,#f8fafc)]" />
            <div className="absolute left-10 top-8 h-16 w-48 rounded-full bg-white/45 blur-2xl" />
            <div className="absolute right-14 top-10 h-20 w-64 rounded-full bg-cyan-100/40 blur-2xl" />
            <div className="absolute inset-0 bg-linear-to-t from-white via-white/10 to-transparent" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-5 px-6 pb-6">
            <div className="-mt-16 flex flex-wrap items-end gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-28 w-28 rounded-3xl border-4 border-white bg-white object-cover object-top shadow-md" />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-3xl border-4 border-white bg-slate-900 text-white shadow-md">
                  <UserRound className="h-9 w-9" />
                </div>
              )}
              <div className="pb-1">
                <p className="text-xs font-black uppercase tracking-widest text-sky-700">My account</p>
                <h1 className="mt-1 text-3xl font-black leading-tight text-slate-950 md:text-4xl">{displayName}</h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">{user?.email}</p>
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

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card as="form" className="p-6" onSubmit={handleSaveProfile}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">Profile</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Personal details</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Your public travel profile is shown when someone checks who is requesting to join, who is in a trip room, or who sent a chat message.
                  </p>
                </div>
                <Button
                  type="button"
                  tone="ghost"
                  icon={editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                  onClick={() => {
                    setEditing((value) => !value);
                    setError("");
                    setSuccess("");
                    if (editing) setForm(profileFormFromUser(user));
                  }}
                >
                  {editing ? "Cancel" : "Edit"}
                </Button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProfileInput label="First name" value={form.firstName} disabled={!editing} onChange={(value) => updateField("firstName", value)} />
                <ProfileInput label="Last name" value={form.lastName} disabled={!editing} onChange={(value) => updateField("lastName", value)} />
                <ProfileInput label="Date of birth" type="date" value={form.birthDate} disabled={!editing} onChange={(value) => updateField("birthDate", value)} />
                <ProfileInput label="Home city" value={form.homeCity} disabled={!editing} placeholder="Ljubljana, Vienna, Berlin..." onChange={(value) => updateField("homeCity", value)} />

                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-bold text-slate-600">Profile picture</p>
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-20 w-20 rounded-2xl bg-white object-cover object-top ring-1 ring-slate-200" />
                    ) : (
                      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-900 text-white">
                        <UserRound className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handlePhotoFile(event.target.files?.[0])} />
                      <Button type="button" tone="ghost" disabled={!editing} icon={<Camera className="h-4 w-4" />} onClick={() => fileInputRef.current?.click()}>
                        Change photo
                      </Button>
                      <Button type="button" tone="ghost" disabled={!editing || !avatarUrl} icon={<X className="h-4 w-4" />} onClick={() => updateField("avatarUrl", "")}>
                        Remove old photo
                      </Button>
                    </div>
                  </div>
                </div>

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

            <Card as="section" className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">My trips</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Trips you created</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">A cleaner view of your saved itineraries and trip rooms.</p>
                </div>
                <ButtonLink to="/trips" tone="ghost">Open all trips</ButtonLink>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {loadingTrips && [1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}
                {!loadingTrips && visibleTrips.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500 sm:col-span-2">
                    No created trips yet. Build a trip in the planner and save it to your account.
                  </div>
                )}
                {!loadingTrips && visibleTrips.map((trip) => <AccountTripCard key={trip.id} trip={trip} />)}
              </div>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card as="section" className="p-6">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Security</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Password access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Send a password reset link to your email if you forgot your password or want to change it.
              </p>
              <Button
                type="button"
                tone="ghost"
                size="lg"
                className="mt-4 w-full rounded-2xl"
                disabled={resettingPassword || !isSupabaseConfigured}
                onClick={handlePasswordReset}
                icon={resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              >
                {resettingPassword ? "Sending..." : "Send reset email"}
              </Button>
            </Card>

            <Card as="section" className="p-6">
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
                className="mt-4 w-full rounded-2xl"
                icon={deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              >
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </Card>
          </aside>
        </section>
      </PageShell>

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
