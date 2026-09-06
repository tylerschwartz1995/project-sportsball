import Link from "@/components/ui/exploration-link";
export function AnalyticsGuide({ seasonId }: { seasonId: number }) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-sm leading-6 text-[var(--muted)]">
        <Link
          href={`/analytics/guide?season=${seasonId}`}
          className="mt-3 inline-block font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
        >
          Open the full metric guide →
        </Link>
      </div>
      <a
        href="https://moneypuck.com/"
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] px-4 py-3 text-sm font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
      >
        Data: MoneyPuck.com ↗
      </a>
    </section>
  );
}

export function CoverageNotice() {
  return (
    <p className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-sm leading-6 text-[var(--muted)]">
      MoneyPuck season-summary coverage begins in 2008–09. Earlier seasons
      retain traditional NHL statistics, results, box scores, and play-by-play.
    </p>
  );
}
