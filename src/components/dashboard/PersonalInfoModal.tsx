"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useUpdateMyName } from "@/hooks/use-profile";

interface PersonalInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export function PersonalInfoModal({ open, onClose }: PersonalInfoModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useMyProfile(user?.id);
  const updateNameMutation = useUpdateMyName();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const initialName =
      profile?.full_name ??
      (typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "");
    setName(initialName);
    setEmail(user?.email ?? profile?.email ?? "");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(null);
    setError(null);
  }, [open, profile, user]);

  if (!open) return null;

  const onSaveName = async () => {
    setError(null);
    setMessage(null);

    const nextName = name.trim();
    if (!nextName) {
      setError("Name cannot be empty.");
      return;
    }

    try {
      await updateNameMutation.mutateAsync(nextName);
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: nextName },
      });
      if (authError) throw authError;
      setMessage("Name updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name.");
    }
  };

  const onSaveEmail = async () => {
    setError(null);
    setMessage(null);

    const nextEmail = email.trim();
    if (!nextEmail) {
      setError("Email cannot be empty.");
      return;
    }
    if (nextEmail === (user?.email ?? "")) {
      setMessage("Email is already up to date.");
      return;
    }

    setSavingEmail(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        email: nextEmail,
      });
      if (authError) throw authError;
      setMessage("Check your email to confirm the new address.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email.");
    } finally {
      setSavingEmail(false);
    }
  };

  const onSavePassword = async () => {
    setError(null);
    setMessage(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw authError;
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-navy-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Personal Info
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View and update your account details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close personal info modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {profileLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Name
              </h3>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-navy-950 dark:text-white"
              />
              <button
                onClick={onSaveName}
                disabled={updateNameMutation.isPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {updateNameMutation.isPending ? "Saving..." : "Save name"}
              </button>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Email
              </h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-navy-950 dark:text-white"
              />
              <button
                onClick={onSaveEmail}
                disabled={savingEmail}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingEmail ? "Saving..." : "Update email"}
              </button>
            </section>

            <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Password
              </h3>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-navy-950 dark:text-white"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-navy-950 dark:text-white"
              />
              <button
                onClick={onSavePassword}
                disabled={savingPassword}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingPassword ? "Saving..." : "Update password"}
              </button>
            </section>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-200 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
