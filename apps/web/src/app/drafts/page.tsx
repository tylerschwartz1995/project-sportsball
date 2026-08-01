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
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type {
  DraftPlayerOutcome,
  DraftTeamPerformance,
} from "@/contracts/draft";
import { getDraftAnalytics } from "@/data/drafts";
import { firstQueryValue, paginate, parsePage } from "@/lib/directory";

export const dynamic = "force-dynamic";

type DraftView = "board" | "pick-value" | "teams" | "overview";

type DraftsPageProps = {
  searchParams: Promise<{
    year?: string | string[];
    team?: string | string[];
    page?: string | string[];
    view?: string | string[];
  }>;
};

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const params = await searchParams;
  const yearParam = firstQueryValue(params.year);
  const allYears = yearParam === "all";
  const draftYear = parseDraftYear(yearParam);
  const team = firstQueryValue(params.team) ?? "";
  const view = parseDraftView(firstQueryValue(params.view));
  const analytics = await getDraftAnalytics(
    draftYear,
    team || null,
    allYears,
  );
  const outcomePage = paginate(
    analytics.outcomes,
    parsePage(firstQueryValue(params.page)),
    100,
  );
  const insights = buildInsights(
    analytics.outcomes,
    analytics.teamPerformance,
  );
  const plotOutcomes: DraftPlotOutcome[] =
    analytics.allYears && !team
      ? []
      : analytics.outcomes.map((outcome) => ({
          name: outcome.name,
          position: outcome.position,
          draftYear: outcome.draftYear,
          draftTeamAbbreviation: outcome.draftTeamAbbreviation,
          draftRound: outcome.draftRound,
          draftOverallPick: outcome.draftOverallPick,
          careerGames: outcome.careerGames,
          careerPoints: outcome.careerPoints,
          careerWins: outcome.careerWins,
        }));
  const firstDraftYear = analytics.draftYears.at(-1);
  const lastDraftYear = analytics.draftYears[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="drafts" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Drafts"
          title="NHL Draft History"
          description="Browse every official selection, including players who never appeared in the NHL, and compare team outcomes with complete draft denominators."
          action={
            <DraftFilters
              years={analytics.draftYears}
              teams={analytics.teamAbbreviations}
              selectedYear={analytics.selectedDraftYear}
              selectedTeam={team}
              allYears={analytics.allYears}
              view={view}
            />
          }
        />

        <div className="workspace-coverage-note mt-6">
          <strong>Coverage:</strong> every official NHL Records selection from {firstDraftYear ?? "—"} through {lastDraftYear ?? "—"}, including nullable player IDs and selections marked removed outright. NHL appearance and 100-game rates use the complete board as their denominator; career outcomes come from stored official regular-season summaries through 2025–26.
        </div>

        <ViewTabs
          active={view}
          ariaLabel="Draft history views"
          tabs={draftViewTabs({
            year: analytics.allYears
              ? "all"
              : (analytics.selectedDraftYear ?? "all"),
            team,
          })}
        />

        {analytics.outcomes.length > 0 ? (
          <>
            {view === "overview" ? (
            <section
              className="workspace-draft-insights"
              aria-label="Draft highlights"
            >
              {insights.map((insight) => (
                <div key={insight.label}>
                  <span>{insight.label}</span>
                  <strong>{insight.value}</strong>
                  <small>{insight.detail}</small>
                </div>
              ))}
            </section>
            ) : null}

            {view === "pick-value" && plotOutcomes.length > 0 ? (
              <div className="mt-7">
                <DraftOutcomePlot outcomes={plotOutcomes} />
              </div>
            ) : view === "pick-value" ? (
              <div className="workspace-coverage-note mt-7">
                <strong>Pick-value plot:</strong> choose one draft year or one drafting team to keep the interactive chart focused. The complete all-years board remains available below.
              </div>
            ) : null}

            {view === "teams" ? (
            <WorkspacePanel
              className="mt-7"
              title="Team Drafting Performance"
              description="True selection, NHL appearance, and 100-game rates by the club recorded as making each pick. Career totals use stored official regular-season results."
            >
              <TeamPerformanceTable rows={analytics.teamPerformance} />
            </WorkspacePanel>
            ) : null}

            {view === "board" ? (
            <>
            <WorkspacePanel
              className="mt-7"
              title="Complete Draft Board"
              description={`Showing ${outcomePage.firstItem}–${outcomePage.lastItem} of ${outcomePage.totalItems} official selections, including ${analytics.outcomes.filter((outcome) => outcome.careerGames === 0).length.toLocaleString("en-CA")} with no stored NHL appearance.`}
            >
              <OutcomeTable rows={outcomePage.items} />
            </WorkspacePanel>
            <Pagination
              path="/drafts"
              currentPage={outcomePage.currentPage}
              totalPages={outcomePage.totalPages}
              params={{
                year: analytics.allYears
                  ? "all"
                  : (analytics.selectedDraftYear ?? undefined),
                team: team || undefined,
                view,
              }}
            />
            </>
            ) : null}
          </>
        ) : (
          <div className="workspace-empty-state">
            No draft selections match the selected filters.
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
  allYears,
  view,
}: {
  years: number[];
  teams: string[];
  selectedYear: number | null;
  selectedTeam: string;
  allYears: boolean;
  view: DraftView;
}) {
  const firstYear = years.at(-1);
  const lastYear = years[0];
  return (
    <form method="get" className="workspace-draft-filters">
      <input type="hidden" name="view" value={view} />
      <label>
        Draft Year
        <select
          name="year"
          defaultValue={allYears ? "all" : (selectedYear ?? "")}
        >
          <option value="all">
            All Drafts ({firstYear ?? "—"}–{lastYear ?? "—"})
          </option>
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
      <Link href={`/drafts?view=${view}`}>Reset</Link>
    </form>
  );
}

function TeamPerformanceTable({ rows }: { rows: DraftTeamPerformance[] }) {
  return (
    <SortableTable defaultSortKey="hundred-rate">
      <div className="workspace-table-scroll">
        <table className="workspace-table min-w-[1180px]">
          <thead>
            <tr>
              <SortableHeader
                label="Team"
                sortKey="team"
                align="left"
                defaultDirection="asc"
              />
              <SortableHeader label="Selections" sortKey="selections" />
              <SortableHeader label="NHL Players" sortKey="players" />
              <SortableHeader label="Appearance %" sortKey="appearance-rate" />
              <SortableHeader label="100 GP" sortKey="hundred" />
              <SortableHeader label="100 GP %" sortKey="hundred-rate" />
              <SortableHeader label="NHL GP" sortKey="games" />
              <SortableHeader label="GP / Pick" sortKey="average" />
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
                    <TeamLogo
                      abbreviation={team.teamAbbreviation}
                      size="compact"
                      decorative
                    />
                    <strong>{team.teamAbbreviation}</strong>
                  </span>
                </td>
                <NumberCell value={team.selections} />
                <NumberCell value={team.playersWithNhlGames} />
                <NumberCell value={formatPercentage(team.appearanceRate)} />
                <NumberCell value={team.hundredGamePlayers} />
                <NumberCell value={formatPercentage(team.hundredGameRate)} />
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
        “Appearance” means at least one stored regular-season NHL game. “100 GP” uses all official selections as the denominator. “Late regulars” are round-four-or-later selections with at least 100 games. Team and pick-owner codes are retained from the original draft record.
      </div>
    </SortableTable>
  );
}

function OutcomeTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <SortableTable defaultSortKey="overall" defaultDirection="asc">
      <div className="workspace-table-scroll">
        <table className="workspace-table min-w-[1480px]">
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
              <SortableHeader label="Pick From" sortKey="owner" />
              <SortableHeader label="Rd" sortKey="round" />
              <SortableHeader label="Rd Pick" sortKey="round-pick" />
              <SortableHeader label="Overall" sortKey="overall" />
              <SortableHeader label="Pos" sortKey="position" />
              <SortableHeader label="Country" sortKey="country" />
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
              <tr key={`${player.draftYear}-${player.draftOverallPick}`}>
                <td className="workspace-team-cell">
                  <div>
                    {player.nhlPlayerId === null ? (
                      <strong>{player.name}</strong>
                    ) : (
                      <Link href={`/players/${player.nhlPlayerId}`}>
                        {player.name}
                      </Link>
                    )}
                    <small>
                      {[
                        player.amateurClubName,
                        player.amateurLeague,
                        player.removedOutright
                          ? player.removedOutrightReason
                            ? `Rights removed: ${player.removedOutrightReason}`
                            : "Rights removed"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No amateur club recorded"}
                    </small>
                  </div>
                </td>
                <NumberCell value={player.draftYear} />
                <td>
                  <span className="inline-flex items-center gap-2">
                    <TeamLogo
                      abbreviation={player.draftTeamAbbreviation}
                      size="tiny"
                      decorative
                    />
                    {player.draftTeamAbbreviation}
                  </span>
                </td>
                <td
                  className="workspace-number-cell"
                  title={player.pickOwnerHistory}
                >
                  {player.originalPickOwnerAbbreviation ===
                  player.draftTeamAbbreviation
                    ? "—"
                    : player.originalPickOwnerAbbreviation}
                </td>
                <NumberCell value={player.draftRound} />
                <NumberCell value={player.draftPickInRound} />
                <NumberCell value={player.draftOverallPick} />
                <NumberCell value={player.position ?? "—"} />
                <NumberCell value={player.birthCountry ?? "—"} />
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
      <div className="workspace-table-note">
        “Pick From” shows the original owner when the NHL record contains a traded-pick chain; hover the code for the complete chain. Players without a canonical NHL result link remain in the board and carry zero outcome totals.
      </div>
    </SortableTable>
  );
}

function buildInsights(
  outcomes: DraftPlayerOutcome[],
  teams: DraftTeamPerformance[],
) {
  const selections = outcomes.length;
  const appearances = outcomes.filter((player) => player.careerGames > 0).length;
  const hundredGamePlayers = outcomes.filter(
    (player) => player.careerGames >= 100,
  ).length;
  const topTeam = maxBy(teams, (team) => team.totalGames);

  return [
    {
      label: "Official Selections",
      value: selections.toLocaleString("en-CA"),
      detail: "Complete filtered draft denominator",
    },
    {
      label: "NHL Appearances",
      value: formatPercentage(appearances / selections),
      detail: `${appearances.toLocaleString("en-CA")} selections reached one game`,
    },
    {
      label: "100-Game Players",
      value: formatPercentage(hundredGamePlayers / selections),
      detail: `${hundredGamePlayers.toLocaleString("en-CA")} selections reached 100 games`,
    },
    {
      label: "Most Combined Games",
      value: topTeam?.teamAbbreviation ?? "—",
      detail: topTeam
        ? `${topTeam.totalGames.toLocaleString("en-CA")} GP from ${topTeam.selections.toLocaleString("en-CA")} picks`
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

function draftViewTabs({
  year,
  team,
}: {
  year: number | "all";
  team: string;
}) {
  return [
    { id: "board" as const, label: "Draft Board" },
    { id: "pick-value" as const, label: "Pick Value" },
    { id: "teams" as const, label: "Team Performance" },
    { id: "overview" as const, label: "Overview" },
  ].map((tab) => {
    const params = new URLSearchParams({
      year: String(year),
      view: tab.id,
    });
    if (team) params.set("team", team);
    return { ...tab, href: `/drafts?${params.toString()}` };
  });
}

function parseDraftView(value: string | undefined): DraftView {
  return value === "pick-value" || value === "teams" || value === "overview"
    ? value
    : "board";
}

function parseDraftYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1963 ? parsed : null;
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function NumberCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}
