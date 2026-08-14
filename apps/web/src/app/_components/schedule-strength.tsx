import { ScheduleStrengthMetricControl } from "@/app/_components/schedule-strength-metric-control";
import { ScheduleStrengthTable } from "@/app/_components/schedule-strength-table";
import { MetricTile, SectionHeader } from "@/app/_components/ui-primitives";
import type { ScheduleStrengthGame, TeamScheduleStrength } from "@/contracts/schedule-strength";
import {
  difficultyLabel,
  formatScheduleStrengthMetric,
  scheduleStrengthMetricDefinitions,
  scheduleStrengthMetricOptions,
  scheduleStrengthMetricValue,
} from "@/lib/schedule-strength-metrics";

export function ScheduleStrength({
  data,
  metric,
}: {
  data: TeamScheduleStrength;
  metric: (typeof scheduleStrengthMetricOptions)[number];
}) {
  const completed: ScheduleStrengthGame[] = [];
  const upcoming: ScheduleStrengthGame[] = [];
  for (const game of data.games) {
    (game.completed ? completed : upcoming).push(game);
  }

  return (
    <section
      id="schedule-strength"
      className="workspace-schedule-strength mt-12 scroll-mt-6"
      data-strength-metric={metric}
      data-sort-variant={metric}
    >
      <SectionHeader eyebrow="Schedule context" title="Strength of Schedule" />
      <ScheduleStrengthMetricControl
        key={`${data.seasonId}-${metric}`}
        initialMetric={metric}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ScheduleSummary title="Completed schedule" games={completed} />
        <ScheduleSummary title="Remaining schedule" games={upcoming} />
      </div>

      {upcoming.length > 0 ? (
        <ScheduleStrengthTable
          title="Remaining games"
          games={upcoming}
          seasonId={data.seasonId}
          open
        />
      ) : null}

      {completed.length > 0 ? (
        <ScheduleStrengthTable
          title="Completed games"
          games={[...completed].reverse()}
          seasonId={data.seasonId}
        />
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Ratings use only an opponent&apos;s earlier regular-season games. Rest is
        the number of full off-days since this team&apos;s previous game; a
        back-to-back has no full off-day. Until an opponent has a result in the
        selected season, its rating falls back to the previous stored season.
        Travel uses great-circle distance between each game&apos;s home market,
        beginning at the selected team&apos;s home market. Because the schedule
        source does not retain venue coordinates, neutral-site games and arena
        changes are estimates rather than exact itineraries.
      </p>
    </section>
  );
}

function ScheduleSummary({
  title,
  games,
}: {
  title: string;
  games: ScheduleStrengthGame[];
}) {
  const summaries = Object.fromEntries(
    scheduleStrengthMetricOptions.map((metric) => [
      metric,
      { count: 0, total: 0 },
    ]),
  ) as Record<
    (typeof scheduleStrengthMetricOptions)[number],
    { count: number; total: number }
  >;
  let homeGames = 0;
  let backToBacks = 0;
  let totalTravel = 0;
  let travelLegs = 0;

  for (const game of games) {
    if (game.isHome) homeGames += 1;
    if (game.isBackToBack) backToBacks += 1;
    if (game.travelDistanceKm !== null) {
      totalTravel += game.travelDistanceKm;
      travelLegs += 1;
    }
    for (const metric of scheduleStrengthMetricOptions) {
      const value = scheduleStrengthMetricValue(game, metric);
      if (value !== null) {
        summaries[metric].count += 1;
        summaries[metric].total += value;
      }
    }
  }

  return (
    <article className="surface-panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="text-sm tabular-nums text-slate-500">
          {games.length} games
        </span>
      </div>
      <dl className="mt-4 grid flex-1 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3">
        {scheduleStrengthMetricOptions.map((metric) => {
          const summary = summaries[metric];
          const average =
            summary.count > 0 ? summary.total / summary.count : null;
          return (
            <div
              key={metric}
              data-strength-tile={metric}
            >
              <MetricTile
                label={`Avg. ${scheduleStrengthMetricDefinitions[metric].shortLabel}`}
                value={formatScheduleStrengthMetric(average, metric)}
                detail={
                  average === null
                    ? "No rated games"
                    : `${difficultyLabel(average, metric)} · ${summary.count} rated`
                }
                emphasis
              />
            </div>
          );
        })}
        <MetricTile
          label="Home share"
          value={games.length > 0 ? formatPercentage(homeGames / games.length) : "—"}
          detail={`${homeGames} home · ${games.length - homeGames} away`}
        />
        <MetricTile
          label="Back-to-backs"
          value={backToBacks}
          detail="No full off-day"
        />
        <MetricTile
          label="Estimated travel"
          value={travelLegs > 0 ? formatDistance(totalTravel) : "—"}
          detail={
            travelLegs > 0
              ? `${formatDistance(totalTravel / travelLegs)} per mapped leg`
              : "No mapped travel legs"
          }
        />
        {scheduleStrengthMetricOptions.map((metric) => (
          <div key={metric} data-strength-tile={metric}>
            <MetricTile
              label="Rated games"
              value={summaries[metric].count}
              detail={`${games.length - summaries[metric].count} without prior sample`}
            />
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDistance(value: number): string {
  return `${Math.round(value).toLocaleString("en-CA")} km`;
}
