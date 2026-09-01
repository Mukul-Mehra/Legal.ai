// src/lib/api.ts
// Types mirror the backend Pydantic schemas in app/models/schemas.py

export interface AskRequest {
  question: string;
  state?: string | null;
  case_type?: string | null;
}

export interface SourceDoc {
  title: string;
  citation: string;
  excerpt: string;
  url?: string | null;
}

export interface AskResponse {
  answer: string;
  sources: SourceDoc[];
  disclaimer: string;
}

export type StreamEvent =
  | { type: "sources"; sources: SourceDoc[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; detail: string };

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

/** Non-streaming call against POST /api/ask. */
export async function askQuestion(payload: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(detail);
  }

  return res.json();
}

/** Streaming call against POST /api/ask/stream, yielding SSE events. */
export async function* streamQuestion(
  payload: AskRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_BASE_URL}/api/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line. The last piece may be a
    // partial frame, so it stays in the buffer for the next read.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      yield JSON.parse(line.slice(6)) as StreamEvent;
    }
  }
}