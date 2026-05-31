import { CalendarDays, CheckCircle2, Loader2, LogOut, Mail, Sparkles, Trash2, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authHeaders } from "../api/authHeaders.js";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button, ButtonLink, Card, HeroPanel, PageShell } from "../components/ui";
import type { User } from "@supabase/supabase-js";

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

export function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && !user) {
    return <Navigate to="/auth" replace state={{ from: "/account" }} />;
  }

  const avatarUrl = userImage(user);
  const firstName = typeof user?.user_metadata?.first_name === "string" ? user.user_metadata.first_name : "";
  const lastName = typeof user?.user_metadata?.last_name === "string" ? user.user_metadata.last_name : "";
  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || metadataName || "SkyNode traveler";
  const birthDate = typeof user?.user_metadata?.birth_date === "string" ? user.user_metadata.birth_date : "";
  const formattedBirthDate = birthDate ? new Date(`${birthDate}T00:00:00`).toLocaleDateString() : "Not added";
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown";

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your SkyNode account and saved trips? This cannot be undone.");

    if (!confirmed) {
      return;
    }

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

      <PageShell containerClassName="max-w-5xl">
          <HeroPanel
            eyebrow="My account"
            title={displayName}
            description="Your SkyNode travel profile"
            actions={
              <Button type="button" tone="light" onClick={() => void signOut()} icon={<LogOut className="h-4 w-4" />}>
                Sign out
              </Button>
            }
            className="mb-6"
          >
            <div className="mt-6 flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-white/10" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-white ring-4 ring-white/10">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-white">{displayName}</p>
                  <p className="mt-1 text-sm font-semibold text-white/70">{user?.email}</p>
                </div>
            </div>
          </HeroPanel>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card as="div" className="p-6">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Profile</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Personal details</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                These details help personalize your saved trips and account experience.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <AccountField icon={<UserRound className="h-4 w-4" />} label="Full name" value={displayName} />
                <AccountField icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || "Unknown"} />
                <AccountField icon={<CalendarDays className="h-4 w-4" />} label="Date of birth" value={formattedBirthDate} />
                <AccountField icon={<CheckCircle2 className="h-4 w-4" />} label="Age check" value={birthDate ? "18+ verified" : "Not added"} />
                <AccountField icon={<CalendarDays className="h-4 w-4" />} label="Member since" value={createdAt} />
              </div>
            </Card>

            <Card as="aside" className="p-6">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Quick actions</p>
              <div className="mt-5 grid gap-3">
                <ButtonLink to="/planner" tone="secondary" size="lg" icon={<Sparkles className="h-4 w-4" />} className="justify-start rounded-2xl">Generate itinerary</ButtonLink>
                <ButtonLink to="/assistant" tone="ghost" size="lg" icon={<UserRound className="h-4 w-4" />} className="justify-start rounded-2xl">Open assistant</ButtonLink>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
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
              </div>
            </Card>
          </section>
      </PageShell>

      <Footer />
    </div>
  );
}

function AccountField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
        {icon}
        {label}
      </p>
      <p className="wrap-break-word text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
