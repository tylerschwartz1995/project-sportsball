import Link from "next/link";

import { TeamLogo } from "@/app/_components/team-logo";
import type {
  LeagueTrendSummary,
  StandingsMovementEntry,
} from "@/lib/homepage-insights";

export function HomeStandingsMovement({
  entries,
  seasonId,
}: {
  entries: StandingsMovementEntry[];
  seasonId: number;
}) {
  if (entries.length === 0) {
    return <p className="workspace-home-insight-empty">No standings movement is available.</p>;
  }
  return (
    <div className="workspace-home-movement">
      {entries.map((entry) => (
        <Link
          key={entry.team.nhlTeamId}
          href={`/teams/${entry.team.nhlTeamId}?season=${seasonId}`}
        >
          <span className="workspace-home-movement-rank">{entry.team.leagueRank}</span>
          <TeamLogo
            nhlTeamId={entry.team.nhlTeamId}
            abbreviation={entry.team.teamAbbreviation}
            name={entry.team.teamName}
            size="tiny"
            decorative
          />
          <span className="workspace-home-movement-team">
            <b>{entry.team.teamName}</b>
            <small>{entry.team.points} season points</small>
          </span>
          <span
            className="workspace-home-form"
            aria-label={movementAriaLabel(entry)}
          >
            {entry.recentGamePoints.map((points, index) => (
              <i
                key={`${entry.team.nhlTeamId}-${index}`}
                data-points={points}
                title={`${points} point${points === 1 ? "" : "s"}`}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="workspace-home-movement-change">
            <b>{entry.recentPoints === null ? "—" : `${entry.recentPoints} pts`}</b>
            <small>{formatPointChange(entry.pointsChange)}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function HomeLeagueTrends({
  summary,
  seasonId,
}: {
  summary: LeagueTrendSummary;
  seasonId: number;
}) {
  const resultHref = `/games?season=${seasonId}`;
  return (
    <div className="workspace-home-trends">
      <p>
        Latest {summary.currentSampleSize} completed games
        {summary.currentStartDate && summary.currentEndDate
          ? ` · ${formatDateRange(summary.currentStartDate, summary.currentEndDate)}`
          : ""}
      </p>
      <div className="workspace-home-trend-rows">
        {summary.metrics.map((metric) => (
          <Link key={metric.key} href={resultHref}>
            <span>
              <b>{metric.label}</b>
              <small>Previous {summary.previousSampleSize} games</small>
            </span>
            <strong>{formatTrendValue(metric.current, metric.format)}</strong>
            <em data-direction={trendDirection(metric.change)}>
              {formatTrendChange(metric.change, metric.format)}
            </em>
          </Link>
        ))}
      </div>
      {summary.highestScoringGame ? (
        <Link
          href={`/games/${summary.highestScoringGame.nhlGameId}`}
          className="workspace-home-game-highlight"
        >
          <span>
            <small>Highest-scoring game in the sample</small>
            <b>
              {summary.highestScoringGame.awayTeam.abbreviation} {summary.highestScoringGame.awayTeam.score}–{summary.highestScoringGame.homeTeam.score} {summary.highestScoringGame.homeTeam.abbreviation}
            </b>
          </span>
          View game →
        </Link>
      ) : null}
    </div>
  );
}

function movementAriaLabel(entry: StandingsMovementEntry): string {
  if (entry.recentPoints === null) {
    return `${entry.team.teamName} has ${entry.recentGamePoints.length} games in the current sample`;
  }
  return `${entry.team.teamName} earned ${entry.recentPoints} points in its last ${entry.recentGamePoints.length} games`;
}

function formatPointChange(value: number | null): string {
  if (value === null) return "Need 20 games";
  if (value === 0) return "Same as prior 10";
  return `${value > 0 ? "+" : ""}${value} vs prior 10`;
}

function formatTrendValue(
  value: number | null,
  format: "decimal" | "percentage",
): string {
  if (value === null) return "—";
  return format === "percentage"
    ? `${(value * 100).toFixed(1)}%`
    : value.toFixed(2);
}

function formatTrendChange(
  value: number | null,
  format: "decimal" | "percentage",
): string {
  if (value === null) return "No comparison";
  const formatted =
    format === "percentage"
      ? `${Math.abs(value * 100).toFixed(1)} pp`
      : Math.abs(value).toFixed(2);
  if (value === 0) return "No change";
  return `${value > 0 ? "↑" : "↓"} ${formatted}`;
}

function trendDirection(value: number | null): "up" | "down" | "flat" {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

function formatDateRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(`${start}T00:00:00Z`))}–${formatter.format(new Date(`${end}T00:00:00Z`))}`;
}
