"use client";

import { useEffect } from "react";

const AUTH_QUERY_KEYS = ["code", "token_hash", "error", "error_description"];

export function AuthCodeRedirect() {
  useEffect(() => {
    if (window.location.pathname !== "/") return;

    const searchParams = new URLSearchParams(window.location.search);
    const hasAuthParams = AUTH_QUERY_KEYS.some((key) => searchParams.has(key));
    if (!hasAuthParams) return;

    window.location.replace(`/auth/callback?${searchParams.toString()}`);
  }, []);

  return null;
}
