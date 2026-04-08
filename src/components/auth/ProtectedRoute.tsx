"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useDefaultTeam, useTeamRole } from "@/hooks/use-teams";
import { Loader2, Lock, AlertTriangle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, user, loading } = useAuth();
  const { data: team, isLoading: teamLoading } = useDefaultTeam(user?.id);
  const { data: role, isLoading: roleLoading } = useTeamRole(
    team?.id ?? null,
    user?.id
  );

  const supabase = createClient();

  if (loading || (session && (teamLoading || roleLoading))) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!session) return null; // Middleware handles redirect

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
