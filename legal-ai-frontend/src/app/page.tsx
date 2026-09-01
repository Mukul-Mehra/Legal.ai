import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/dal";
import {
  ArrowRight,
  BookText,
  Gavel,
  Landmark,
  MessageCircle,
  Quote,
  Scales,
  Search,
  ShieldCheck,
} from "@/components/LawIcons";

const EXAMPLES = [
  {
    q: "What are the grounds for divorce under Section 13?",
    tag: "Divorce (contested)",
  },
  {
    q: "How long is the waiting period for a mutual-consent divorce?",
    tag: "Mutual consent",
  },
  {
    q: "When is a marriage void rather than voidable?",
    tag: "Nullity",
  },
  {
    q: "Can maintenance be claimed while a case is still pending?",
    tag: "Maintenance",
  },
];

const STEPS = [
  {
    icon: MessageCircle,
    title: "Ask it the way you'd say it",
    body: "No legal phrasing required. Set your state and case type in the sidebar when they change the answer.",
  },
  {
    icon: Search,
    title: "It searches the Act itself",
    body: "Your question is matched against the text of the statute, not a summary of it, so nothing is invented in between.",
  },
  {
    icon: Quote,
    title: "Read the answer, then the source",
    body: "The reply streams in as it is written, with the sections it relied on quoted underneath so you can check them.",
  },
];

const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90";
const SECONDARY =
  "inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink transition hover:border-muted/40";

export default async function Home() {
  // Swaps the call to action for anyone already signed in. This is the reason
  // the page renders per request rather than statically - see the note below.
  const user = await getCurrentUser();

  return (
    <main>
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Scales className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold tracking-tight">Legal AI</span>
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
              Beta
            </span>
          </div>

          {user ? (
            <Link href="/chat" className={PRIMARY}>
              Open chat
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={SECONDARY}>
                Sign in
              </Link>
              <Link href="/signup" className={PRIMARY}>
                Get started
              </Link>
            </div>
          )}
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-line">
        {/* Watermark. text-ink/5 rather than a fixed grey, so it stays faint
            against the dark canvas too instead of turning into a bright smudge. */}
        <Scales className="pointer-events-none absolute -right-20 -top-8 h-[30rem] w-[30rem] text-ink/5" />

        <div className="relative mx-auto max-w-5xl px-5 py-20 md:py-28">
          <p className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-muted">
            <BookText className="h-3.5 w-3.5 text-accent" />
            Grounded in the Hindu Marriage Act, 1955
          </p>

          <h1 className="max-w-2xl font-serif text-4xl leading-[1.08] tracking-tight md:text-6xl">
            Indian matrimonial law, explained section by section.
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">
            Ask in plain language. Every answer quotes the provision it came
            from, so you can read the section yourself instead of taking a
            chatbot&apos;s word for it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link href={user ? "/chat" : "/signup"} className={PRIMARY}>
              {user ? "Open chat" : "Start asking"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {!user && (
              <Link href="/login" className={SECONDARY}>
                I already have an account
              </Link>
            )}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-[12px] text-muted/80">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            General legal information — not legal advice, and no advocate-client
            relationship.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <Eyebrow n="01">Questions people actually ask</Eyebrow>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((e) => (
            <Link
              key={e.q}
              href={user ? "/chat" : "/signup"}
              className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-muted/40"
            >
              <p className="text-[13px] font-medium leading-snug">{e.q}</p>
              <p className="mt-3 flex items-center text-[11px] text-muted">
                <span className="rounded-full bg-bubble px-2 py-0.5">
                  {e.tag}
                </span>
                <span className="ml-auto text-accent opacity-0 transition group-hover:opacity-100">
                  Ask this →
                </span>
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <Eyebrow n="02">How it works</Eyebrow>

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bubble text-accent">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="font-mono text-[11px] text-muted/60">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-serif text-xl leading-snug">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <Eyebrow n="03">Scope and limits</Eyebrow>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h3 className="mt-3 font-serif text-xl">What it does</h3>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-muted marker:text-accent/50">
              <li>
                Explains provisions of the Hindu Marriage Act, 1955 in plain
                language.
              </li>
              <li>Shows the section text behind each answer, with a citation.</li>
              <li>
                Remembers your chats, and your usual state and case type,
                between visits.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <Gavel className="h-5 w-5 text-muted" />
            <h3 className="mt-3 font-serif text-xl">What it doesn&apos;t</h3>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-muted marker:text-muted/40">
              <li>Give legal advice, or act as your advocate.</li>
              <li>
                Weigh up your specific facts, draft filings, or appear for you.
              </li>
              <li>
                Cover anything beyond the one Act it has read — where it
                can&apos;t answer, it says so.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-bubble/40">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center">
          <Landmark className="mx-auto h-7 w-7 text-accent" />
          <h2 className="mt-5 font-serif text-3xl tracking-tight md:text-4xl">
            Start with one question.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-muted">
            Free while Legal AI is in beta. No card, no waitlist.
          </p>
          <Link
            href={user ? "/chat" : "/signup"}
            className={`mt-7 ${PRIMARY}`}
          >
            {user ? "Open chat" : "Create your account"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Scales className="h-4 w-4 text-muted" />
            <span className="text-xs text-muted">
              Legal AI — Indian matrimonial law
            </span>
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <Link href="/login" className="transition hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="transition hover:text-ink">
              Create account
            </Link>
          </div>
        </div>

        <div className="border-t border-line">
          <p className="mx-auto max-w-5xl px-5 py-5 text-[11px] leading-relaxed text-muted/70">
            Legal AI provides general information about Indian matrimonial law
            drawn from published statutes. It is not legal advice, it does not
            create an advocate-client relationship, and it is no substitute for
            consulting a qualified advocate about your own situation.
          </p>
        </div>
      </footer>
    </main>
  );
}

// The § marker is the one bit of law-specific ornament here, and it earns its
// place: it labels a section the way the source material does.
function Eyebrow({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] text-accent">§ {n}</span>
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
        {children}
      </h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}