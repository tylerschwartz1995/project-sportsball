import { TableScroll } from "@/components/ui/table-scroll";
import { ContextLink as Link } from "@/components/ui/context-link";
import { DeferredSection } from "@/components/ui/deferred-section";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { WorkspaceModal } from "@/components/ui/workspace-modal";
import { WorkspacePanel } from "@/components/ui/workspace-primitives";
import type { DraftAnalytics, DraftPlayerOutcome, DraftTeamPerformance } from "@/contracts/draft";
import { TeamDraftingVisuals } from "@/features/charts/lazy-charts";
import { MetricCell, NumberCell } from "@/features/drafts/cells";
import { DraftRangeFilter } from "@/features/drafts/filters";
import { formatPercentage, formatSignedDecimal, formatSignedNumber } from "@/features/drafts/logic";
import { TeamLogo } from "@/features/teams/team-logo";
import { formatPlayerPosition } from "@/lib/player-position";

export const teamPerformanceColumns = [
  {
    label: "Team",
    sortKey: "team",
    align: "left",
    defaultDirection: "asc",
    description: "Club recorded as making each selection",
  },
  {
    label: "Picks",
    sortKey: "selections",
    description: "Official selections in the chosen draft window",
  },
  {
    label: "NHL Rate",
    sortKey: "appearance-rate",
    description: "Share of selections who played at least one NHL game",
  },
  {
    label: "100+ Rate",
    sortKey: "hundred-rate",
    description: "Share of selections who reached 100 NHL games",
  },
  {
    label: "GP per Pick",
    sortKey: "average",
    description: "Average regular-season NHL games per selection",
  },
  {
    label: "Value +/-",
    sortKey: "value",
    description:
      "Average games above or below players from the same draft year and similar overall-pick range",
  },
  {
    label: "Late Hit Rate",
    sortKey: "late-rate",
    description:
      "Share of round-four-or-later selections who reached 100 games",
  },
  {
    label: "Goalie Hit Rate",
    sortKey: "goalie-rate",
    description: "Share of drafted goalies who reached 50 NHL games",
  },
  {
    label: "GS / Skater Pick",
    sortKey: "game-score",
    description:
      "Stored career MoneyPuck Game Score divided by skater selections; unavailable when NHL skater coverage is missing",
  },
] as const;

export const teamPickOutcomeColumns = [
  {
    label: "Draft",
    sortKey: "draft",
    align: "left",
    defaultDirection: "desc",
    description: "Draft year",
  },
  {
    label: "Pick",
    sortKey: "pick",
    description: "Overall selection and round",
  },
  {
    label: "Player",
    sortKey: "player",
    align: "left",
    defaultDirection: "asc",
    description: "Selected player",
  },
  {
    label: "Pos",
    sortKey: "position",
    description: "Drafted position",
  },
  {
    label: "GP",
    sortKey: "games",
    description: "Career regular-season NHL games",
  },
  {
    label: "PTS",
    sortKey: "points",
    description: "Career points for skaters",
  },
  {
    label: "Wins",
    sortKey: "wins",
    description: "Career wins for goalies",
  },
  {
    label: "Game Score",
    sortKey: "game-score",
    description: "Stored cumulative MoneyPuck Game Score for skaters",
  },
  {
    label: "GSAx",
    sortKey: "gsax",
    description: "Stored career goals saved above expected for goalies",
  },
] as const;

