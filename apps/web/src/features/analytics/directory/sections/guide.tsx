import Link from "@/components/ui/exploration-link";
export function AnalyticsGuide({ seasonId }: { seasonId: number }) {
  return (
    <aside className="reference-source" aria-label="Statistics sources and help">
      <span>Advanced data from <a href="https://moneypuck.com/" target="_blank" rel="noreferrer">MoneyPuck ↗</a></span>
      <Link href={`/analytics/guide?season=${seasonId}`}>Metric definitions →</Link>
    </aside>
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
