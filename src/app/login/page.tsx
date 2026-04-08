"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

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
  const getStrengthColor = () => {
    if (passwordScore === 0) return "bg-slate-200 dark:bg-slate-700";
    if (passwordScore === 1) return "bg-red-500";
    if (passwordScore === 2) return "bg-amber-500";
    if (passwordScore === 3) return "bg-blue-500";
    return "bg-emerald-500";
  };
  const getStrengthText = () => {
    if (passwordScore === 0) return "";
    if (passwordScore === 1) return "Weak";
    if (passwordScore === 2) return "Fair";
    if (passwordScore === 3) return "Good";
    return "Strong";
  };

  const isEmailValid = email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isSignUp && !acceptedTerms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }
    if (isSignUp && passwordScore < 2) {
      setError("Please choose a stronger password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data?.user && data.session === null) {
          setMessage("Please check your email for a confirmation link.");
        } else {
          setSuccessEmail(email);
          setIsSuccess(true);
          setTimeout(() => router.push("/"), 1500);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessEmail(email);
        setIsSuccess(true);
        setTimeout(() => router.push("/"), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google login.");
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4">
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isSignUp ? "Account Created!" : "Welcome Back!"}
          </h2>
          <p className="text-base font-medium text-slate-600 dark:text-slate-400">
            Successfully authenticated as{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {successEmail}
            </span>
          </p>
          <p className="text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 relative z-10">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 dark:bg-navy-950 p-2 shadow-sm border border-slate-100 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="CADOcs Logo"
              className="h-full w-full object-contain drop-shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
            CADOcs
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Secure document management
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 space-x-1 bg-slate-50 dark:bg-navy-950 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => { setIsSignUp(false); setError(null); setMessage(null); }}
            className={`w-full rounded-xl py-2.5 text-sm font-bold leading-5 transition-all duration-200 ${
              !isSignUp
                ? "bg-white dark:bg-navy-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setError(null); setMessage(null); }}
            className={`w-full rounded-xl py-2.5 text-sm font-bold leading-5 transition-all duration-200 ${
              isSignUp
                ? "bg-white dark:bg-navy-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white dark:bg-navy-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
              <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
              <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
              <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm font-medium">
              <span className="bg-white dark:bg-navy-900 px-4 text-slate-500 dark:text-slate-400">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${email.length > 0 ? (isEmailValid ? "text-emerald-500" : "text-red-400") : "text-slate-400"}`} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-4 py-3 border rounded-xl bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 sm:text-sm transition-all ${
                    email.length > 0 && !isEmailValid
                      ? "border-red-300 focus:ring-red-500 dark:border-red-500/50"
                      : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500"
                  }`}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-navy-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {isSignUp && password.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                          passwordScore >= level
                            ? getStrengthColor()
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-bold text-right ${
                    passwordScore < 2 ? "text-red-500" : passwordScore === 2 ? "text-amber-500" : passwordScore === 3 ? "text-blue-500" : "text-emerald-500"
                  }`}>
                    {getStrengthText()}
                  </p>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="flex items-start mt-4">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 mt-0.5"
                />
                <label htmlFor="terms" className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  I accept the{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Terms of Service</span>
                  {" "}and{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Privacy Policy</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && !acceptedTerms) || (email.length > 0 && !isEmailValid)}
              className="mt-6 flex w-full justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          {message && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 p-4 flex items-start gap-3 border border-emerald-100 dark:border-emerald-800/50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{message}</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-4 flex items-start gap-3 border border-red-100 dark:border-red-800/50">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
