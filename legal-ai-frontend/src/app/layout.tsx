import type { Metadata } from "next";
import { Geist, Geist_Mono,Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legal AI — Indian Matrimonial Law",
  description:
    "Ask questions about Indian matrimonial law, grounded in real statutes. Legal information, not legal advice.",
};

// Runs synchronously while the browser is still parsing <head>, before a single
// pixel is painted. That ordering is the whole point: doing this in a React
// effect instead would paint the light theme first and flash on every load.
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem("legal-ai:theme");
    var theme =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    // localStorage can throw in private mode. The data-theme="light" default
    // in the JSX below is already correct, so there is nothing to do.
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme="light" is the server default so the CSS always has a theme to
    // match. suppressHydrationWarning because the script above changes that
    // attribute before React hydrates - the mismatch is intentional.
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
       className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink">
        {children}
      </body>
    </html>
  );
}