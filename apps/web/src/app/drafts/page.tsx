import Link from "next/link";

import {
  DraftOutcomePlot,
  type DraftPlotOutcome,
} from "@/app/_components/draft-outcome-plot";
import { Pagination } from "@/app/_components/pagination";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type {
  DraftPlayerOutcome,
  DraftTeamPerformance,
} from "@/contracts/draft";
import { getDraftAnalytics } from "@/data/drafts";
import {
  firstQueryValue,
  paginate,
  parsePage,
} from "@/lib/directory";

export const dynamic = "force-dynamic";

type DraftsPageProps = {
  searchParams: Promise<{
    year?: string | string[];
    team?: string | string[];
    page?: string | string[];
  }>;
};

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const params = await searchParams;
  const draftYear = parseDraftYear(firstQueryValue(params.year));
  const team = firstQueryValue(params.team) ?? "";
  const analytics = await getDraftAnalytics(
    draftYear,
    team || null,
  );
  const outcomePage = paginate(
    analytics.outcomes,
    parsePage(firstQueryValue(params.page)),
    100,
  );
  const insights = buildInsights(analytics.outcomes, analytics.teamPerformance);
  const plotOutcomes: DraftPlotOutcome[] = analytics.outcomes.flatMap(
    (outcome) =>
      outcome.draftOverallPick === null
        ? []
        : [
            {
              name: outcome.name,
              position: outcome.position,
              draftYear: outcome.draftYear,
              draftTeamAbbreviation: outcome.draftTeamAbbreviation,
              draftRound: outcome.draftRound,
              draftOverallPick: outcome.draftOverallPick,
              careerGames: outcome.careerGames,
              careerPoints: outcome.careerPoints,
              careerWins: outcome.careerWins,
            },
          ],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="drafts" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Drafts"
          title="NHL Draft Outcomes"
          description="Explore how drafted players in Sportsball's stored NHL history performed, where value emerged, and which teams accumulated the most NHL production."
          action={
            <DraftFilters
              years={analytics.draftYears}
              teams={analytics.teamAbbreviations}
              selectedYear={draftYear}
              selectedTeam={team}
            />
          }
        />

        <div className="workspace-coverage-note mt-6">
          <strong>Coverage:</strong> this first version evaluates drafted
          players who appear in the stored NHL player universe from 2005
          onward. It is not yet a complete record of every draft selection, so
          it does not calculate organizational hit rates for players who never
          reached the NHL.
        </div>

        {analytics.outcomes.length > 0 ? (
          <>
            <section className="workspace-draft-insights" aria-label="Draft highlights">
              {insights.map((insight) => (
                <div key={insight.label}>
                  <span>{insight.label}</span>
                  <strong>{insight.value}</strong>
                  <small>{insight.detail}</small>
                </div>
              ))}
            </section>

            <div className="mt-7">
              <DraftOutcomePlot outcomes={plotOutcomes} />
            </div>

            <WorkspacePanel
              className="mt-7"
              title="Team Drafting Production"
              description="Production by original drafting team for the selected draft years and filters. Totals cover regular-season NHL results stored since 2005–06."
            >
              <TeamPerformanceTable rows={analytics.teamPerformance} />
            </WorkspacePanel>

            <WorkspacePanel
              className="mt-7"
              title="Player Draft Outcomes"
              description={`Showing ${outcomePage.firstItem}–${outcomePage.lastItem} of ${outcomePage.totalItems} tracked drafted players.`}
            >
              <OutcomeTable rows={outcomePage.items} />
            </WorkspacePanel>
            <Pagination
              path="/drafts"
              currentPage={outcomePage.currentPage}
              totalPages={outcomePage.totalPages}
              params={{
                year: draftYear ?? undefined,
                team: team || undefined,
              }}
            />
          </>
        ) : (
          <div className="workspace-empty-state">
            No drafted players match the selected filters.
          </div>
        )}
      </section>
    </main>
  );
}

