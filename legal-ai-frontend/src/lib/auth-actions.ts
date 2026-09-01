// src/lib/auth-actions.ts
"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/serverApi";
import { createSession, deleteSession } from "@/lib/session";
import {
  addError,
  hasErrors,
  validateEmail,
  validateName,
  validateNewPassword,
  type Errors,
  type FormState,
} from "@/lib/validate";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  user: { id: number; name: string; email: string };
};

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function signup(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: Errors = {};
  validateName(errors, name);
  validateEmail(errors, email);
  validateNewPassword(errors, password);
  if (hasErrors(errors)) return { errors, values: { name, email } };

  const res = await apiFetch<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    // A taken email is a problem with that field, not a page-level failure.
    if (res.status === 409) {
      return { errors: { email: [res.detail] }, values: { name, email } };
    }
    return { message: res.detail, values: { name, email } };
  }

  await createSession(res.data.access_token, res.data.expires_in);

  // Outside every try/catch on purpose: redirect() works by throwing a special
  // error, so catching around it would swallow the navigation.
  redirect("/chat");
}

export async function login(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const errors: Errors = {};
  validateEmail(errors, email);
  if (!password) addError(errors, "password", "Enter your password.");
  if (hasErrors(errors)) return { errors, values: { email } };

  const res = await apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    // Shown as one banner, never pinned to a field. The backend refuses to say
    // which half was wrong, and echoing a guess here would undo that.
    const message =
      res.status === 401 || res.detail === "Request failed (500)."
        ? "Incorrect email or password."
        : res.detail;

    return { message, values: { email } };
  }

  await createSession(res.data.access_token, res.data.expires_in);
  redirect("/chat");
}

export async function logout(): Promise<void> {
  // The token is stateless, so signing out is purely deleting our own cookie.
  // There is nothing for the backend to revoke.
  await deleteSession();
  redirect("/login");
}
