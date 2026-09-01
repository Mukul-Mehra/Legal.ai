"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "@/components/Sidebar";
import { streamQuestion } from "@/lib/api";
import type { SourceDoc } from "@/lib/api";
import {
    CASE_TYPES,
    createConversation,
    loadConversations,
    saveConversations,
    titleFromQuestion,
} from "@/lib/chat";
import type { Conversation, Turn } from "@/lib/chat";
import { Scales } from "./LawIcons";

const SUGGESTIONS = [
    "How does mutual consent divorce work under Hindu law?",
    "What are the grounds for divorce under the Hindu Marriage Act?",
    "When is a Hindu marriage void?",
    "What is restitution of conjugal rights?",
];

const EMPTY_TURNS: Turn[] = [];

export type ChatUser = {
    name: string;
    email: string;
    defaultCaseType: string;
    defaultState: string;
};
export default function ChatApp({ user }: { user: ChatUser }) {

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [question, setQuestion] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const taRef = useRef<HTMLTextAreaElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const nextTurnIdRef = useRef(1);
    const defaultsRef = useRef({
        caseType: user.defaultCaseType,
        stateName: user.defaultState,
    });

    const active = conversations.find((c) => c.id === activeId) ?? null;
    const turns = active?.turns ?? EMPTY_TURNS;
    const busy = turns.some(
        (t) => t.status === "pending" || t.status === "streaming"
    );

    // Restore history on the client only. Reading localStorage during render
    // would produce different HTML on the server and break hydration.
    useEffect(() => {
        const saved = loadConversations();
        const list = saved.length > 0 ? saved : [createConversation(defaultsRef.current)];
        nextTurnIdRef.current =
            Math.max(0, ...list.flatMap((conversation) => conversation.turns.map((turn) => turn.id))) + 1;
        setConversations(list);
        setActiveId(list[0].id);
        setHydrated(true);
    }, []);

    // Persist, debounced so a streaming answer doesn't hammer localStorage.
    // The `hydrated` guard stops the initial empty state overwriting real data.
    useEffect(() => {
        if (!hydrated) return;
        const timer = setTimeout(() => saveConversations(conversations), 400);
        return () => clearTimeout(timer);
    }, [conversations, hydrated]);

    useEffect(() => {
        const el = taRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [question]);

    // Follow the stream, but only if the user hasn't scrolled away to read.
    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const nearBottom =
            scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 140;
        if (nearBottom) endRef.current?.scrollIntoView({ block: "end" });
    }, [turns]);

    // Switching chats always lands at the newest message.
    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" });
    }, [activeId]);

    function updateConversation(
        id: string,
        fn: (c: Conversation) => Conversation
    ) {
        setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
    }

    function patchTurn(convId: string, turnId: number, changes: Partial<Turn>) {
        updateConversation(convId, (c) => ({
            ...c,
            turns: c.turns.map((t) => (t.id === turnId ? { ...t, ...changes } : t)),
        }));
    }

    // convId and ctx are captured by the caller, so switching chats mid-answer
    // keeps writing deltas into the conversation that asked the question.
    async function runTurn(
        convId: string,
        turnId: number,
        text: string,
        ctx: { caseType: string; stateName: string }
    ) {
        patchTurn(convId, turnId, {
            status: "pending",
            answer: "",
            sources: [],
            error: undefined,
        });

        try {
            let failed = false;

            for await (const ev of streamQuestion({
                question: text,
                state: ctx.stateName.trim() || null,
                case_type: ctx.caseType || null,
            })) {
                if (ev.type === "sources") {
                    patchTurn(convId, turnId, {
                        sources: ev.sources,
                        status: "streaming",
                    });
                } else if (ev.type === "delta") {
                    updateConversation(convId, (c) => ({
                        ...c,
                        turns: c.turns.map((t) =>
                            t.id === turnId
                                ? {
                                    ...t,
                                    status: "streaming" as const,
                                    answer: t.answer + ev.text,
                                }
                                : t
                        ),
                    }));
                } else if (ev.type === "error") {
                    failed = true;
                    patchTurn(convId, turnId, { status: "error", error: ev.detail });
                }
            }

            if (!failed) patchTurn(convId, turnId, { status: "done" });
        } catch (err) {
            patchTurn(convId, turnId, {
                status: "error",
                error: err instanceof Error ? err.message : "Something went wrong.",
            });
        }
    }

    function submit(text: string) {
        const trimmed = text.trim();
        if (!trimmed || !active || busy) return;

        const convId = active.id;
        const turnId = nextTurnIdRef.current;
        nextTurnIdRef.current += 1;
        const ctx = { caseType: active.caseType, stateName: active.stateName };
        const firstQuestion = active.turns.length === 0;

        updateConversation(convId, (c) => ({
            ...c,
            title: firstQuestion ? titleFromQuestion(trimmed) : c.title,
            turns: [
                ...c.turns,
                {
                    id: turnId,
                    question: trimmed,
                    status: "pending",
                    answer: "",
                    sources: [],
                },
            ],
        }));

        setQuestion("");
        setSidebarOpen(false);
        runTurn(convId, turnId, trimmed, ctx);
    }

    function startNewChat() {
        setSidebarOpen(false);

        // Already sitting on an untouched new chat: just focus the box. Stacking
        // up empty conversations is what makes a history list useless.
        if (active && active.turns.length === 0) {
            taRef.current?.focus();
            return;
        }

        const fresh = createConversation(defaultsRef.current)
        setConversations((prev) => [fresh, ...prev]);
        setActiveId(fresh.id);
        setQuestion("");
        taRef.current?.focus();
    }

    function selectChat(id: string) {
        setActiveId(id);
        setQuestion("");
        setSidebarOpen(false);
    }

    function deleteChat(id: string) {
        const remaining = conversations.filter((c) => c.id !== id);

        if (remaining.length === 0) {
            const fresh = createConversation(defaultsRef.current)
            setConversations([fresh]);
            setActiveId(fresh.id);
            return;
        }

        setConversations(remaining);
        if (id === activeId) setActiveId(remaining[0].id);
    }

    function changeContext(changes: Partial<Conversation>) {
        if (!active) return;
        updateConversation(active.id, (c) => ({ ...c, ...changes }));
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <Sidebar
                open={sidebarOpen}  
                user={user}              
                conversations={conversations}
                active={active}
                onNewChat={startNewChat}
                onSelect={selectChat}
                onDelete={deleteChat}
                onContextChange={changeContext}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
                    <div className="flex items-center justify-between px-5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open sidebar"
                                className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-bubble hover:text-ink md:hidden"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4.5 w-4.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                >
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <Scales className="h-5 w-5 text-accent" />
                            <span className="truncate text-sm font-semibold tracking-tight">
                                {turns.length === 0 ? "Legal AI" : active?.title}
                                <span className="ml-2 hidden font-normal text-muted sm:inline">
                                    {turns.length === 0 ? "Indian matrimonial law" : ""}
                                </span>
                            </span>
                        </div>
                        <span className="ml-3 shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                            Information, not advice
                        </span>
                    </div>
                </header>

                <main ref={scrollRef} className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-3xl px-5">
                        {turns.length === 0 ? (
                            <EmptyState onPick={submit} />
                        ) : (
                            <div className="space-y-10 py-10">
                                {turns.map((turn) => (
                                    <TurnBlock
                                        key={turn.id}
                                        turn={turn}
                                        onRetry={() =>
                                            active &&
                                            runTurn(active.id, turn.id, turn.question, {
                                                caseType: active.caseType,
                                                stateName: active.stateName,
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>
                </main>

                <div className="bg-gradient-to-t from-canvas via-canvas to-transparent pt-6">
                    <div className="mx-auto w-full max-w-3xl px-5 pb-4">
                        <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm transition focus-within:border-muted/40">
                            <textarea
                                ref={taRef}
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        submit(question);
                                    }
                                }}
                                rows={1}
                                autoComplete="off"
                                placeholder="Ask about divorce, marriage validity, maintenance…"
                                className="w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none placeholder:text-muted/60"
                            />

                            <div className="mt-2 flex items-center gap-2">
                                <select
                                    value={active?.caseType ?? ""}
                                    onChange={(e) => changeContext({ caseType: e.target.value })}
                                    className="max-w-[190px] truncate rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-muted outline-none hover:text-ink md:hidden"
                                >
                                    {CASE_TYPES.map((c) => (
                                        <option key={c} value={c}>
                                            {c === "" ? "Case type" : c}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    value={active?.stateName ?? ""}
                                    onChange={(e) => changeContext({ stateName: e.target.value })}
                                    autoComplete="off"
                                    placeholder="State"
                                    className="w-24 rounded-lg border border-line bg-canvas px-2 py-1 text-xs text-muted outline-none placeholder:text-muted/60 focus:text-ink md:hidden"
                                />

                                <button
                                    type="button"
                                    onClick={() => submit(question)}
                                    disabled={busy || !question.trim()}
                                    aria-label="Send question"
                                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <p className="mt-2 text-center text-[11px] text-muted">
                            General legal information only — not legal advice. Consult a
                            qualified advocate. Press Enter to send, Shift+Enter for a new line.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
    return (
        <div className="py-20">
            <h1 className="text-2xl font-semibold tracking-tight">
                What would you like to know?
            </h1>
            <p className="mt-2 text-[15px] text-muted">
                Answers are grounded in the Hindu Marriage Act, 1955, with the exact
                sections cited.
            </p>
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onPick(s)}
                        className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-muted transition hover:border-muted/30 hover:text-ink"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}

function TurnBlock({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
    const streaming = turn.status === "streaming";

    return (
        <div>
            <div className="mb-6 flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-bubble px-4 py-2.5 text-[15px] leading-relaxed">
                    {turn.question}
                </p>
            </div>

            {turn.status === "pending" && <Thinking />}

            {turn.status === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <p>{turn.error}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-2 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-red-100"
                    >
                        Try again
                    </button>
                </div>
            )}

            {(streaming || turn.status === "done") && (
                <Answer
                    answer={turn.answer}
                    sources={turn.sources}
                    streaming={streaming}
                />
            )}
        </div>
    );
}

function Thinking() {
    return (
        <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
            {[0, 150, 300].map((delay) => (
                <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/50"
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </div>
    );
}

function Answer({
    answer,
    sources,
    streaming,
}: {
    answer: string;
    sources: SourceDoc[];
    streaming: boolean;
}) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <div>
            <div
                className="prose prose-sm max-w-none dark:prose-invert
                   prose-headings:font-semibold prose-headings:text-ink
                   prose-h2:mt-6 prose-h2:mb-2 prose-h2:text-[15px]
                   prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:text-sm
                   prose-p:my-3 prose-p:text-[15px] prose-p:leading-7 prose-p:text-ink
                   prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5 prose-li:text-[15px] prose-li:leading-7
                   prose-strong:font-semibold prose-strong:text-ink
                   prose-a:text-accent
                   prose-code:rounded prose-code:bg-bubble prose-code:px-1 prose-code:py-0.5
                   prose-code:before:content-none prose-code:after:content-none"
            >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            </div>

            {streaming && (
                <span className="mt-1 inline-block h-4 w-[2px] animate-pulse bg-ink align-middle" />
            )}

            {!streaming && (
                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={copy}
                        className="rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-bubble hover:text-ink"
                    >
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            )}

            {sources.length > 0 && (
                <details className="group mt-4 rounded-xl border border-line bg-surface/60">
                    <summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-medium text-muted hover:text-ink">
                        <span className="inline-block transition group-open:rotate-90">
                            ›
                        </span>{" "}
                        {sources.length} source{sources.length === 1 ? "" : "s"} cited
                    </summary>
                    <ul className="space-y-3 border-t border-line px-4 py-3">
                        {sources.map((s, i) => (
                            <SourceRow key={i} source={s} />
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}

function SourceRow({ source }: { source: SourceDoc }) {
    return (
        <li>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold">{source.title}</span>
                {source.url && (
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[11px] text-accent hover:underline"
                    >
                        Open
                    </a>
                )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{source.citation}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {source.excerpt}…
            </p>
        </li>
    );
}
