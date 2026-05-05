"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getAuthCallbackUrl,
  getReadableAuthError,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  sendPasswordResetEmail,
  signInWithEmail,
  signUpWithEmail,
} from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";
type LoadingAction = "email" | "google" | "reset" | null;

type FieldErrors = {
  email?: string;
  password?: string;
  terms?: string;
};

type SuccessState =
  | {
      title: string;
      body: string;
      redirecting?: boolean;
    }
  | null;

export default function LoginPage() {
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const isSignUp = mode === "sign-up";
  const loading = loadingAction !== null;
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = isValidEmail(normalizedEmail);

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

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passwordScore = getPasswordStrength(password);
  const passwordStrength = [
    "bg-slate-200 dark:bg-slate-700",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ][passwordScore];
  const passwordStrengthText = ["", "Weak", "Fair", "Good", "Strong"][
    passwordScore
  ];

  const validateForm = () => {
    const nextErrors: FieldErrors = {};

    if (!emailIsValid) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (isSignUp && password.length >= MIN_PASSWORD_LENGTH && passwordScore < 2) {
      nextErrors.password =
        "Use a stronger password with at least 8 characters, a number, uppercase letter, or symbol.";
    }

    if (isSignUp && !acceptedTerms) {
      nextErrors.terms = "Accept the terms to create an account.";
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
      const redirectTo = getAuthCallbackUrl();
      const result = isSignUp
        ? await signUpWithEmail(supabase, normalizedEmail, password, redirectTo)
        : await signInWithEmail(supabase, normalizedEmail, password);

      if (result.status === "confirmation-required") {
        setMessage(`Check ${result.email} for a confirmation link.`);
        setPassword("");
        return;
      }

      setSuccess({
        title: isSignUp ? "Account created" : "Welcome back",
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

    if (!emailIsValid) {
      setFieldErrors({
        email: "Enter your email address first, then request a reset link.",
      });
      return;
    }

    setLoadingAction("reset");

    try {
      const resetEmail = await sendPasswordResetEmail(
        supabase,
        normalizedEmail,
        getAuthCallbackUrl("/reset-password")
      );
      setMessage(`Password reset link sent to ${resetEmail}.`);
    } catch (err) {
      setError(getReadableAuthError(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearNotices();
    setFieldErrors({});
    setPassword("");
    setAcceptedTerms(false);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearNotices();
    setFieldErrors((current) => ({ ...current, email: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearNotices();
    setFieldErrors((current) => ({ ...current, password: undefined }));
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-navy-950">
        <div className="app-surface w-full max-w-md p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {success.title}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            {success.body}
          </p>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-navy-950">
      <div className="app-surface w-full max-w-md p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-2 shadow-sm dark:border-slate-800 dark:bg-navy-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="CADOcs Logo"
              className="h-full w-full object-contain drop-shadow-sm"
              onError={(event) => {
                (event.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CADOcs
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            {isSignUp ? "Create your secure workspace" : "Sign in to your workspace"}
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-navy-950">
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              !isSignUp
                ? "bg-white text-indigo-600 shadow-sm dark:bg-navy-900 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("sign-up")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isSignUp
                ? "bg-white text-indigo-600 shadow-sm dark:bg-navy-900 dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="app-focus-ring mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-200 dark:hover:bg-navy-800"
        >
          {loadingAction === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Email
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                  email.length > 0
                    ? emailIsValid
                      ? "text-emerald-500"
                      : "text-red-400"
                    : "text-slate-400"
                }`}
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                disabled={loading}
                className={`app-focus-ring block w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-70 dark:bg-navy-950 dark:text-white ${
                  fieldErrors.email
                    ? "border-red-300 focus-visible:ring-red-500 dark:border-red-500/60"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                placeholder="you@example.com"
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-300">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="app-focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-60 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {loadingAction === "reset" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {loadingAction === "reset" ? "Sending" : "Forgot password?"}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => handlePasswordChange(event.target.value)}
                disabled={loading}
                className={`app-focus-ring block w-full rounded-xl border bg-slate-50 py-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-70 dark:bg-navy-950 dark:text-white ${
                  fieldErrors.password
                    ? "border-red-300 focus-visible:ring-red-500 dark:border-red-500/60"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={loading}
                className="app-focus-ring absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-60 dark:hover:text-slate-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-300">
                {fieldErrors.password}
              </p>
            )}

            {isSignUp && password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="grid h-1.5 grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`rounded-full transition-colors ${
                        passwordScore >= level
                          ? passwordStrength
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {passwordStrengthText}
                </p>
              </div>
            )}
          </div>

          {isSignUp && (
            <div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-navy-950 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                    clearNotices();
                    setFieldErrors((current) => ({
                      ...current,
                      terms: undefined,
                    }));
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span>
                  I accept the{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Privacy Policy
                  </span>
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-300">
                  {fieldErrors.terms}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="app-focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === "email" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSignUp ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {message && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-800/50 dark:bg-emerald-900/30">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-800/50 dark:bg-red-900/30">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
            className="app-focus-ring rounded-md font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
