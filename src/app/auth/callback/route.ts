import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalhostOrigin(value: string) {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getSafeOrigin(request: Request, requestOrigin: string) {
  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto");
  const forwardedOrigin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : "";
  const vercelOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? trimTrailingSlash(process.env.NEXT_PUBLIC_APP_URL)
    : "";

  for (const candidate of [
    forwardedOrigin,
    requestOrigin,
    vercelOrigin,
    appOrigin,
  ]) {
    if (candidate && !isLocalhostOrigin(candidate)) {
      return trimTrailingSlash(candidate);
    }
  }

  return trimTrailingSlash(requestOrigin);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  const safeOrigin = getSafeOrigin(request, origin);

  const safeNext = next.startsWith("/") ? next : "/";
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${safeOrigin}${safeNext}`);
    }
  }

  if (tokenHash && type) {
    const supportedTypes = [
      "signup",
      "recovery",
      "email",
      "email_change",
      "invite",
      "magiclink",
    ] as const;

    if (supportedTypes.includes(type as (typeof supportedTypes)[number])) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as (typeof supportedTypes)[number],
      });

      if (!error) {
        return NextResponse.redirect(`${safeOrigin}${safeNext}`);
      }
    }
  }

  const loginUrl = new URL("/login", safeOrigin);
  loginUrl.searchParams.set("error", oauthError ?? "auth_failed");
  if (oauthErrorDescription) {
    loginUrl.searchParams.set("error_description", oauthErrorDescription);
  }

  return NextResponse.redirect(loginUrl.toString());
}
