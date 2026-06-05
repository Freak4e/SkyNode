import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import loginBanner from "../../../assets/login_banner.png";
import logo from "../../../assets/logo_skynode_horizontal.png";

type AuthMode = "signin" | "signup";
type Notice = { kind: "error" | "success" | "info"; text: string };
type SignupResult = "created" | "already_exists" | "confirmation_required";
type SignupValues = {
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

function passwordStrength(password: string): { score: number; label: string; valid: boolean } {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (score >= 5) return { score, label: "Strong password", valid: true };
  if (score >= 4) return { score, label: "Good password", valid: true };
  if (score >= 3) return { score, label: "Add more character types", valid: false };
  return { score, label: "Password is too weak", valid: false };
}

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

function validateSignup(values: SignupValues): Notice | null {
  const strength = passwordStrength(values.password);

  if (!values.firstName.trim() || !values.lastName.trim()) {
    return { kind: "error", text: "Please enter your first and last name." };
  }

  if (!strength.valid) {
    return { kind: "error", text: "Use a stronger password with at least 8 characters, uppercase, lowercase, number, and symbol." };
  }

  if (values.password !== values.confirmPassword) {
    return { kind: "error", text: "Passwords do not match." };
  }

  return null;
}

export function AuthPage() {
  const { user, loading: authLoading, signIn, signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        await submitSignin(signIn, email, password);
        navigate("/", { replace: true });
        return;
      }

      const signupValues = { confirmPassword, email, firstName, lastName, password };
      const validationNotice = validateSignup(signupValues);

      if (validationNotice) {
        setNotice(validationNotice);
        return;
      }

      handleSignupResult(await submitSignup(signUp, signupValues));
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

  async function submitSignin(callback: typeof signIn, emailValue: string, passwordValue: string): Promise<void> {
    await callback(emailValue, passwordValue);
  }

  async function submitSignup(callback: typeof signUp, values: SignupValues): Promise<SignupResult> {
    return callback(values.email, values.password, {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
    });
  }

  function handleSignupResult(signupResult: SignupResult): void {
    if (signupResult === "already_exists") {
      setNotice({ kind: "info", text: "An account with this email already exists. Please sign in instead." });
      setMode("signin");
      return;
    }

    if (signupResult === "confirmation_required") {
      setNotice({ kind: "success", text: "Account created. Check your email to confirm your account, then sign in." });
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    navigate("/", { replace: true });
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

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 lg:grid-cols-[1fr_430px]">
          <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className={`pointer-events-none absolute ${mode === "signin" ? "inset-0" : "-bottom-1 -left-32 right-0 h-[84%]"}`}>
              <img
                src={loginBanner}
                alt=""
                className={`h-full ${mode === "signin" ? "w-full" : "w-[118%]"} max-w-none object-cover opacity-100 ${mode === "signin" ? "object-left-bottom" : "object-left-bottom"}`}
              />
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-slate-950/20 to-slate-950/85" />
            </div>

            <Link to="/" className="relative z-10 flex items-center gap-2 no-underline">
              <img src={logo} alt="SkyNode" className="h-16 w-auto object-contain brightness-0 invert" />
            </Link>

            <div className="relative z-10 max-w-lg">
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
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
                  <GoogleLogo />
                </span>
                Continue with Google
              </button>

              <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-slate-500">
                <span className="h-px bg-slate-200" />
                <span>or</span>
                <span className="h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-400">Name</span>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          placeholder="First name"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-400">Surname</span>
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          placeholder="Last name"
                        />
                      </label>
                    </div>

                  </>
                )}

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
                      minLength={mode === "signup" ? 8 : 6}
                      className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Password"
                    />
                  </div>
                </label>

                {mode === "signup" && (
                  <>
                    <div>
                      <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className={`transition-all ${strength.valid ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.max(12, strength.score * 20)}%` }}
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-500">{strength.label}</p>
                    </div>

                    <label className="block">
                      <span className="sr-only">Confirm password</span>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                        <LockKeyhole className="h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          required
                          minLength={8}
                          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                          placeholder="Repeat password"
                        />
                      </div>
                    </label>
                  </>
                )}

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
                By continuing you accept the{' '}
                <Link to="/terms" className="font-black text-slate-700 underline decoration-slate-200">Terms of Use</Link>
                {' '}and{' '}
                <Link to="/privacy" className="font-black text-slate-700 underline decoration-slate-200">Privacy Policy</Link>.
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

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
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
