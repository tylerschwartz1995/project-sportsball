import {
  gameTypeForPhase,
  type SeasonPhase
} from "@/contracts/season-phase";
import {
  HistoryRecordProgression
} from "@/features/charts/lazy-charts";
import {
  HistoryRecordBook
} from "@/features/history/history-record-book";
import type { ReactNode } from "react";
import { loadHistoryOverview } from '../queries';
export function HistoryHeader({ phase }: { phase: SeasonPhase }) {
  return (
    <header className="workspace-history-header">
      <div className="workspace-history-header-copy">
        <h1>NHL History</h1>
        <p>
          Career, season, peak, and era-adjusted {phase === "regular" ? "regular-season" : "playoff"} records.
        </p>
      </div>
      <details>
        <summary>Data coverage</summary>
        <p>
          Basic scoring, goalie results, and team results begin in 1917–18.
          Later statistics keep their real source cutoffs; unavailable values
          are never treated as zero. Birth-country filters include only known
          profiles, and “Played For” selects whole seasons associated with that
          team rather than attempting to split multi-team season totals.
        </p>
      </details>
    </header>
  );
}

export async function HistoryOverviewContent({ phase }: { phase: SeasonPhase }) {
  const overview = await loadHistoryOverview(gameTypeForPhase(phase));
  return (
    <div className="workspace-history-overview">
      <section className="workspace-history-intro">
        <div><h2>Record Leaders</h2></div>
        <p>Career and single-season leaders for skaters, goalies, and teams.</p>
      </section>
      <HistoryRecordBook overview={overview} phase={phase} />
      <details className="mt-5"><summary>Record Progression</summary><HistoryRecordProgression points={overview.recordProgression} /></details>
    </div>
  );
}

export function HistoryResultsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id="history-results" className="workspace-history-results scroll-mt-6">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
