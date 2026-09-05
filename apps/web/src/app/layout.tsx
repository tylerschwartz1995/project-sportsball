import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Barlow_Condensed, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { WebVitals } from "@/app/_components/web-vitals";
import "./globals.css";
import "./editorial.css";
import "./style-studio.css";
import { palettes, typefaces, paletteStorageKey, typefaceStorageKey } from "@/lib/appearance";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
});
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  preload: false,
});
const grotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  preload: false,
});

const themeBootstrap = `
(function () {
  try {
    var palette = localStorage.getItem(${JSON.stringify(paletteStorageKey)});
    var typeface = localStorage.getItem(${JSON.stringify(typefaceStorageKey)});
    document.documentElement.dataset.palette = ${JSON.stringify(palettes.map((option) => option.id))}.includes(palette) ? palette : "copper";
    document.documentElement.dataset.typeface = ${JSON.stringify(typefaces.map((option) => option.id))}.includes(typeface) ? typeface : "georgia";
  } catch (_) {
    document.documentElement.dataset.palette = "copper";
    document.documentElement.dataset.typeface = "georgia";
  }
  try {
    var stored = localStorage.getItem("sportsball-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: "Sportsball",
    template: "%s | Sportsball",
  },
  description:
    "Current and historical NHL statistics, results, and advanced analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${barlow.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WebVitals />
        <a className="workspace-skip-link" href="#main-content">
          Skip to Main Content
        </a>
        <Script
          id="sportsball-theme-bootstrap"
          strategy="beforeInteractive"
        >
          {themeBootstrap}
        </Script>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer className="record-footer">
          <Link href="/" className="record-footer-brand">Sportsball.</Link>
          <p>Hockey, on the record.<span>Official NHL statistics · MoneyPuck advanced data</span></p>
          <Link href="/analytics/guide">A Guide to the Numbers ↗</Link>
        </footer>
      </body>
    </html>
  );
}
