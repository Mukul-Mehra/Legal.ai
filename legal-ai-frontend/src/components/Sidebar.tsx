"use client";

import { CASE_TYPES, isStreaming } from "@/lib/chat";
import type { Conversation } from "@/lib/chat";
import ThemeToggle from "@/components/ThemeToggle";
import { logout } from "@/lib/auth-actions";
import { Scales } from "./LawIcons";

export default function Sidebar({
    open,
    user,
    conversations,
    active,
    onNewChat,
    onSelect,
    onDelete,
    onContextChange,
}: {
    open: boolean;
    user: { name: string; email: string };
    conversations: Conversation[];
    active: Conversation | null;
    onNewChat: () => void;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onContextChange: (changes: Partial<Conversation>) => void;
}) {
    return (
        <aside
            className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-line bg-surface transition-transform md:static md:z-auto md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
                }`}
        >
            <div className="flex items-center justify-between px-4 py-4">
                 <div className="flex gap-1 items-center">
                    <Scales className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold tracking-tight">Legal AI</span>
                 </div>
                <div>
                    <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">
                    Beta
                </span>
                </div>
            </div>

            <div className="px-3">
                <button
                    type="button"
                    onClick={onNewChat}
                    className="flex w-full items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink transition hover:border-muted/40"
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    New chat
                </button>
            </div>

            <div className="mt-5 space-y-3 border-t border-line px-4 pt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    Context for this chat
                </p>
                <label className="block">
                    <span className="mb-1 block text-xs text-muted">Case type</span>
                    <select
                        value={active?.caseType ?? ""}
                        onChange={(e) => onContextChange({ caseType: e.target.value })}
                        disabled={!active}
                        className="w-full truncate rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none hover:border-muted/40 disabled:opacity-50"
                    >
                        {CASE_TYPES.map((c) => (
                            <option key={c} value={c}>
                                {c === "" ? "Any" : c}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs text-muted">State</span>
                    <input
                        type="text"
                        value={active?.stateName ?? ""}
                        onChange={(e) => onContextChange({ stateName: e.target.value })}
                        disabled={!active}
                        autoComplete="off"
                        placeholder="e.g. Maharashtra"
                        className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-muted/60 hover:border-muted/40 disabled:opacity-50"
                    />
                </label>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto border-t border-line px-3 pt-4">
                <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                    Chats
                </p>

                {conversations.length === 0 ? (
                    <p className="px-1 text-xs text-muted/70">No chats yet.</p>
                ) : (
                    <ul className="space-y-0.5 pb-4">
                        {conversations.map((c) => {
                            const isActive = c.id === active?.id;
                            return (
                                <li key={c.id} className="group relative">
                                    <button
                                        type="button"
                                        onClick={() => onSelect(c.id)}
                                        title={c.title}
                                        className={`block w-full truncate rounded-lg py-1.5 pl-2.5 pr-8 text-left text-xs transition ${isActive
                                                ? "bg-bubble font-medium text-ink"
                                                : "text-muted hover:bg-bubble/60 hover:text-ink"
                                            }`}
                                    >
                                        {isStreaming(c) && (
                                            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" />
                                        )}
                                        {c.title}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onDelete(c.id)}
                                        aria-label={`Delete ${c.title}`}
                                        className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted opacity-0 transition hover:bg-line hover:text-ink focus:opacity-100 group-hover:opacity-100"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        >
                                            <path d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="space-y-1 border-t border-line px-3 py-3">
                <div className="px-2 pb-1">
                    <p className="truncate text-xs font-medium text-ink">{user.name}</p>
                    <p className="truncate text-[11px] text-muted">{user.email}</p>
                </div>

                <ThemeToggle />

                {/* A form, not an onClick: logout is a Server Action, and this is how a
            client component invokes one. */}
                <form action={logout}>
                    <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted transition hover:bg-bubble hover:text-ink"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                        </svg>
                        Sign out
                    </button>
                </form>

                <p className="px-2 pt-1 text-[11px] leading-relaxed text-muted/80">
                    Answers are grounded in the Hindu Marriage Act, 1955. General
                    information only — not legal advice.
                </p>
            </div>
        </aside>
    );
}