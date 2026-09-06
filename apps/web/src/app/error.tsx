"use client";

import { Suspense } from "react";
import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { IntentLink as Link } from "@/components/ui/intent-link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-20">
      <section className="workspace-system-state">
        <p className="workspace-eyebrow">Page unavailable</p>
        <h1>We couldn’t load this page.</h1>
        <p>
          Try again or return to the homepage.
        </p>
        <div className="workspace-system-actions">
          <button type="button" onClick={reset}>
            Try Again
          </button>
          <Link href="/">Return Home</Link>
        </div>
      </section>
      <Suspense><NavigationComplete /></Suspense>
    </main>
  );
}
