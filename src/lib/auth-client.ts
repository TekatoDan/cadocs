import type { Session, SupabaseClient } from "@supabase/supabase-js";

export const MIN_PASSWORD_LENGTH = 6;

export type EmailAuthMode = "sign-in" | "sign-up";

export type EmailAuthResult =
  | {
      status: "signed-in";
      email: string;
      session: Session;
    }
  | {
      status: "confirmation-required";
      email: string;
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email.trim());
}

export function validateEmailAuthInput({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

export function getReadableAuthError(error: unknown) {
  const fallback = "Authentication failed. Please try again.";

  if (!error || typeof error !== "object") {
    return fallback;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : fallback;
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (
    lowerMessage.includes("email not confirmed") ||
    lowerMessage.includes("not confirmed")
  ) {
    return "Please confirm your email before signing in.";
  }

  if (
    lowerMessage.includes("user already registered") ||
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("already been registered")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }

  if (lowerMessage.includes("password")) {
    return message;
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (lowerMessage.includes("signup") && lowerMessage.includes("disabled")) {
    return "Email sign up is currently disabled for this project.";
  }

  return message || fallback;
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<EmailAuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const validationError = validateEmailAuthInput({
    email: normalizedEmail,
    password,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw error;
  }

  const session =
    data.session ??
    (await supabase.auth.getSession()).data.session;

  if (!session) {
    throw new Error("Sign in succeeded, but no session was created.");
  }

  return {
    status: "signed-in",
    email: session.user.email ?? normalizedEmail,
    session,
  };
}

export async function signUpWithEmail(
  supabase: SupabaseClient,
  email: string,
  password: string,
  redirectTo: string
): Promise<EmailAuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const validationError = validateEmailAuthInput({
    email: normalizedEmail,
    password,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }

  if (data.session) {
    return {
      status: "signed-in",
      email: data.session.user.email ?? normalizedEmail,
      session: data.session,
    };
  }

  return {
    status: "confirmation-required",
    email: data.user?.email ?? normalizedEmail,
  };
}

export async function sendPasswordResetEmail(
  supabase: SupabaseClient,
  email: string,
  redirectTo: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Enter your email address first, then request a reset link.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    throw error;
  }

  return normalizedEmail;
}
