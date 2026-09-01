"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, Field } from "@/components/AuthShell";
import { signup } from "@/lib/auth-actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free while Legal AI is in beta."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
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
          label="Name"
          name="name"
          autoComplete="name"
          placeholder="Aisha Verma"
          defaultValue={state?.values?.name}
          errors={state?.errors?.name}
        />

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
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          errors={state?.errors?.password}
        />

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}