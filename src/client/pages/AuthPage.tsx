import { FormEvent, useState } from "react";
import { ArrowLeft, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../../../assets/logo_skynode_horizontal.png";

type AuthMode = "signin" | "signup";

export function AuthPage() {
  const { user, signIn, signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const from = typeof location.state === "object" && location.state && "from" in location.state
    ? String(location.state.from)
    : "/planner";

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate(from, { replace: true });
      } else {
        await signUp(email, password);
        setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
        setMode("signin");
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await signInWithProvider("google", `${window.location.origin}${from}`);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google sign-in failed.");
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:grid-cols-[1fr_430px]">
          <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <img src={logo} alt="SkyNode" className="h-16 w-auto object-contain brightness-0 invert" />
            </Link>

            <div className="max-w-lg">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-200">Account required to save</p>
              <h1 className="text-5xl font-black leading-tight">Keep every trip plan under your profile.</h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Search flights and generate itineraries as a guest. Sign in only when you want to save plans or use saved-trip chat context.
              </p>
            </div>
          </section>

          <section className="relative p-6 sm:p-8">
            <Link
              to={from}
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <div className="mx-auto max-w-sm">
              <div className="mb-7 text-center">
                <img src={logo} alt="SkyNode" className="mx-auto mb-4 h-16 w-auto max-w-full object-contain lg:hidden" />
                <h2 className="text-2xl font-black text-slate-950">
                  {mode === "signin" ? "Sign in to SkyNode" : "Create a new account"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {mode === "signin" ? "New to SkyNode?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                    className="font-black text-teal-700 underline decoration-teal-200 underline-offset-4 hover:text-teal-800"
                  >
                    {mode === "signin" ? "Register" : "Sign in"}
                  </button>
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl bg-slate-200 px-5 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-black text-blue-600">G</span>
                Continue with Google
              </button>

              <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-slate-500">
                <span className="h-px bg-slate-200" />
                <span>or</span>
                <span className="h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="sr-only">Email address</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Enter your email address"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <LockKeyhole className="h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={6}
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Password"
                    />
                  </div>
                </label>

                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
                {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-100 px-5 py-4 text-sm font-black text-teal-800 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Continue"}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
                By continuing, your saved trips and AI itinerary updates are connected to your SkyNode account.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
