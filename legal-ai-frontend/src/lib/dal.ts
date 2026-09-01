// src/lib/dal.ts
import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "@/lib/serverApi";

export type User = {
  id: number;
  email: string;
  name: string;
  default_personal_law: string;
  default_state: string;
  default_case_type: string;
  created_at: string;
};

// cache() dedupes this for one render pass, so a page and a nested component
// can both ask who is signed in without two round trips to FastAPI.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const res = await apiFetch<User>("/api/auth/me", { auth: true });
  return res.ok ? res.data : null;
});

// Use this to gate a page. It is a real check, not a cookie-presence guess:
// FastAPI verifies the signature and expiry and looks the account up, so a
// forged or stale cookie cannot get through.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}