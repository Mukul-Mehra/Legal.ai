// src/lib/session.ts
import "server-only";

import { cookies } from "next/headers";

const COOKIE = "session";

export async function createSession(
  token: string,
  maxAgeSeconds: number
): Promise<void> {
  const store = await cookies();

  store.set(COOKIE, token, {
    // Unreadable from JavaScript. This is the reason the token is not in
    // localStorage: the app renders model output, and an XSS hole would let a
    // readable token walk out the door.
    httpOnly: true,
    // Not attached to cross-site POSTs, which blunts CSRF.
    sameSite: "lax",
    // http is fine on localhost; require https once deployed.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}