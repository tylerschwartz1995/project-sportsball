import Link from "next/link";

import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { MetricTile, SectionHeader } from "@/app/_components/ui-primitives";
import type {
  ScheduleStrengthGame,
  ScheduleStrengthMetric,
  TeamScheduleStrength,
} from "@/contracts/schedule-strength";

const metricDefinitions: Record<
  ScheduleStrengthMetric,
  { label: string; shortLabel: string; description: string }
> = {
  standings: {
    label: "Standings-based",
    shortLabel: "Points %",
    description:
      "Opponent points percentage before each game. Higher values mean a harder schedule.",
  },
  "goal-differential": {
    label: "Goal differential",
    shortLabel: "Goal diff. / game",
    description:
      "Opponent goal differential per prior game. Higher values mean a harder schedule.",
  },
  "expected-goals": {
    label: "Expected goals",
    shortLabel: "5v5 xG%",
    description:
      "Opponent five-on-five expected-goal share before each game. Higher values mean a harder schedule.",
  },
};

export function ScheduleStrength({
  data,
  metric,
  phase,
}: {
  data: TeamScheduleStrength;
  metric: ScheduleStrengthMetric;
  phase: string;
}) {
  const completed = data.games.filter((game) => game.completed);
  const upcoming = data.games.filter((game) => !game.completed);
  const definition = metricDefinitions[metric];

  return (
    <section id="schedule-strength" className="mt-12 scroll-mt-6">
      <SectionHeader
        eyebrow="Schedule context"
        title="Strength of Schedule"
        description={`${definition.description} Completed-game ratings are frozen at the matchup date; remaining-game ratings use only results available now.`}
      />

      <nav
        className="workspace-standings-scope mt-5"
        aria-label="Strength of schedule definition"
      >
        {(Object.keys(metricDefinitions) as ScheduleStrengthMetric[]).map(
          (option) => (
            <Link
              key={option}
              href={`/teams/${data.teamNhlId}?season=${data.seasonId}&phase=${phase}&sos=${option}#schedule-strength`}
              aria-current={metric === option ? "page" : undefined}
            >
              {metricDefinitions[option].label}
            </Link>
          ),
        )}
      </nav>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ScheduleSummary
          title="Completed schedule"
          games={completed}
          metric={metric}
        />
        <ScheduleSummary
          title="Remaining schedule"
          games={upcoming}
          metric={metric}
        />
      </div>

      {upcoming.length > 0 ? (
        <ScheduleGamesTable
          title="Remaining games"
          games={upcoming}
          metric={metric}
          seasonId={data.seasonId}
          open
        />
      ) : null}

      {completed.length > 0 ? (
        <ScheduleGamesTable
          title="Completed games"
          games={[...completed].reverse()}
          metric={metric}
          seasonId={data.seasonId}
        />
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Ratings use only an opponent&apos;s earlier regular-season games. Rest is
        the number of full off-days since this team&apos;s previous game; a
        back-to-back has no full off-day. Until an opponent has a result in the
        selected season, its rating falls back to the previous stored season.
      </p>
    </section>
  );
}

function ScheduleSummary({
  title,
  games,
  metric,
}: {
  title: string;
  games: ScheduleStrengthGame[];
  metric: ScheduleStrengthMetric;
}) {
  const rated = games
    .map((game) => metricValue(game, metric))
    .filter((value): value is number => value !== null);
  const average =
    rated.length > 0
      ? rated.reduce((total, value) => total + value, 0) / rated.length
      : null;
  const homeGames = games.filter((game) => game.isHome).length;
  const backToBacks = games.filter((game) => game.isBackToBack).length;

  return (
    <article className="surface-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-semibold text-white">{title}</h4>
        <span className="text-sm tabular-nums text-slate-500">
          {games.length} games
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={`Avg. ${metricDefinitions[metric].shortLabel}`}
          value={formatMetric(average, metric)}
          detail={
            average === null
              ? "No rated games"
              : `${difficultyLabel(average, metric)} · ${rated.length} rated`
          }
          emphasis
        />
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
          label="Rated games"
          value={rated.length}
          detail={`${games.length - rated.length} without prior sample`}
        />
      </dl>
    </article>
  );
}

function ScheduleGamesTable({
  title,
  games,
  metric,
  seasonId,
  open = false,
}: {
  title: string;
  games: ScheduleStrengthGame[];
  metric: ScheduleStrengthMetric;
  seasonId: number;
  open?: boolean;
}) {
  return (
    <details className="surface-panel mt-5 overflow-hidden" open={open}>
      <summary className="cursor-pointer px-5 py-4 font-medium text-white marker:text-cyan-300">
        {title} <span className="ml-2 text-sm text-slate-500">({games.length})</span>
      </summary>
      <SortableTable defaultSortKey="date" defaultDirection={open ? "asc" : "desc"}>
        <div className="workspace-table-scroll border-t border-white/[0.07]">
          <table className="workspace-table min-w-[800px]">
            <thead>
              <tr>
                <SortableHeader label="Date" sortKey="date" align="left" defaultDirection="asc" />
                <SortableHeader label="Opponent" sortKey="opponent" align="left" defaultDirection="asc" />
                <SortableHeader label="Site" sortKey="site" align="left" defaultDirection="asc" />
                <SortableHeader label={metricDefinitions[metric].shortLabel} sortKey="strength" />
                <SortableHeader label="Prior GP" sortKey="sample" />
                <SortableHeader label="Rest" sortKey="rest" />
                <SortableHeader label="Result" sortKey="result" align="left" />
              </tr>
            </thead>
            <tbody>
              {games.map((game) => {
                const strength = metricValue(game, metric);
                const ratingSeasonId = metricRatingSeasonId(game, metric);
                const result = game.completed
                  ? `${game.teamScore! > game.opponentScore! ? "W" : "L"} ${game.teamScore}–${game.opponentScore}`
                  : scheduleStateLabel(game.state);
                return (
                  <tr key={game.nhlGameId}>
                    <td data-sort-value={game.startTimeUtc}>
                      <Link href={`/games/${game.nhlGameId}`}>
                        {formatDate(game.startTimeUtc)}
                      </Link>
                    </td>
                    <td data-sort-value={game.opponentName} className="workspace-team-cell">
                      <div className="flex items-center gap-2">
                        <TeamLogo
                          nhlTeamId={game.opponentNhlTeamId}
                          abbreviation={game.opponentAbbreviation}
                          name={game.opponentName}
                          size="compact"
                          decorative
                        />
                        <div>
                          <Link href={`/teams/${game.opponentNhlTeamId}?season=${seasonId}`}>
                            {game.opponentName}
                          </Link>
                          <small>{game.opponentAbbreviation}</small>
                        </div>
                      </div>
                    </td>
                    <td data-sort-value={game.isHome ? "home" : "away"}>
                      {game.isHome ? "Home" : "Away"}
                    </td>
                    <td data-sort-value={strength ?? ""} className="text-right font-medium tabular-nums text-cyan-100">
                      {formatMetric(strength, metric)}
                    </td>
                    <td data-sort-value={game.opponentPriorGames} className="text-right tabular-nums">
                      {game.opponentPriorGames}
                      {ratingSeasonId !== null && ratingSeasonId !== seasonId ? (
                        <span
                          className="ml-1 text-slate-500"
                          title={`Rating uses the ${formatSeasonId(ratingSeasonId)} season`}
                        >
                          *
                        </span>
                      ) : null}
                    </td>
                    <td data-sort-value={game.restDays ?? ""} className="text-right tabular-nums">
                      {game.isBackToBack ? "B2B" : game.restDays === null ? "—" : `${game.restDays}d`}
                    </td>
                    <td data-sort-value={result}>{result}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SortableTable>
    </details>
  );
}

function metricValue(
  game: ScheduleStrengthGame,
  metric: ScheduleStrengthMetric,
): number | null {
  if (metric === "goal-differential") {
    return game.opponentGoalDifferentialPerGame;
  }
  if (metric === "expected-goals") {
    return game.opponentExpectedGoalsPercentage;
  }
  return game.opponentPointsPercentage;
}

function metricRatingSeasonId(
  game: ScheduleStrengthGame,
  metric: ScheduleStrengthMetric,
): number | null {
  return metric === "expected-goals"
    ? game.opponentExpectedGoalsSeasonId
    : game.opponentResultsSeasonId;
}

function formatMetric(
  value: number | null,
  metric: ScheduleStrengthMetric,
): string {
  if (value === null) return "—";
  if (metric === "goal-differential") {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
  }
  if (metric === "standings") return value.toFixed(3).replace(/^0/, "");
  return formatPercentage(value);
}

function difficultyLabel(
  value: number,
  metric: ScheduleStrengthMetric,
): string {
  const normalized =
    metric === "goal-differential" ? 0.5 + value / 4 : value;
  if (normalized >= 0.56) return "Very difficult";
  if (normalized >= 0.52) return "Difficult";
  if (normalized > 0.48) return "Balanced";
  if (normalized > 0.44) return "Favorable";
  return "Very favorable";
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

function formatSeasonId(seasonId: number): string {
  const start = Math.floor(seasonId / 10_000);
  const end = seasonId % 10_000;
  return `${start}–${String(end).slice(2)}`;
}

function scheduleStateLabel(state: string): string {
  if (state === "FUT" || state === "PRE") return "Scheduled";
  if (state === "LIVE" || state === "CRIT") return "Live";
  return state;
}
