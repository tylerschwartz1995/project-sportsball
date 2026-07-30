import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script
          id="sportsball-theme-bootstrap"
          strategy="beforeInteractive"
        >
          {themeBootstrap}
        </Script>
        {children}
      </body>
    </html>
  );
}
