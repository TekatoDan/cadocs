import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  const headers = request.headers;
  const forwardedHost = headers.get("x-forwarded-host");
  const forwardedProto = headers.get("x-forwarded-proto");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const safeOrigin = forwardedHost
    ? `${forwardedProto ?? "https"}://${forwardedHost}`
    : appUrl ?? origin;

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
