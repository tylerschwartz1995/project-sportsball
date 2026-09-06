"use client";
import type {
  PlayoffSeriesPlayerStatsPackage
} from "@/contracts/playoffs";
import { useState } from "react";
import { SeriesEmptyState, SeriesLoadingState } from './cells';
import { PlayerStatsView } from './logic';
import { SeriesAdvancedGoalieTable, SeriesAdvancedSkaterTable, SeriesGoalieTable, SeriesSkaterTable } from './tables';
export function SeriesPlayerStats({
  data,
  hasError,
  seasonId,
  onViewChange,
}: {
  data: PlayoffSeriesPlayerStatsPackage | null;
  hasError: boolean;
  seasonId: number;
  onViewChange: () => void;
}) {
  const [view, setView] = useState<PlayerStatsView>("skaters");

  if (hasError) {
    return (
      <SeriesEmptyState>
        Series player statistics are temporarily unavailable.
      </SeriesEmptyState>
    );
  }
  if (!data) return <SeriesLoadingState />;
  if (data.skaters.length === 0 && data.goalies.length === 0) {
    return (
      <SeriesEmptyState>
        Official player statistics are not available for this series.
      </SeriesEmptyState>
    );
  }

  return (
    <section className="workspace-series-player-stats" aria-label="Series player statistics">
      <div className="workspace-series-section-heading">
        <p>Official NHL totals from this series only.</p>
        <StatsViewToggle
          value={view}
          onChange={(nextView) => {
            onViewChange();
            setView(nextView);
          }}
        />
      </div>
      {view === "skaters" ? (
        <SeriesSkaterTable players={data.skaters} seasonId={seasonId} />
      ) : (
        <SeriesGoalieTable players={data.goalies} seasonId={seasonId} />
      )}
    </section>
  );
}

export function SeriesAdvancedStats({
  data,
  hasError,
  seasonId,
  onViewChange,
}: {
  data: PlayoffSeriesPlayerStatsPackage | null;
  hasError: boolean;
  seasonId: number;
  onViewChange: () => void;
}) {
  const [view, setView] = useState<PlayerStatsView>("skaters");

  if (hasError) {
    return (
      <SeriesEmptyState>
        Advanced player analytics are temporarily unavailable.
      </SeriesEmptyState>
    );
  }
  if (!data) return <SeriesLoadingState />;
  if (data.advancedSkaters.length === 0 && data.advancedGoalies.length === 0) {
    return (
      <SeriesEmptyState>
        Advanced player analytics are unavailable for this series. MoneyPuck
        playoff shot coverage begins in 2007–08.
      </SeriesEmptyState>
    );
  }

  return (
    <section
      className="workspace-series-player-stats"
      aria-label="Series advanced player analytics"
    >
      <div className="workspace-series-section-heading">
        <p>MoneyPuck shot-model results from this series only.</p>
        <StatsViewToggle
          value={view}
          onChange={(nextView) => {
            onViewChange();
            setView(nextView);
          }}
        />
      </div>
      {view === "skaters" ? (
        <SeriesAdvancedSkaterTable
          players={data.advancedSkaters}
          seasonId={seasonId}
        />
      ) : (
        <SeriesAdvancedGoalieTable
          players={data.advancedGoalies}
          seasonId={seasonId}
        />
      )}
      <a
        className="workspace-series-data-source"
        href="https://moneypuck.com/"
        target="_blank"
        rel="noreferrer"
      >
        Data: MoneyPuck.com ↗
      </a>
    </section>
  );
}

export function StatsViewToggle({
  value,
  onChange,
}: {
  value: PlayerStatsView;
  onChange: (view: PlayerStatsView) => void;
}) {
  return (
    <div className="workspace-series-stats-toggle" role="group" aria-label="Player type">
      <button
        type="button"
        className={value === "skaters" ? "is-active" : ""}
        aria-pressed={value === "skaters"}
        onClick={() => onChange("skaters")}
      >
        Skaters
      </button>
      <button
        type="button"
        className={value === "goalies" ? "is-active" : ""}
        aria-pressed={value === "goalies"}
        onClick={() => onChange("goalies")}
      >
        Goalies
      </button>
    </div>
  );
}