function DraftFilters({
  years,
  teams,
  selectedYear,
  selectedTeam,
}: {
  years: number[];
  teams: string[];
  selectedYear: number | null;
  selectedTeam: string;
}) {
  return (
    <form method="get" className="workspace-draft-filters">
      <label>
        Draft Year
        <select name="year" defaultValue={selectedYear ?? ""}>
          <option value="">All Drafts Since 2005</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} Draft
            </option>
          ))}
        </select>
      </label>
      <label>
        Drafting Team
        <select name="team" defaultValue={selectedTeam}>
          <option value="">All Teams</option>
          {teams.map((abbreviation) => (
            <option key={abbreviation} value={abbreviation}>
              {abbreviation}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Apply</button>
      <Link href="/drafts">Reset</Link>
    </form>
  );
}

function TeamPerformanceTable({ rows }: { rows: DraftTeamPerformance[] }) {
  return (
    <SortableTable defaultSortKey="games">
      <div className="workspace-table-scroll">
        <table className="workspace-table min-w-[820px]">
          <thead>
            <tr>
              <SortableHeader
                label="Team"
                sortKey="team"
                align="left"
                defaultDirection="asc"
              />
              <SortableHeader label="Tracked" sortKey="tracked" />
              <SortableHeader label="With GP" sortKey="players" />
              <SortableHeader label="NHL GP" sortKey="games" />
              <SortableHeader label="Avg GP" sortKey="average" />
              <SortableHeader label="Skater PTS" sortKey="points" />
              <SortableHeader label="Goalie W" sortKey="wins" />
              <SortableHeader label="Late Regulars" sortKey="late" />
            </tr>
          </thead>
          <tbody>
            {rows.map((team) => (
              <tr key={team.teamAbbreviation}>
                <td className="workspace-team-cell">
                  <span className="inline-flex items-center gap-2">
                    <TeamLogo abbreviation={team.teamAbbreviation} size="compact" decorative />
                    <strong>{team.teamAbbreviation}</strong>
                  </span>
                </td>
                <NumberCell value={team.trackedDraftees} />
                <NumberCell value={team.playersWithNhlGames} />
                <NumberCell value={team.totalGames.toLocaleString("en-CA")} />
                <NumberCell value={Math.round(team.averageGames)} />
                <NumberCell value={team.totalPoints.toLocaleString("en-CA")} />
                <NumberCell value={team.totalWins.toLocaleString("en-CA")} />
                <NumberCell value={team.lateRoundRegulars} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="workspace-table-note">
        “Late regulars” are round-four-or-later players with at least 100
        stored regular-season NHL games. Team abbreviations reflect the
        original draft record.
      </div>
    </SortableTable>
  );
}

function OutcomeTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <SortableTable defaultSortKey="pick" defaultDirection="asc">
      <div className="workspace-table-scroll">
        <table className="workspace-table min-w-[980px]">
          <thead>
            <tr>
              <SortableHeader
                label="Player"
                sortKey="player"
                align="left"
                defaultDirection="asc"
              />
              <SortableHeader label="Year" sortKey="year" />
              <SortableHeader
                label="Team"
                sortKey="team"
                align="left"
                defaultDirection="asc"
              />
              <SortableHeader label="Rd" sortKey="round" />
              <SortableHeader label="Pick" sortKey="pick" />
              <SortableHeader label="Seasons" sortKey="seasons" />
              <SortableHeader label="GP" sortKey="games" />
              <SortableHeader label="G" sortKey="goals" />
              <SortableHeader label="A" sortKey="assists" />
              <SortableHeader label="PTS" sortKey="points" />
              <SortableHeader label="Goalie W" sortKey="wins" />
            </tr>
          </thead>
          <tbody>
            {rows.map((player) => (
              <tr key={player.nhlPlayerId}>
                <td className="workspace-team-cell">
                  <div className="flex items-center gap-2">
                    <TeamLogo abbreviation={player.draftTeamAbbreviation} size="compact" decorative />
                    <div>
                      <Link href={`/players/${player.nhlPlayerId}`}>
                        {player.name}
                      </Link>
                      <small>
                        {player.position ?? "—"} · {player.birthCountry ?? "—"}
                      </small>
                    </div>
                  </div>
                </td>
                <NumberCell value={player.draftYear} />
                <td>
                  <span className="inline-flex items-center gap-2">
                    <TeamLogo abbreviation={player.draftTeamAbbreviation} size="tiny" decorative />
                    {player.draftTeamAbbreviation}
                  </span>
                </td>
                <NumberCell value={player.draftRound ?? "—"} />
                <NumberCell value={player.draftOverallPick ?? "—"} />
                <NumberCell value={player.seasonsPlayed} />
                <NumberCell value={player.careerGames} />
                <NumberCell value={player.careerGoals} />
                <NumberCell value={player.careerAssists} />
                <td className="workspace-points-cell">
                  {player.careerPoints}
                </td>
                <NumberCell value={player.careerWins} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SortableTable>
  );
}

function buildInsights(
  outcomes: DraftPlayerOutcome[],
  teams: DraftTeamPerformance[],
) {
  const mostGames = maxBy(outcomes, (player) => player.careerGames);
  const mostPoints = maxBy(outcomes, (player) => player.careerPoints);
  const lateValue = maxBy(
    outcomes.filter((player) => (player.draftRound ?? 0) >= 4),
    (player) => player.careerGames,
  );
  const topTeam = maxBy(teams, (team) => team.totalGames);

  return [
    {
      label: "Most NHL Games",
      value: mostGames?.name ?? "—",
      detail: mostGames
        ? `${mostGames.careerGames.toLocaleString("en-CA")} GP · Pick #${mostGames.draftOverallPick ?? "—"}`
        : "No result",
    },
    {
      label: "Most Skater Points",
      value: mostPoints?.name ?? "—",
      detail: mostPoints
        ? `${mostPoints.careerPoints.toLocaleString("en-CA")} PTS · ${mostPoints.draftYear} draft`
        : "No result",
    },
    {
      label: "Late-Round Value",
      value: lateValue?.name ?? "—",
      detail: lateValue
        ? `Round ${lateValue.draftRound} · ${lateValue.careerGames.toLocaleString("en-CA")} GP`
        : "No result",
    },
    {
      label: "Most Combined Games",
      value: topTeam?.teamAbbreviation ?? "—",
      detail: topTeam
        ? `${topTeam.totalGames.toLocaleString("en-CA")} GP from tracked draftees`
        : "No result",
    },
  ];
}

function maxBy<T>(values: T[], getValue: (value: T) => number): T | undefined {
  let result: T | undefined;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const candidate = getValue(value);
    if (candidate > maximum) {
      maximum = candidate;
      result = value;
    }
  }
  return result;
}

function parseDraftYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 2005 && parsed <= 2025 ? parsed : null;
}

function NumberCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}
