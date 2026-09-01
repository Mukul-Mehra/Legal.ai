// src/lib/validate.ts
// Hand-rolled validation, deliberately: three forms isn't worth another
// dependency, and keeping the rules here makes them easy to hold in sync with
// the Pydantic constraints in app/models/schemas.py.

export type Errors = Record<string, string[]>;

export type FormState =
  | {
      errors?: Errors;
      message?: string;
      // Echoed back so a failed submit doesn't wipe what was typed: React 19
      // resets a form once its action finishes, so the inputs need a
      // defaultValue to restore. Passwords are never echoed.
      values?: { name?: string; email?: string };
    }
  | undefined;

export function addError(errors: Errors, field: string, message: string): void {
  (errors[field] ??= []).push(message);
}

export function hasErrors(errors: Errors): boolean {
  return Object.keys(errors).length > 0;
}

// Deliberately loose. Whether an address really exists is the backend's
// EmailStr check and ultimately a confirmation email's job. This only catches
// obvious typos before a pointless round trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(errors: Errors, value: string): void {
  if (!value) {
    addError(errors, "email", "Enter your email address.");
  } else if (!EMAIL_RE.test(value)) {
    addError(errors, "email", "That doesn't look like an email address.");
  }
}

export function validateName(errors: Errors, value: string): void {
  if (value.length < 2) {
    addError(errors, "name", "Enter at least 2 characters.");
  } else if (value.length > 120) {
    addError(errors, "name", "Keep it under 120 characters.");
  }
}

export function validateNewPassword(
  errors: Errors,
  value: string,
  field = "password"
): void {
  if (value.length < 8) addError(errors, field, "Use at least 8 characters.");

  // bcrypt hashes at most 72 bytes and the backend rejects more, so catch it
  // here with a readable message instead of letting a raw 422 come back.
  if (new TextEncoder().encode(value).length > 72) {
    addError(errors, field, "Too long — 72 bytes maximum.");
  }

  if (!/[a-zA-Z]/.test(value)) addError(errors, field, "Include a letter.");
  if (!/[0-9]/.test(value)) addError(errors, field, "Include a number.");
}