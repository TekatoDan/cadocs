import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock, AlertTriangle, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getDefaultTeam, getTeamRole } from '../lib/teams';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  useEffect(() => {
    async function checkApproval() {
      if (session?.user?.email) {
        const email = session.user.email;
        const userId = session.user.id;
        
        try {
          // Check if user is an owner
          const team = await getDefaultTeam(userId);
          const role = await getTeamRole(team.id, userId);

          if (role === 'owner') {
            setApprovalStatus('approved');
            return;
          } else if (role === 'admin' || role === 'member') {
            setApprovalStatus('approved');
            return;
          } else if (role === 'rejected') {
            setApprovalStatus('rejected');
            return;
          } else {
            // Default to pending for 'viewer' or any other role
            setApprovalStatus('pending');
            return;
          }
        } catch (error) {
          console.error("Error checking role:", error);
          setApprovalStatus('pending');
        }
      }
    }

    checkApproval();
  }, [session]);

  if (loading || (session && !approvalStatus)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (approvalStatus === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-50 dark:bg-amber-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
            <Lock className="h-10 w-10 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              Account Pending
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Oops! Your account is pending verification. Please contact the Owner for access.
            </p>
            <div className="mt-6 p-4 bg-slate-50 dark:bg-navy-950 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
              {session.user.email}
            </div>
            <button
              onClick={async () => {
                try {
                  const team = await getDefaultTeam(session.user.id);
                  const role = await getTeamRole(team.id, session.user.id);
                  if (role === 'owner' || role === 'admin' || role === 'member') {
                    window.location.reload();
                  } else {
                    alert('Request sent successfully! The owner will review it shortly.');
                  }
                } catch (err: any) {
                  console.error(err);
                  alert('Error sending request: ' + (err.message || 'Unknown error. Please ensure your account is fully set up.'));
                }
              }}
              className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
            >
              Resend Request
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-3 w-full rounded-xl bg-white dark:bg-navy-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-navy-950 px-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

        <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-navy-900 p-10 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative z-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
              Access Denied
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              Your account request has been rejected.
            </p>
            <div className="mt-6 p-4 bg-slate-50 dark:bg-navy-950 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-800">
              {session.user.email}
            </div>
            <a
              href="mailto:owner@cadocs.com"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
            >
              <Mail className="h-4 w-4" />
              Contact Owner
            </a>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-3 w-full rounded-xl bg-white dark:bg-navy-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
