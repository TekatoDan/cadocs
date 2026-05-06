"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileStack,
  Headphones,
  Loader2,
  Lock,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthCallbackUrl,
  getReadableAuthError,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  sendPasswordResetEmail,
  signInWithEmail,
} from "@/lib/auth-client";

type LoadingAction = "email" | "google" | "reset" | null;

type FieldErrors = {
  username?: string;
  password?: string;
};

type SuccessState =
  | {
      title: string;
      body: string;
      redirecting?: boolean;
    }
  | null;

const features = [
  { label: "Organize", icon: FileStack },
  { label: "Manage", icon: TrendingUp },
  { label: "Secure", icon: ShieldCheck },
];

export default function LoginPage() {
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const loading = loadingAction !== null;
  const normalizedUsername = username.trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    const authErrorDescription = params.get("error_description");
    const authMessage = params.get("message");

    if (authMessage === "password_updated") {
      setMessage("Your password has been updated. You can sign in now.");
    }

    if (!authError) return;

    if (authErrorDescription) {
      setError(authErrorDescription.replace(/\+/g, " "));
      return;
    }

    setError(
      authError === "access_denied"
        ? "Authentication was cancelled or denied."
        : "Authentication failed. Please try again."
    );
  }, []);

  const clearNotices = () => {
    setError(null);
    setMessage(null);
    setSuccess(null);
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!normalizedUsername) {
      nextErrors.username = "Please enter your username.";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const redirectToDashboard = () => {
    window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 500);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotices();

    if (!validateForm()) {
      return;
    }

    setLoadingAction("email");

    try {
      const result = await signInWithEmail(supabase, normalizedUsername, password);

      setSuccess({
        title: "Welcome back",
        body: `Signed in as ${result.email}.`,
        redirecting: true,
      });
      redirectToDashboard();
    } catch (err) {
      setError(getReadableAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    clearNotices();
    setLoadingAction("google");

    try {
      const redirectTo = getAuthCallbackUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;

      if (!data.url) {
        throw new Error("Google login did not return a redirect URL.");
      }

      const oauthUrl = new URL(data.url);
      const returnedRedirectTo = oauthUrl.searchParams.get("redirect_to");

      if (returnedRedirectTo?.includes("localhost")) {
        oauthUrl.searchParams.set("redirect_to", redirectTo);
      }

      window.location.assign(oauthUrl.toString());
    } catch (err) {
      setError(getReadableAuthError(err));
      setLoadingAction(null);
    }
  };

  const handleForgotPassword = async () => {
    clearNotices();

    if (!isValidEmail(normalizedUsername)) {
      setFieldErrors({
        username: "Enter the email linked to your account before requesting a reset link.",
      });
      return;
    }

    setLoadingAction("reset");

    try {
      const resetEmail = await sendPasswordResetEmail(
        supabase,
        normalizedUsername,
        getAuthCallbackUrl("/reset-password")
      );
      setMessage(`Password reset link sent to ${resetEmail}.`);
    } catch (err) {
      setError(getReadableAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    clearNotices();
    setFieldErrors((current) => ({ ...current, username: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearNotices();
    setFieldErrors((current) => ({ ...current, password: undefined }));
  };

  if (success) {
    return <SuccessScreen success={success} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf4ff_0,#f7fbff_34%,#edf3f9_100%)] text-[#071946]">
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="grid flex-1 bg-transparent lg:grid-cols-[minmax(0,1.38fr)_minmax(420px,0.82fr)]">
          <HeroSection />
          <section className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-14">
            <LoginCard
              error={error}
              fieldErrors={fieldErrors}
              handleEmailAuth={handleEmailAuth}
              handleForgotPassword={handleForgotPassword}
              handleGoogleLogin={handleGoogleLogin}
              handlePasswordChange={handlePasswordChange}
              handleUsernameChange={handleUsernameChange}
              loading={loading}
              loadingAction={loadingAction}
              message={message}
              password={password}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              setShowPassword={setShowPassword}
              showPassword={showPassword}
              username={username}
            />
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="relative z-20 border-b border-white/70 bg-white/90 shadow-[0_14px_40px_rgba(15,35,80,0.08)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 px-5 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-16 xl:px-20">
        <div className="group flex min-w-0 items-center gap-4 sm:gap-7">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_10px_26px_rgba(7,25,70,0.12)] ring-1 ring-slate-200/80 transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-24 sm:w-24">
            <div className="relative h-[88%] w-[88%]">
              <Image
                src="/logo.png"
                alt="Digos City seal"
                fill
                priority
                sizes="(max-width: 640px) 56px, 84px"
                className="object-contain"
              />
            </div>
          </div>
          <div className="h-14 w-px bg-gradient-to-b from-transparent via-slate-300/90 to-transparent sm:h-16" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-heading text-3xl font-extrabold leading-none tracking-normal text-[#061a55] sm:text-5xl">
              CADOCS
            </p>
            <p className="mt-1 max-w-[13rem] text-[0.68rem] font-medium uppercase leading-snug tracking-normal text-slate-500 sm:mt-2 sm:max-w-none sm:text-sm">
              Information Management System (IMS)
            </p>
          </div>
        </div>

        <a
          href="#"
          className="app-focus-ring group flex w-fit items-center gap-3 self-start rounded-2xl border border-blue-100/90 bg-gradient-to-br from-white to-blue-50/70 px-4 py-3 text-[#061a55] shadow-[0_10px_28px_rgba(3,75,217,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-[0_16px_36px_rgba(3,75,217,0.15)] lg:self-center"
          aria-label="Contact ICT Support"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0b53d0] shadow-sm ring-1 ring-blue-100 transition-colors duration-300 group-hover:bg-[#0b53d0] group-hover:text-white">
            <Headphones className="h-6 w-6 stroke-[1.8]" aria-hidden="true" />
          </span>
          <span className="text-sm leading-tight">
            <span className="block font-semibold">Need help?</span>
            <span className="block font-medium text-slate-500 transition-colors duration-300 group-hover:text-[#0b53d0]">
              Contact ICT Support
            </span>
          </span>
        </a>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-sky-100 px-6 py-14 sm:px-10 lg:min-h-0 lg:px-14"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgba(241,247,255,0.08), rgba(241,247,255,0.5)), url('/login-background.png')",
        backgroundPosition: "left center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-50/20 to-[#061a55]/10" aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-white/50 shadow-[0_18px_44px_rgba(7,25,70,0.16)] ring-1 ring-white/70 backdrop-blur-sm sm:h-44 sm:w-44">
          <div className="relative h-[88%] w-[88%]">
            <Image
              src="/logo.png"
              alt="Digos City seal"
              fill
              priority
              sizes="(max-width: 640px) 126px, 155px"
              className="object-contain drop-shadow-md"
            />
          </div>
        </div>

        <h1 className="mt-6 font-heading text-6xl font-extrabold leading-none tracking-normal text-[#061a55] drop-shadow-sm sm:text-7xl lg:text-8xl">
          CADOCS
        </h1>

        <div className="mt-3 flex w-full max-w-xl items-center justify-center gap-4">
          <span className="hidden h-px flex-1 bg-[#061a55]/35 sm:block" aria-hidden="true" />
          <p className="max-w-[16rem] text-sm font-semibold uppercase leading-snug tracking-normal text-[#152b59]/90 sm:max-w-none sm:text-base">
            INFORMATION MANAGEMENT SYSTEM (IMS)
          </p>
          <span className="hidden h-px flex-1 bg-[#061a55]/35 sm:block" aria-hidden="true" />
        </div>

        <p className="mt-14 max-w-sm text-left text-5xl font-bold italic leading-tight tracking-normal text-[#061a55] drop-shadow-sm sm:text-6xl" style={{ fontFamily: '"Dancing Script", cursive' }}>
          City of Choice
        </p>

        <div className="mt-20 grid w-full max-w-xl grid-cols-3 divide-x divide-[#061a55]/25 rounded-2xl bg-white/25 py-4 text-[#061a55] shadow-[0_16px_38px_rgba(7,25,70,0.09)] ring-1 ring-white/50 backdrop-blur-sm">
          {features.map(({ label, icon: Icon }) => (
            <div key={label} className="flex min-w-0 flex-col items-center gap-2 px-3">
              <Icon className="h-10 w-10 stroke-[1.65]" aria-hidden="true" />
              <span className="text-sm font-bold sm:text-base">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type LoginCardProps = {
  error: string | null;
  fieldErrors: FieldErrors;
  handleEmailAuth: (e: React.FormEvent) => Promise<void>;
  handleForgotPassword: () => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handlePasswordChange: (value: string) => void;
  handleUsernameChange: (value: string) => void;
  loading: boolean;
  loadingAction: LoadingAction;
  message: string | null;
  password: string;
  rememberMe: boolean;
  setRememberMe: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showPassword: boolean;
  username: string;
};

function LoginCard({
  error,
  fieldErrors,
  handleEmailAuth,
  handleForgotPassword,
  handleGoogleLogin,
  handlePasswordChange,
  handleUsernameChange,
  loading,
  loadingAction,
  message,
  password,
  rememberMe,
  setRememberMe,
  setShowPassword,
  showPassword,
  username,
}: LoginCardProps) {
  return (
    <div className="relative z-10 w-full max-w-[560px] rounded-[28px] border border-white/70 bg-white/72 px-5 py-8 shadow-[0_28px_70px_rgba(7,25,70,0.18)] ring-1 ring-blue-100/50 backdrop-blur-2xl sm:px-10 sm:py-10 lg:px-12">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" aria-hidden="true" />
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 text-[#0b53d0] shadow-inner ring-1 ring-blue-100">
          <UserRound className="h-11 w-11 stroke-[1.65]" aria-hidden="true" />
        </div>
        <h2 className="mt-6 font-heading text-3xl font-bold leading-tight tracking-normal text-[#061a55]">
          Welcome Back!
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[0.95rem] font-medium leading-7 text-slate-500">
          Please sign in to your account to continue to IMS.
        </p>
      </div>

      <form onSubmit={handleEmailAuth} className="mt-10 space-y-6" noValidate>
        <div>
          <label htmlFor="username" className="mb-3 block text-sm font-semibold text-[#071946]">
            Username
          </label>
          <div className="relative">
            <UserRound
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 stroke-[1.65]"
              aria-hidden="true"
            />
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => handleUsernameChange(event.target.value)}
              disabled={loading}
              className={`app-focus-ring block h-14 w-full rounded-xl border bg-white/90 pl-14 pr-4 text-[0.95rem] font-medium text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-blue-200 disabled:opacity-70 ${
                fieldErrors.username ? "border-red-300 focus-visible:ring-red-500" : "border-slate-200"
              }`}
              placeholder="Enter your username"
            />
          </div>
          {fieldErrors.username && (
            <p className="mt-2 text-sm font-medium text-red-600">{fieldErrors.username}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-3 block text-sm font-semibold text-[#071946]">
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 stroke-[1.65]"
              aria-hidden="true"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => handlePasswordChange(event.target.value)}
              disabled={loading}
              className={`app-focus-ring block h-14 w-full rounded-xl border bg-white/90 pl-14 pr-14 text-[0.95rem] font-medium text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-blue-200 disabled:opacity-70 ${
                fieldErrors.password ? "border-red-300 focus-visible:ring-red-500" : "border-slate-200"
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={loading}
              className="app-focus-ring absolute inset-y-1 right-2 flex w-11 items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 hover:bg-blue-50 hover:text-[#0b53d0] disabled:opacity-60"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 stroke-[1.65]" />
              ) : (
                <Eye className="h-5 w-5 stroke-[1.65]" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-2 text-sm font-medium text-red-600">{fieldErrors.password}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-[#0b53d0] focus:ring-[#0b53d0]"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="app-focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-[#0047d9] transition-colors duration-200 hover:text-[#06349a] disabled:opacity-60"
          >
            {loadingAction === "reset" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loadingAction === "reset" ? "Sending" : "Forgot password?"}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="app-focus-ring flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#075ee8] via-[#034bd9] to-[#033aa9] px-4 text-base font-bold text-white shadow-[0_16px_30px_rgba(3,75,217,0.26)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(3,75,217,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAction === "email" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Lock className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
          )}
          Sign In
        </button>
      </form>

      <div className="my-6 flex items-center gap-5">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-sm font-semibold text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="app-focus-ring flex h-14 w-full items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingAction === "google" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Sign in with Google
      </button>

      {message && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <p className="mx-auto mt-7 max-w-sm text-center text-sm font-medium leading-6 text-slate-500">
        For authorized personnel only.
        <br />
        All activities are monitored and recorded.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-7 w-7 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
        fill="#EA4335"
      />
      <path
        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
        fill="#4285F4"
      />
      <path
        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
        fill="#FBBC05"
      />
      <path
        d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
        fill="#34A853"
      />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="bg-[#052b55] text-white">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-5 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
        <p>All rights reserved.</p>
        <nav aria-label="Footer links" className="flex items-center gap-8">
          <a href="#" className="app-focus-ring rounded-md hover:text-blue-100">
            Privacy Policy
          </a>
          <span className="h-6 w-px bg-white/35" aria-hidden="true" />
          <a href="#" className="app-focus-ring rounded-md hover:text-blue-100">
            Terms of Use
          </a>
        </nav>
      </div>
    </footer>
  );
}

function SuccessScreen({ success }: { success: NonNullable<SuccessState> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-normal text-slate-900">{success.title}</h2>
        <p className="mt-2 text-sm font-medium text-slate-600">{success.body}</p>
        {success.redirecting && (
          <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to your dashboard
          </p>
        )}
      </div>
    </div>
  );
}
