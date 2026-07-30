"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-20">
      <section className="w-full rounded-3xl border border-red-300/20 bg-red-300/10 p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-red-200">
          Data connection unavailable
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          We couldn’t load the league dashboard.
        </h1>
        <p className="mt-4 leading-7 text-slate-300">
          PostgreSQL may still be starting, or the web database connection may
          need configuration.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-950"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
