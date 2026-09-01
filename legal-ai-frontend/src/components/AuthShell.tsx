// src/components/AuthShell.tsx
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";


export function AuthShell({
    title,
    subtitle,
    children,
    footer,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center px-5 py-12">
            <div className="w-full max-w-sm">
                <Link
                    href="/"
                    className="mb-8 block text-center text-sm font-semibold tracking-tight"
                >
                    Legal AI
                </Link>

                <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                    <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
                    {children}
                </div>

                <p className="mt-5 text-center text-[13px] text-muted">{footer}</p>

                <p className="mt-6 text-center text-[11px] leading-relaxed text-muted/70">
                    Legal AI provides general legal information about Indian matrimonial
                    law. It is not legal advice and creates no advocate-client
                    relationship.
                </p>
            </div>
        </div>
    );
}

export function Field({
    label,
    name,
    type = "text",
    autoComplete,
    placeholder,
    defaultValue,
    errors,
    hint,
}: {
    label: string;
    name: string;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    defaultValue?: string;
    errors?: string[];
    hint?: string;
}) {
    const invalid = Boolean(errors?.length);
    const [revealed, setRevealed] = useState(false);

    // Any field declared as a password gets the eye, so callers don't opt in.
    // Revealing genuinely swaps the input to type="text": browsers deliberately
    // give no way to display the characters of a password input.
    const isPassword = type === "password";
    const inputType = isPassword && revealed ? "text" : type;
    const errorId = `${name}-error`;

    return (
        <div className="mt-4">
            {/* htmlFor rather than wrapping the input, because a <label> may not
          contain another focusable control - and the eye is a <button>. */}
            <label
                htmlFor={name}
                className="mb-1.5 block text-xs font-medium text-muted"
            >
                {label}
            </label>

            <div className="relative">
                <input
                    id={name}
                    name={name}
                    type={inputType}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? errorId : undefined}
                    className={`w-full rounded-xl border bg-canvas py-2 pl-3 text-sm text-ink outline-none transition placeholder:text-muted/50 focus:border-muted/50 ${isPassword ? "pr-11" : "pr-3"
                        } ${invalid ? "border-red-400 dark:border-red-500/70" : "border-line"}`}
                />

                {isPassword && (
                    <button
                        // type="button" is load-bearing. Inside a <form> the default is
                        // "submit", so without it clicking the eye would submit the form.
                        type="button"
                        onClick={() => setRevealed((v) => !v)}
                        aria-label={revealed ? "Hide password" : "Show password"}
                        aria-pressed={revealed}
                        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-bubble hover:text-ink"
                    >
                        {revealed ? (
                            <EyeIcon className="h-4 w-4" />
                        ) : (
                            <EyeOffIcon className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            {hint && !invalid && (
                <p className="mt-1 text-[11px] text-muted/80">{hint}</p>
            )}

            {invalid && (
                <div id={errorId}>
                    {errors?.map((message) => (
                        <p
                            key={message}
                            className="mt-1 text-[11px] text-red-600 dark:text-red-400"
                        >
                            {message}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

const iconBase = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": false,
};

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg {...iconBase} className={className}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon({ className }: { className?: string }) {
    return (
        <svg {...iconBase} className={className}>
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <path d="m2 2 20 20" />
        </svg>
    );
}