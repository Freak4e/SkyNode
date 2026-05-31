import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../../../assets/logo_skynode_horizontal.png";

type AuthMode = "signin" | "signup";
type Notice = { kind: "error" | "success" | "info"; text: string };

function authMessage(error: unknown, mode: AuthMode): string {
  const message = error instanceof Error ? error.message : "Authentication failed.";

  if (/invalid login credentials|invalid credentials|email not confirmed/i.test(message)) {
    return mode === "signin"
      ? "Email or password is incorrect. If you just registered, confirm your email first."
      : "That email could not be registered.";
  }

  if (/already|registered|exists/i.test(message)) {
    return "An account with this email already exists. Please sign in instead.";
  }

  return message;
}

export function AuthPage() {
  const { user, loading: authLoading, signIn, signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const searchParams = new URLSearchParams(location.search);
  const callbackMode = searchParams.get("callback") === "oauth";
  const backTo = typeof location.state === "object" && location.state && "from" in location.state
    ? String(location.state.from)
    : "/";

  useEffect(() => {
    const oauthError = searchParams.get("error_description") || searchParams.get("error");

    if (oauthError) {
      setNotice({ kind: "error", text: decodeURIComponent(oauthError.replace(/\+/g, " ")) });
    }
  }, [location.search]);

  if (callbackMode && authLoading) {
    return <AuthLoadingScreen text="Finishing secure sign-in..." />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate("/", { replace: true });
      } else {
        const signupResult = await signUp(email, password);

        if (signupResult === "already_exists") {
          setNotice({ kind: "info", text: "An account with this email already exists. Please sign in instead." });
          setMode("signin");
          return;
        }

        if (signupResult === "confirmation_required") {
          setNotice({ kind: "success", text: "Account created. Check your email to confirm your account, then sign in." });
          setMode("signin");
          setPassword("");
          return;
        }

        navigate("/", { replace: true });
      }
    } catch (authError) {
      const message = authMessage(authError, mode);

      if (mode === "signup" && /already exists/i.test(message)) {
        setNotice({ kind: "info", text: message });
        setMode("signin");
        return;
      }

      setNotice({ kind: "error", text: message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setNotice({ kind: "info", text: "Opening Google sign-in..." });

    try {
      await signInWithProvider("google", `${window.location.origin}/auth?callback=oauth`);
    } catch (authError) {
      setNotice({ kind: "error", text: authError instanceof Error ? authError.message : "Google sign-in failed." });
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setNotice(null);
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
              to={backTo}
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

                {notice && <AuthNotice notice={notice} />}

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

function AuthNotice({ notice }: { notice: Notice }) {
  const Icon = notice.kind === "error" ? AlertCircle : notice.kind === "success" ? CheckCircle2 : Info;
  const className = notice.kind === "error"
    ? "border-red-100 bg-red-50 text-red-700"
    : notice.kind === "success"
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-blue-100 bg-blue-50 text-blue-700";

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{notice.text}</span>
    </div>
  );
}

function AuthLoadingScreen({ text }: { text: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-slate-200">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-xl font-black text-slate-950">{text}</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">You will be redirected automatically.</p>
      </div>
    </div>
  );
}
