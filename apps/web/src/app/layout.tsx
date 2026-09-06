import { IntentLink as Link } from "@/components/ui/intent-link";
import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NavigationMetrics } from "@/components/shell/navigation-metrics";
import { ScrollNavigation } from "@/components/shell/scroll-navigation";
import { WebVitals } from "@/components/shell/web-vitals";
import "@/styles/index.css";

const interfaceFont = Manrope({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBootstrap = `
(function () {
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
      className={`${interfaceFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WebVitals />
        <NavigationMetrics />
        <ScrollNavigation />
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
        <footer className="site-footer">
          <Link href="/" className="site-footer-brand">Sportsball</Link>
          <p>NHL statistics · MoneyPuck advanced data</p>
          <Link href="/analytics/guide">Metrics Guide →</Link>
        </footer>
      </body>
    </html>
  );
}
