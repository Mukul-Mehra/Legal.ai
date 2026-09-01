// src/lib/chat.ts
// Conversation model + localStorage persistence.

import type { SourceDoc } from "@/lib/api";

export interface Turn {
  id: number;
  question: string;
  status: "pending" | "streaming" | "done" | "error";
  answer: string;
  sources: SourceDoc[];
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  caseType: string;
  stateName: string;
  turns: Turn[];
}

export const CASE_TYPES = [
  "",
  "Divorce by mutual consent",
  "Divorce (contested)",
  "Nullity / void or voidable marriage",
  "Restitution of conjugal rights",
  "Bigamy",
  "Dowry / cruelty",
  "Maintenance / alimony",
];

const STORAGE_KEY = "legal-ai:conversations:v1";

// crypto.randomUUID needs a secure context. localhost qualifies, but testing
// over a plain-http LAN address does not, so fall back.
function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function createConversation(defaults?: {
  caseType?: string;
  stateName?: string;
}): Conversation {
  return {
    id: uid(),
    title: "New chat",
    createdAt: Date.now(),
    caseType: defaults?.caseType ?? "",
    stateName: defaults?.stateName ?? "",
    turns: [],
  };
}

export function titleFromQuestion(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length > 46 ? `${clean.slice(0, 46)}…` : clean;
}

export function isStreaming(conversation: Conversation): boolean {
  return conversation.turns.some(
    (t) => t.status === "pending" || t.status === "streaming"
  );
}

// A turn that was mid-flight when the tab closed can never finish, so it is
// stored as a retryable error rather than a spinner that hangs forever.
function settle(turns: Turn[]): Turn[] {
  return turns.map((t) =>
    t.status === "pending" || t.status === "streaming"
      ? { ...t, status: "error" as const, error: "Interrupted. Press Try again." }
      : t
  );
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === "string")
      .map((c) => ({
        id: c.id,
        title: c.title ?? "New chat",
        createdAt: c.createdAt ?? 0,
        caseType: c.caseType ?? "",
        stateName: c.stateName ?? "",
        turns: settle(Array.isArray(c.turns) ? c.turns : []),
      }));
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload = list.map((c) => ({ ...c, turns: settle(c.turns) }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded, or storage blocked in private mode. History is a
    // convenience - a failed write must not break the chat.
  }
}