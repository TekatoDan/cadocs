"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDefaultTeam, useTeamRole } from "@/hooks/use-teams";
import { Loader2, Lock, AlertTriangle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, user, loading } = useAuth();
  const [showSlowState, setShowSlowState] = useState(false);
  const {
    data: team,
    isLoading: teamLoading,
    isError: teamIsError,
    error: teamError,
    refetch: refetchTeam,
  } = useDefaultTeam(user?.id);
  const {
    data: role,
    isLoading: roleLoading,
    isError: roleIsError,
    error: roleError,
    refetch: refetchRole,
  } = useTeamRole(team?.id ?? null, user?.id);

  const supabase = createClient();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  const isResolvingAccess = loading || Boolean(session && (teamLoading || roleLoading));
  const accessError = teamIsError ? teamError : roleIsError ? roleError : null;

  useEffect(() => {
    if (!isResolvingAccess) {
      setShowSlowState(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowSlowState(true);
    }, 12000);

    return () => window.clearTimeout(timeout);
  }, [isResolvingAccess]);

  if (accessError) {
    return (
      <AccessProblem
        title="We could not finish account setup"
        message="Your login worked, but CADOCS could not load your team access. This is usually a database environment variable or table setup issue."
        detail={formatError(accessError)}
        onRetry={() => {
          void refetchTeam();
          void refetchRole();
        }}
        onSignOut={() => void supabase.auth.signOut()}
      />
    );
  }

  if (isResolvingAccess && showSlowState) {
    return (
      <AccessProblem
        title="Still loading your account"
        message="CADOCS is signed in, but the dashboard setup request is taking too long. Check that Vercel has the same DATABASE_URL password and Supabase project ref as your local .env."
        onRetry={() => window.location.reload()}
        onSignOut={() => void supabase.auth.signOut()}
      />
    );
  }

  if (isResolvingAccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (role === "pending" || role === "viewer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-50 dark:bg-amber-900/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
            <Lock className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Account Pending
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Your account is pending verification. Please contact the Owner for
            access.
          </p>
          <div className="p-4 bg-slate-50 dark:bg-navy-950 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
            {session.user.email}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            Check Again
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-xl bg-white dark:bg-navy-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (role === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Access Denied
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Your account request has been rejected.
          </p>
          <a
            href="mailto:owner@cadocs.com"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
          >
            <Mail className="h-4 w-4" />
            Contact Owner
          </a>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full rounded-xl bg-white dark:bg-navy-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown setup error";
}

function AccessProblem({
  title,
  message,
  detail,
  onRetry,
  onSignOut,
}: {
  title: string;
  message: string;
  detail?: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-navy-900 dark:ring-slate-800">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800/40">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </div>
        {detail ? (
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-left text-xs text-slate-700 dark:bg-navy-950 dark:text-slate-300">
            {detail}
          </div>
        ) : null}
        <div className="grid gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
