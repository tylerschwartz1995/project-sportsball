"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-20">
      <section className="workspace-system-state">
        <p className="workspace-eyebrow">Page unavailable</p>
        <h1>We couldn’t load this page.</h1>
        <p>
          The data service may still be starting or the connection may have
          been interrupted. You can retry now or return to the homepage.
        </p>
        <div className="workspace-system-actions">
          <button type="button" onClick={reset}>
            Try Again
          </button>
          <Link href="/">Return Home</Link>
        </div>
      </section>
    </main>
  );
}