export function TeamDraftingView({
  analytics,
  selectedTeam,
}: {
  analytics: DraftAnalytics;
  selectedTeam: string;
}) {
  const selectedTeamPerformance = analytics.teamPerformance.find(
    (team) => team.teamAbbreviation === selectedTeam,
  );
  const selectedTeamPicks = selectedTeam
    ? analytics.outcomes.filter(
        (outcome) => outcome.draftTeamAbbreviation === selectedTeam,
      ).sort((left, right) => right.careerGames - left.careerGames)
    : [];

  return (
    <>
      <DraftRangeFilter
        years={analytics.draftYears}
        fromYear={analytics.selectedFromYear}
        toYear={analytics.selectedToYear}
        matureThrough={analytics.latestMatureDraftYear}
        selectedTeam={selectedTeam}
      />

      {analytics.teamPerformance.length > 0 ? (
        <>
          <div id="team-rankings">
            <WorkspacePanel
              className="mt-7"
              title="Team Drafting"
              description={`Comparing every selection from ${analytics.selectedFromYear ?? "—"} through ${analytics.selectedToYear ?? "—"}. Team rankings and linked pick outcomes use this same draft window. The default window uses the ten most recent draft classes with at least five seasons of observation.`}
            >
              <TeamPerformanceTable
                rows={analytics.teamPerformance}
                fromYear={analytics.selectedFromYear}
                toYear={analytics.selectedToYear}
              />
            </WorkspacePanel>
          </div>
          {selectedTeamPerformance ? (
            <TeamPickOutcomesPanel
              team={selectedTeamPerformance}
              picks={selectedTeamPicks}
              fromYear={analytics.selectedFromYear}
              toYear={analytics.selectedToYear}
            />
          ) : null}
          <DeferredSection title="Team Comparison Charts"><TeamDraftingVisuals
            rows={analytics.teamPerformance}
            fromYear={analytics.selectedFromYear}
            toYear={analytics.selectedToYear}
          /></DeferredSection>
        </>
      ) : (
        <div className="workspace-empty-state mt-7">
          No team drafting results are available for this range.
        </div>
      )}

      {analytics.latestMatureDraftYear !== null ? (
        <p className="workspace-draft-range-note is-footer">
          <strong>
            Why comparisons stop at {analytics.latestMatureDraftYear}:
          </strong>{" "}
          it is the latest draft class with at least five NHL seasons in the
          stored outcomes. Newer classes remain available in Player Outcomes,
          but excluding them here avoids treating unfinished development as
          poor drafting.
        </p>
      ) : null}
    </>
  );
}

