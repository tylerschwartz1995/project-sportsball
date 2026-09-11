import { TableScroll } from "@/components/ui/table-scroll";
import { ContextLink as Link } from "@/components/ui/context-link";
import { WorkspacePanel } from "@/components/ui/workspace-primitives";
import type { DraftAnalytics, DraftPlayerOutcome } from "@/contracts/draft";
import { DraftOutcomePlot } from "@/features/charts/lazy-charts";
import { NumberCell } from "@/features/drafts/cells";
import { type DraftPlotOutcome, } from "@/features/drafts/draft-outcome-plot";
import { DraftYearFilter } from "@/features/drafts/filters";
import { buildOutcomeInsights } from "@/features/drafts/logic";

export function PlayerOutcomesView({ analytics }: { analytics: DraftAnalytics }) {
  const selectedYear = analytics.selectedDraftYear;
  const isDeveloping =
    selectedYear !== null &&
    analytics.latestMatureDraftYear !== null &&
    selectedYear > analytics.latestMatureDraftYear;
  const insights = buildOutcomeInsights(analytics.outcomes, isDeveloping);
  const plotOutcomes: DraftPlotOutcome[] = analytics.outcomes.map(
    (outcome) => ({
      name: outcome.name,
      position: outcome.position,
      draftYear: outcome.draftYear,
      draftTeamAbbreviation: outcome.draftTeamAbbreviation,
      draftRound: outcome.draftRound,
      draftOverallPick: outcome.draftOverallPick,
      careerGames: outcome.careerGames,
      careerPoints: outcome.careerPoints,
      careerWins: outcome.careerWins,
      careerGameScore: outcome.careerGameScore,
      careerIndividualExpectedGoals: outcome.careerIndividualExpectedGoals,
      careerOnIceExpectedGoalsPercentage:
        outcome.careerOnIceExpectedGoalsPercentage,
      careerGoalsSavedAboveExpected: outcome.careerGoalsSavedAboveExpected,
    }),
  );
  const leaders = [...analytics.outcomes]
    .filter((outcome) => outcome.careerGames > 0)
    .sort(
      (left, right) =>
        right.careerGames - left.careerGames ||
        right.careerPoints - left.careerPoints ||
        left.draftOverallPick - right.draftOverallPick,
    )
    .slice(0, 15);

  return (
    <>
      <DraftYearFilter
        years={analytics.draftYears}
        selectedYear={selectedYear}
        matureThrough={analytics.latestMatureDraftYear}
      />

      {isDeveloping ? (
        <div className="workspace-draft-developing-note mt-6">
          <strong>Developing class:</strong> this draft has fewer than five
          seasons of observation. Totals describe progress so far and are not a
          final success rate.
        </div>
      ) : null}

      {analytics.outcomes.length > 0 ? (
        <>
          <section
            className="workspace-draft-insights"
            aria-label="Draft class outcomes"
          >
            {insights.map((insight) => (
              <div key={insight.label}>
                <span>{insight.label}</span>
                <strong>{insight.value}</strong>
                <small>{insight.detail}</small>
              </div>
            ))}
          </section>

          <div className="mt-7">
            {plotOutcomes.some((row) => row.careerGames > 0) ? (
              <DraftOutcomePlot outcomes={plotOutcomes} />
            ) : (
              <div className="ux-empty-guidance">
                <h2>Outcomes Begin With NHL Appearances</h2>
                <p>
                  No NHL appearances are stored for this class yet. The draft
                  board remains available; compare an older class to explore how
                  draft position relates to career outcomes.
                </p>
                <Link href="/drafts?view=outcomes">
                  Explore the Latest Mature Class →
                </Link>
                <details>
                  <summary>Show This Class’s Outcome Plot</summary>
                  <DraftOutcomePlot outcomes={plotOutcomes} />
                </details>
              </div>
            )}
          </div>

          <details className="mt-5">
            <summary>Class Leaders by Career GP</summary>
            <WorkspacePanel
              className="mt-7"
              title="Class Leaders"
              description="Players with the most stored regular-season NHL games from this draft class."
              action={
                selectedYear ? (
                  <Link
                    href={`/drafts?view=board&year=${selectedYear}`}
                    className="workspace-panel-link"
                  >
                    Open full draft board →
                  </Link>
                ) : null
              }
            >
              {leaders.length > 0 ? (
                <OutcomeLeadersTable rows={leaders} />
              ) : (
                <div className="workspace-empty-state">
                  No player from this class has a stored NHL appearance yet.
                </div>
              )}
            </WorkspacePanel>
          </details>
        </>
      ) : (
        <div className="workspace-empty-state mt-7">
          No outcomes are available for this draft class.
        </div>
      )}
    </>
  );
}

export function OutcomeLeadersTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <TableScroll className="workspace-table-scroll">
      <table className="workspace-table workspace-table-dense workspace-draft-leaders-table min-w-[720px]">
        <colgroup>
          <col />
          <col className="workspace-draft-leaders-overall-col" />
          <col className="workspace-draft-leaders-team-col" />
          <col className="workspace-draft-leaders-stat-col" />
          <col className="workspace-draft-leaders-stat-col" />
          <col className="workspace-draft-leaders-wins-col" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="text-left">Player</th>
            <th scope="col">Overall</th>
            <th scope="col" className="text-left">Team</th>
            <th scope="col">GP</th>
            <th scope="col">PTS</th>
            <th scope="col">Goalie Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={`${player.draftYear}-${player.draftOverallPick}`}>
              <td className="workspace-team-cell">
                {player.nhlPlayerId === null ? (
                  <strong>{player.name}</strong>
                ) : (
                  <Link href={`/players/${player.nhlPlayerId}`}>{player.name}</Link>
                )}
              </td>
              <NumberCell value={player.draftOverallPick} />
              <td>
                {player.draftTeamNhlId === null ? (
                  player.draftTeamAbbreviation
                ) : (
                  <Link href={`/teams/${player.draftTeamNhlId}`}>
                    {player.draftTeamAbbreviation}
                  </Link>
                )}
              </td>
              <NumberCell value={player.careerGames.toLocaleString("en-CA")} />
              <NumberCell value={player.careerPoints.toLocaleString("en-CA")} />
              <NumberCell value={player.careerWins.toLocaleString("en-CA")} />
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
