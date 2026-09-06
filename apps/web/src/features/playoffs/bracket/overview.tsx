"use client";
import type {
  PlayoffBracketTeam,
  PlayoffSeries
} from "@/contracts/playoffs";
import { TeamLogo } from "@/features/teams/team-logo";
import { summarizePlayoffSeries } from "@/lib/playoff-series";
import { SeriesEmptyState } from './cells';
import { formatCount, formatDecimal, formatPercentage } from './logic';
export function SeriesOverview({
  series,
  isProjection,
}: {
  series: PlayoffSeries;
  isProjection: boolean;
}) {
  const summary = summarizePlayoffSeries(series);
  const teamOneAnalytics = series.teamAnalytics.find(
    (team) => team.nhlTeamId === series.teamOne?.nhlTeamId,
  );
  const teamTwoAnalytics = series.teamAnalytics.find(
    (team) => team.nhlTeamId === series.teamTwo?.nhlTeamId,
  );
  const hasTeamAnalytics = Boolean(teamOneAnalytics && teamTwoAnalytics);

  if (!summary) {
    return (
      <SeriesEmptyState>
        {isProjection
          ? "Series statistics will appear after the matchup begins."
          : "Completed box scores are not available for this series yet."}
      </SeriesEmptyState>
    );
  }

  return (
    <section className="workspace-series-overview" aria-label="Series overview">
      <div className="workspace-series-comparison">
        <ComparisonTeamHeader team={summary.teamOne.team} />
        <span>Series Results</span>
        <ComparisonTeamHeader team={summary.teamTwo.team} align="right" />
        <ComparisonRow
          left={String(summary.teamOne.goals)}
          label="Goals"
          right={String(summary.teamTwo.goals)}
        />
        <ComparisonRow
          left={summary.teamOne.goalsPerGame.toFixed(2)}
          label="Goals Per Game"
          right={summary.teamTwo.goalsPerGame.toFixed(2)}
        />
        <ComparisonRow
          left={formatCount(summary.teamOne.shotsOnGoal)}
          label="Shots On Goal"
          right={formatCount(summary.teamTwo.shotsOnGoal)}
        />
        <ComparisonRow
          left={formatDecimal(summary.teamOne.shotsPerGame)}
          label="Shots Per Game"
          right={formatDecimal(summary.teamTwo.shotsPerGame)}
        />
        <ComparisonRow
          left={formatPercentage(summary.teamOne.shotShare)}
          label="Shot-on-Goal Share"
          right={formatPercentage(summary.teamTwo.shotShare)}
        />
        {hasTeamAnalytics ? (
          <>
            <ComparisonDivider />
            <ComparisonRow
              left={formatDecimal(
                teamOneAnalytics?.allSituations?.expectedGoalsFor ?? null,
              )}
              label="Expected Goals"
              right={formatDecimal(
                teamTwoAnalytics?.allSituations?.expectedGoalsFor ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.allSituations?.expectedGoalsShare ?? null,
              )}
              label="Expected Goal Share"
              right={formatPercentage(
                teamTwoAnalytics?.allSituations?.expectedGoalsShare ?? null,
              )}
            />
            <ComparisonRow
              left={formatDecimal(
                teamOneAnalytics?.fiveOnFive?.expectedGoalsFor ?? null,
              )}
              label="Five-On-Five Expected Goals"
              right={formatDecimal(
                teamTwoAnalytics?.fiveOnFive?.expectedGoalsFor ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.fiveOnFive?.expectedGoalsShare ?? null,
              )}
              label="Five-On-Five Expected Goal Share"
              right={formatPercentage(
                teamTwoAnalytics?.fiveOnFive?.expectedGoalsShare ?? null,
              )}
            />
            <ComparisonRow
              left={formatPercentage(
                teamOneAnalytics?.fiveOnFive?.shotAttemptShare ?? null,
              )}
              label="Five-On-Five Shot-Attempt Share"
              right={formatPercentage(
                teamTwoAnalytics?.fiveOnFive?.shotAttemptShare ?? null,
              )}
            />
          </>
        ) : null}
      </div>
      {hasTeamAnalytics ? (
        <a
          className="workspace-series-data-source"
          href="https://moneypuck.com/"
          target="_blank"
          rel="noreferrer"
        >
          Team analytics: MoneyPuck.com ↗
        </a>
      ) : (
        <p className="workspace-series-overview-note">
          Advanced team metrics are unavailable for this series.
        </p>
      )}
    </section>
  );
}

export function ComparisonTeamHeader({
  team,
  align = "left",
}: {
  team: PlayoffBracketTeam;
  align?: "left" | "right";
}) {
  return (
    <div className={`workspace-series-comparison-team is-${align}`}>
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="tiny"
        decorative
        prominent
      />
      <strong>{team.abbreviation}</strong>
    </div>
  );
}

export function ComparisonRow({
  left,
  label,
  right,
}: {
  left: string;
  label: string;
  right: string;
}) {
  return (
    <div className="workspace-series-stat-row">
      <strong>{left}</strong>
      <span>{label}</span>
      <strong>{right}</strong>
    </div>
  );
}

export function ComparisonDivider() {
  return (
    <div className="workspace-series-comparison-divider">
      <span>Team Analytics</span>
    </div>
  );
}