export function TeamPerformanceTable({
  rows,
  fromYear,
  toYear,
}: {
  rows: DraftTeamPerformance[];
  fromYear: number | null;
  toYear: number | null;
}) {
  return (
    <SortableTable secondaryColumns={[6, 7, 8, 9]} defaultSortKey="hundred-rate">
      <TableScroll className="workspace-table-scroll">
        <table className="workspace-table workspace-table-dense min-w-[1320px]">
          <thead>
            <tr>
              {teamPerformanceColumns.map((column) => (
                <SortableHeader key={column.sortKey} {...column} nowrap />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((team) => (
              <tr key={team.teamAbbreviation}>
                <td className="workspace-team-cell">
                  <div>
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo abbreviation={team.teamAbbreviation} size="tiny" decorative />
                      {team.teamNhlId === null ? (
                        <strong>{team.teamName}</strong>
                      ) : (
                        <Link href={`/teams/${team.teamNhlId}`}>{team.teamName}</Link>
                      )}
                    </span>
                    <small>
                      <Link
                        href={`/drafts?view=teams&from=${fromYear ?? ""}&to=${toYear ?? ""}&team=${team.teamAbbreviation}`}
                        scroll={false}
                      >
                        {team.teamAbbreviation} picks & outcomes →
                      </Link>
                    </small>
                  </div>
                </td>
                <NumberCell value={team.selections} />
                <NumberCell value={formatPercentage(team.appearanceRate)} />
                <NumberCell value={formatPercentage(team.hundredGameRate)} />
                <NumberCell value={Math.round(team.averageGames)} />
                <NumberCell value={formatSignedNumber(team.valueAboveExpected)} />
                <NumberCell value={formatPercentage(team.lateRoundHitRate)} />
                <NumberCell
                  value={
                    team.goalieHitRate === null
                      ? "—"
                      : formatPercentage(team.goalieHitRate)
                  }
                />
                <NumberCell
                  value={
                    team.gameScorePerSkaterPick === null
                      ? "—"
                      : Math.round(team.gameScorePerSkaterPick)
                  }
                />
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      <div className="workspace-table-note">
        Rates use every official selection in the chosen window as the denominator.
        Late hits are round-four-or-later selections with at least 100 games;
        goalie hits require 50 games. Value +/- compares career games with the
        same draft year and a similar overall-pick range. Game Score uses
        stored all-situations skater data from{" "}
        <a href="https://moneypuck.com" target="_blank" rel="noreferrer">
          MoneyPuck.com
        </a>{" "}
        from 2008–09 onward; incomplete NHL-skater coverage is shown as
        unavailable.
      </div>
    </SortableTable>
  );
}

export function TeamPickOutcomesPanel({
  team,
  picks,
  fromYear,
  toYear,
}: {
  team: DraftTeamPerformance;
  picks: DraftPlayerOutcome[];
  fromYear: number | null;
  toYear: number | null;
}) {
  const windowLabel = `${fromYear ?? "—"}–${toYear ?? "—"}`;

  return (
    <WorkspaceModal
      title={`${team.teamName} Picks & Outcomes`}
      description={`${windowLabel} · Career outcomes for the ${picks.length} selections used in the team ranking.`}
      closeHref={`/drafts?view=teams&from=${fromYear ?? ""}&to=${toYear ?? ""}#team-rankings`}
    >
      <TeamPickOutcomesTable rows={picks} />
      <div className="workspace-table-note">
        GP, points, and wins are career regular-season totals. Game Score is
        shown for skaters and goals saved above expected (GSAx) for goalies when
        stored MoneyPuck coverage is available. Missing advanced data is shown
        as unavailable, not zero.
      </div>
    </WorkspaceModal>
  );
}

export function TeamPickOutcomesTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <SortableTable
      defaultSortKey="games"
      className="workspace-team-picks-table-shell"
    >
      <TableScroll className="workspace-table-scroll workspace-team-picks-scroll">
        <table className="workspace-table workspace-table-dense workspace-team-picks-table">
          <colgroup>
            <col className="workspace-team-pick-year-col" />
            <col className="workspace-team-pick-number-col" />
            <col className="workspace-team-pick-player-col" />
            <col className="workspace-team-pick-position-col" />
            <col className="workspace-team-pick-stat-col" />
            <col className="workspace-team-pick-stat-col" />
            <col className="workspace-team-pick-stat-col" />
            <col className="workspace-team-pick-game-score-col" />
            <col className="workspace-team-pick-gsax-col" />
          </colgroup>
          <thead>
            <tr>
              {teamPickOutcomeColumns.map((column) => (
                <SortableHeader key={column.sortKey} {...column} nowrap />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => {
              const isGoalie = player.position?.toUpperCase() === "G";
              return (
                <tr key={`${player.draftYear}-${player.draftOverallPick}`}>
                  <td data-sort-value={player.draftYear}>
                    <Link href={`/drafts?view=outcomes&year=${player.draftYear}`}>
                      {player.draftYear}
                    </Link>
                  </td>
                  <td data-sort-value={player.draftOverallPick}>
                    <strong>#{player.draftOverallPick}</strong>
                    <small className="workspace-team-pick-round">
                      R{player.draftRound}
                    </small>
                  </td>
                  <td className="workspace-team-cell" data-sort-value={player.name}>
                    <div>
                      {player.nhlPlayerId === null ? (
                        <strong>{player.name}</strong>
                      ) : (
                        <Link href={`/players/${player.nhlPlayerId}`}>
                          {player.name}
                        </Link>
                      )}
                      {player.amateurClubName ? (
                        <small>{player.amateurClubName}</small>
                      ) : null}
                    </div>
                  </td>
                  <td data-sort-value={formatPlayerPosition(player.position)}>
                    {formatPlayerPosition(player.position)}
                  </td>
                  <MetricCell value={player.careerGames} />
                  <MetricCell value={isGoalie ? null : player.careerPoints} />
                  <MetricCell value={isGoalie ? player.careerWins : null} />
                  <MetricCell
                    value={isGoalie ? null : player.careerGameScore}
                    displayValue={
                      player.careerGameScore === null
                        ? undefined
                        : Math.round(player.careerGameScore).toLocaleString("en-CA")
                    }
                  />
                  <MetricCell
                    value={isGoalie ? player.careerGoalsSavedAboveExpected : null}
                    displayValue={
                      isGoalie && player.careerGoalsSavedAboveExpected !== null
                        ? formatSignedDecimal(player.careerGoalsSavedAboveExpected)
                        : undefined
                    }
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    </SortableTable>
  );
}
