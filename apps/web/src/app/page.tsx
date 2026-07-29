const foundationItems = [
  {
    label: "Data coverage",
    value: "2005–06 onward",
    detail: "Schedules, results, box scores, and traditional statistics",
  },
  {
    label: "Advanced analytics",
    value: "2007–08 onward",
    detail: "Polars-first processing of approved MoneyPuck downloads",
  },
  {
    label: "Update cadence",
    value: "Daily",
    detail: "Audited, idempotent imports with recent-game corrections",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <span className="text-lg font-semibold tracking-tight text-white">
          Sportsball
        </span>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan-100">
          Foundation
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-20 sm:py-28">
        <p className="mb-5 font-mono text-sm uppercase tracking-[0.2em] text-cyan-300">
          NHL data, built to be questioned
        </p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-7xl">
          The league, from the box score to the model.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
          A transparent home for current and historical NHL statistics,
          advanced analytics, and eventually point-in-time predictions.
        </p>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {foundationItems.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
            >
              <p className="text-sm font-medium text-slate-400">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {item.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-sm text-slate-500">
        Data-source attribution and live statistics will appear as ingestion
        milestones are completed.
      </footer>
    </main>
  );
}
