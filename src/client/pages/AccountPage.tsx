import { CalendarDays, Loader2, LogOut, Mail, Plane, Sparkles, Trash2, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { authHeaders } from "../api/authHeaders.js";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && !user) {
    return <Navigate to="/auth" replace state={{ from: "/account" }} />;
  }

  const avatarUrl = typeof user?.user_metadata?.avatar_url === "string"
    ? user.user_metadata.avatar_url
    : typeof user?.user_metadata?.picture === "string"
    ? user.user_metadata.picture
    : "";
  const displayName = typeof user?.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : user?.email || "SkyNode user";
  const provider = user?.app_metadata?.provider || "email";
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

      <main className="px-6 pb-16 pt-24">
        <div className="mx-auto max-w-5xl">
          <section className="mb-6 overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-white/10" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white ring-4 ring-white/10">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-200">My account</p>
                  <h1 className="mt-1 text-3xl font-black">{displayName}</h1>
                  <p className="mt-1 text-sm text-slate-300">{user?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Profile</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Account details</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <AccountField icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email || "Unknown"} />
                <AccountField icon={<UserRound className="h-4 w-4" />} label="Provider" value={String(provider)} />
                <AccountField icon={<CalendarDays className="h-4 w-4" />} label="Created" value={createdAt} />
                <AccountField icon={<Plane className="h-4 w-4" />} label="Trip privacy" value="Saved under your account" />
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
              <p className="text-xs font-black uppercase tracking-widest text-blue-500">Quick actions</p>
              <div className="mt-5 grid gap-3">
                <Link
                  to="/planner"
                  className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white no-underline transition hover:bg-blue-700"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate itinerary
                </Link>
                <Link
                  to="/assistant"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 no-underline transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <UserRound className="h-4 w-4" />
                  Open assistant
                </Link>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-black uppercase tracking-widest text-red-500">Danger zone</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Delete your account and saved trip data from SkyNode.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleting ? "Deleting..." : "Delete account"}
                </button>
              </div>
            </aside>
          </section>
        </div>
      </main>

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
      <p className="break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
