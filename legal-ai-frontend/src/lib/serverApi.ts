// src/lib/serverApi.ts
import "server-only";

import { getToken } from "@/lib/session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; detail: string };

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<ApiResult<T>> {
  const { auth = false, headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const token = await getToken();
    if (!token) return { ok: false, status: 401, detail: "Not signed in." };
    // The browser never sends this. It only exists server-side, read out of the
    // httpOnly cookie and forwarded here.
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      cache: "no-store",
    });
  } catch {
    // Backend not started, wrong port, or Docker down.
    return {
      ok: false,
      status: 503,
      detail: "Cannot reach the server. Is the backend running?",
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Some responses have no JSON body at all.
  }

  if (!res.ok) {
    return { ok: false, status: res.status, detail: detailFrom(body, res.status) };
  }

  return { ok: true, data: body as T };
}

// FastAPI puts a plain string in `detail` for HTTPException, but an array of
// issue objects there for 422 validation errors. Both shapes turn up, so both
// have to be unwrapped or the user sees "[object Object]".
function detailFrom(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (first && typeof first === "object" && "msg" in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }

  return `Request failed (${status}).`;
}