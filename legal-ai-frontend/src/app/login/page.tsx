"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { login } from "@/lib/auth-actions";

export default function LoginPage() {
  // useActionState gives us the returned errors plus a pending flag for free,
  // so there is no loading useState to keep in sync.
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to reach your chats and saved defaults."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form action={action}>
        {state?.message && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {state.message}
          </p>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state?.values?.email}
          errors={state?.errors?.email}
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          errors={state?.errors?.password}
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}