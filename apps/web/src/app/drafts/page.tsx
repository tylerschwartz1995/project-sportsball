import Link from "next/link";

import { AutoSubmitSelect } from "@/app/_components/auto-submit-select";
import {
  DraftOutcomePlot,
  type DraftPlotOutcome,
} from "@/app/_components/draft-outcome-plot";
import { Pagination } from "@/app/_components/pagination";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { TeamDraftingVisuals } from "@/app/_components/team-drafting-visuals";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type {
  DraftAnalytics,
  DraftPlayerOutcome,
  DraftTeamOption,
  DraftTeamPerformance,
} from "@/contracts/draft";
import { getDraftAnalytics } from "@/data/drafts";
import {
  applySortDirection,
  firstQueryValue,
  matchesSearch,
  normalizeSearch,
  paginate,
  parsePage,
  parseSortDirection,
} from "@/lib/directory";
import { formatPlayerPosition } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type DraftView = "board" | "outcomes" | "teams";
type DraftSort =
  | "player"
  | "year"
  | "team"
  | "round"
  | "overall"
  | "position"
  | "country";

const teamPerformanceColumns = [
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
    label: "Late-Round Hits",
    sortKey: "late",
    description: "Round-four-or-later selections who reached 100 games",
  },
] as const;

type DraftsPageProps = {
  searchParams: Promise<{
    year?: string | string[];
    team?: string | string[];
    round?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    from?: string | string[];
    to?: string | string[];
    view?: string | string[];
  }>;
};

export default async function DraftsPage({ searchParams }: DraftsPageProps) {
  const params = await searchParams;
  const view = parseDraftView(firstQueryValue(params.view));
  const yearParam = firstQueryValue(params.year);
  const requestedYear = parseDraftYear(yearParam);
  const allYears = view === "board" && yearParam === "all";
  const requestedTeam = view === "board"
    ? (firstQueryValue(params.team) ?? "")
    : "";
  const requestedFromYear = parseDraftYear(firstQueryValue(params.from));
  const requestedToYear = parseDraftYear(firstQueryValue(params.to));
  const analytics = await getDraftAnalytics(
    view === "teams"
      ? {
          yearRange: true,
          fromYear: requestedFromYear,
          toYear: requestedToYear,
        }
      : {
          draftYear: requestedYear,
          teamAbbreviation: requestedTeam || null,
          allYears,
          defaultYear: view === "outcomes" ? "mature" : "latest",
          includeAdvanced: view === "outcomes",
        },
  );
  const selectedTeam = view === "board"
    ? (analytics.selectedTeamAbbreviation ?? "")
    : "";
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="drafts" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Drafts"
          title="NHL Drafts"
          description="Explore every NHL draft since 1963, trace each selection, and evaluate player and team outcomes."
          descriptionClassName="workspace-description-single-line"
        />

        <ViewTabs
          active={view}
          ariaLabel="Draft views"
          tabs={draftViewTabs({
            view,
            selectedYear: analytics.selectedDraftYear,
            selectedTeam,
            selectedFromYear: analytics.selectedFromYear,
            selectedToYear: analytics.selectedToYear,
          })}
        />

        {view === "board" ? (
          <DraftBoardView
            analytics={analytics}
            params={params}
            selectedTeam={selectedTeam}
          />
        ) : null}

        {view === "outcomes" ? (
          <PlayerOutcomesView analytics={analytics} />
        ) : null}

        {view === "teams" ? (
          <TeamDraftingView analytics={analytics} />
        ) : null}
      </section>
    </main>
  );
}

function DraftBoardView({
  analytics,
  params,
  selectedTeam,
}: {
  analytics: DraftAnalytics;
  params: Awaited<DraftsPageProps["searchParams"]>;
  selectedTeam: string;
}) {
  const query = normalizeSearch(firstQueryValue(params.q));
  const selectedRound = parseRound(firstQueryValue(params.round));
  const availableRounds = [
    ...new Set(analytics.outcomes.map((outcome) => outcome.draftRound)),
  ].sort((left, right) => left - right);
  const defaultSort: DraftSort = analytics.allYears ? "year" : "overall";
  const sort = parseDraftSort(firstQueryValue(params.sort), defaultSort);
  const direction = parseSortDirection(
    firstQueryValue(params.dir),
    sort === "year" ? "desc" : "asc",
  );
  const filteredOutcomes = analytics.outcomes.filter(
    (outcome) =>
      (selectedRound === null || outcome.draftRound === selectedRound) &&
      matchesSearch(
        query,
        outcome.name,
        outcome.draftTeamName,
        outcome.draftTeamAbbreviation,
        outcome.amateurClubName,
        outcome.amateurLeague,
        outcome.birthCountry,
        formatPlayerPosition(outcome.position),
      ),
  );
  const outcomePage = paginate(
    sortDraftOutcomes(filteredOutcomes, sort, direction),
    parsePage(firstQueryValue(params.page)),
    75,
  );
  const selectedYear = analytics.allYears
    ? "all"
    : (analytics.selectedDraftYear ?? "all");
  const tableParams = {
    view: "board",
    year: selectedYear,
    team: selectedTeam || undefined,
    round: selectedRound ?? undefined,
    q: query || undefined,
  };

  return (
    <>
      <DraftBoardFilters
        years={analytics.draftYears}
        teams={analytics.teamOptions}
        rounds={availableRounds}
        selectedYear={analytics.selectedDraftYear}
        selectedTeam={selectedTeam}
        selectedRound={selectedRound}
        allYears={analytics.allYears}
        query={query}
      />

      <WorkspacePanel
        className="mt-7"
        title={
          analytics.allYears
            ? "Complete Draft Archive"
            : `${analytics.selectedDraftYear ?? "NHL"} Draft Board`
        }
        description={
          outcomePage.totalItems > 0
            ? `Showing ${outcomePage.firstItem}–${outcomePage.lastItem} of ${outcomePage.totalItems} matching selections.`
            : "No selections match the current filters."
        }
        action={
          <DraftBoardSearch
            selectedYear={selectedYear}
            selectedTeam={selectedTeam}
            selectedRound={selectedRound}
            query={query}
          />
        }
      >
        {outcomePage.items.length > 0 ? (
          <>
            <DraftBoardTable
              rows={outcomePage.items}
              showYear={analytics.allYears}
              sort={sort}
              direction={direction}
              params={tableParams}
            />
          </>
        ) : (
          <div className="workspace-empty-state">
            Try a different player, club, team, round, or draft year.
          </div>
        )}
      </WorkspacePanel>
      {outcomePage.items.length > 0 ? (
        <Pagination
          path="/drafts"
          currentPage={outcomePage.currentPage}
          totalPages={outcomePage.totalPages}
          params={{ ...tableParams, sort, dir: direction }}
        />
      ) : null}
    </>
  );
}

function PlayerOutcomesView({ analytics }: { analytics: DraftAnalytics }) {
  const selectedYear = analytics.selectedDraftYear;
  const isDeveloping =
    selectedYear !== null &&
    analytics.latestMatureDraftYear !== null &&
    selectedYear > analytics.latestMatureDraftYear;
  const insights = buildOutcomeInsights(analytics.outcomes, isDeveloping);
  const plotOutcomes: DraftPlotOutcome[] = analytics.outcomes.map((outcome) => ({
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
  }));
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
          seasons of observation. Totals describe progress so far and are not
          a final success rate.
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
            <DraftOutcomePlot outcomes={plotOutcomes} />
          </div>

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
        </>
      ) : (
        <div className="workspace-empty-state mt-7">
          No outcomes are available for this draft class.
        </div>
      )}
    </>
  );
}

function TeamDraftingView({ analytics }: { analytics: DraftAnalytics }) {
  return (
    <>
      <DraftRangeFilter
        years={analytics.draftYears}
        fromYear={analytics.selectedFromYear}
        toYear={analytics.selectedToYear}
        matureThrough={analytics.latestMatureDraftYear}
      />

      {analytics.teamPerformance.length > 0 ? (
        <>
          <WorkspacePanel
            className="mt-7"
            title="Team Drafting"
            description={`Comparing every selection from ${analytics.selectedFromYear ?? "—"} through ${analytics.selectedToYear ?? "—"}. The default window uses the ten most recent draft classes with at least five seasons of observation.`}
          >
            <TeamPerformanceTable rows={analytics.teamPerformance} />
          </WorkspacePanel>
          <TeamDraftingVisuals
            rows={analytics.teamPerformance}
            fromYear={analytics.selectedFromYear}
            toYear={analytics.selectedToYear}
          />
        </>
      ) : (
        <div className="workspace-empty-state mt-7">
          No team drafting results are available for this range.
        </div>
      )}
    </>
  );
}

function DraftBoardFilters({
  years,
  teams,
  rounds,
  selectedYear,
  selectedTeam,
  selectedRound,
  allYears,
  query,
}: {
  years: number[];
  teams: DraftTeamOption[];
  rounds: number[];
  selectedYear: number | null;
  selectedTeam: string;
  selectedRound: number | null;
  allYears: boolean;
  query: string;
}) {
  const resetYear = allYears ? "all" : selectedYear;
  const resetHref = resetYear === null
    ? "/drafts?view=board"
    : `/drafts?view=board&year=${resetYear}`;

  return (
    <form method="get" className="workspace-draft-filters is-board">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="q" value={query} />
      <label>
        Draft Year
        <AutoSubmitSelect
          name="year"
          defaultValue={allYears ? "all" : (selectedYear ?? "")}
          resetFields={["team"]}
        >
          <option value="all">All Drafts</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} Draft
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Drafting Team
        <AutoSubmitSelect name="team" defaultValue={selectedTeam}>
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.abbreviation} value={team.abbreviation}>
              {team.name} ({team.abbreviation})
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Round
        <AutoSubmitSelect name="round" defaultValue={selectedRound ?? ""}>
          <option value="">All Rounds</option>
          {rounds.map((round) => (
            <option key={round} value={round}>
              Round {round}
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        <Link href={resetHref}>Reset</Link>
      </div>
    </form>
  );
}

function DraftBoardSearch({
  selectedYear,
  selectedTeam,
  selectedRound,
  query,
}: {
  selectedYear: number | "all";
  selectedTeam: string;
  selectedRound: number | null;
  query: string;
}) {
  return (
    <form method="get" className="workspace-draft-table-search">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="year" value={selectedYear} />
      <input type="hidden" name="team" value={selectedTeam} />
      <input type="hidden" name="round" value={selectedRound ?? ""} />
      <label>
        <span className="sr-only">Search selections</span>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Player or amateur club…"
        />
      </label>
      <button type="submit">Search</button>
    </form>
  );
}

function DraftYearFilter({
  years,
  selectedYear,
  matureThrough,
}: {
  years: number[];
  selectedYear: number | null;
  matureThrough: number | null;
}) {
  return (
    <form method="get" className="workspace-draft-filters is-compact">
      <input type="hidden" name="view" value="outcomes" />
      <label>
        Draft Class
        <AutoSubmitSelect name="year" defaultValue={selectedYear ?? ""}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year} Draft{matureThrough !== null && year > matureThrough ? " · developing" : ""}
            </option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        <Link href="/drafts?view=outcomes">Latest Mature Class</Link>
      </div>
    </form>
  );
}

function DraftRangeFilter({
  years,
  fromYear,
  toYear,
  matureThrough,
}: {
  years: number[];
  fromYear: number | null;
  toYear: number | null;
  matureThrough: number | null;
}) {
  const matureYears = years.filter(
    (year) => matureThrough === null || year <= matureThrough,
  );
  return (
    <form method="get" className="workspace-draft-filters is-range">
      <input type="hidden" name="view" value="teams" />
      <label>
        From Draft
        <AutoSubmitSelect name="from" defaultValue={fromYear ?? ""}>
          {matureYears.toReversed().map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </AutoSubmitSelect>
      </label>
      <label>
        Through Draft
        <AutoSubmitSelect name="to" defaultValue={toYear ?? ""}>
          {matureYears.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </AutoSubmitSelect>
      </label>
      <div className="workspace-draft-filter-actions">
        <Link href="/drafts?view=teams">Reset Window</Link>
      </div>
    </form>
  );
}

function DraftBoardTable({
  rows,
  showYear,
  sort,
  direction,
  params,
}: {
  rows: DraftPlayerOutcome[];
  showYear: boolean;
  sort: DraftSort;
  direction: "asc" | "desc";
  params: Record<string, string | number | undefined>;
}) {
  return (
    <div className="workspace-table-scroll">
      <table className="workspace-table workspace-table-dense min-w-[930px]">
        <thead>
          <tr>
            <DraftSortHeader label="Player" sortKey="player" align="left" {...{ sort, direction, params }} />
            {showYear ? (
              <DraftSortHeader label="Year" sortKey="year" {...{ sort, direction, params }} />
            ) : null}
            <DraftSortHeader label="Team" sortKey="team" align="left" {...{ sort, direction, params }} />
            <DraftSortHeader label="Round" sortKey="round" {...{ sort, direction, params }} />
            <DraftSortHeader label="Overall" sortKey="overall" {...{ sort, direction, params }} />
            <DraftSortHeader label="Pos" sortKey="position" {...{ sort, direction, params }} />
            <DraftSortHeader label="Country" sortKey="country" {...{ sort, direction, params }} />
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
                    <Link href={`/players/${player.nhlPlayerId}`}>{player.name}</Link>
                  )}
                  <small>
                    {[player.amateurClubName, player.amateurLeague]
                      .filter(Boolean)
                      .join(" · ") || "No amateur club recorded"}
                  </small>
                </div>
              </td>
              {showYear ? <NumberCell value={player.draftYear} /> : null}
              <td className="workspace-team-cell">
                <div>
                  <span className="inline-flex items-center gap-2">
                    <TeamLogo abbreviation={player.draftTeamAbbreviation} size="tiny" decorative />
                    {player.draftTeamNhlId === null ? (
                      <strong>{player.draftTeamAbbreviation}</strong>
                    ) : (
                      <Link href={`/teams/${player.draftTeamNhlId}`}>
                        {player.draftTeamAbbreviation}
                      </Link>
                    )}
                  </span>
                  {player.originalPickOwnerAbbreviation !== player.draftTeamAbbreviation ? (
                    <small title={player.pickOwnerHistory}>
                      Pick from {player.originalPickOwnerAbbreviation}
                    </small>
                  ) : null}
                </div>
              </td>
              <NumberCell value={player.draftRound} />
              <NumberCell value={player.draftOverallPick} />
              <NumberCell value={formatPlayerPosition(player.position)} />
              <NumberCell value={player.birthCountry ?? "—"} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DraftSortHeader({
  label,
  sortKey,
  align = "center",
  sort,
  direction,
  params,
}: {
  label: string;
  sortKey: DraftSort;
  align?: "left" | "center";
  sort: DraftSort;
  direction: "asc" | "desc";
  params: Record<string, string | number | undefined>;
}) {
  const active = sort === sortKey;
  const nextDirection = active
    ? direction === "asc"
      ? "desc"
      : "asc"
    : sortKey === "year"
      ? "desc"
      : "asc";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  search.set("sort", sortKey);
  search.set("dir", nextDirection);
  search.set("page", "1");
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={align === "left" ? "text-left" : "text-center"}
    >
      <Link
        href={`/drafts?${search.toString()}`}
        className={`workspace-draft-sort-link ${align === "left" ? "justify-start" : "justify-center"}`}
        scroll={false}
      >
        {label}
        <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </Link>
    </th>
  );
}

function OutcomeLeadersTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <div className="workspace-table-scroll">
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
    </div>
  );
}

function TeamPerformanceTable({ rows }: { rows: DraftTeamPerformance[] }) {
  return (
    <SortableTable defaultSortKey="hundred-rate">
      <div className="workspace-table-scroll">
        <table className="workspace-table workspace-table-dense min-w-[850px]">
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
                      <Link href={`/drafts?view=board&year=all&team=${team.teamAbbreviation}`}>
                        {team.teamAbbreviation} selections →
                      </Link>
                    </small>
                  </div>
                </td>
                <NumberCell value={team.selections} />
                <NumberCell value={formatPercentage(team.appearanceRate)} />
                <NumberCell value={formatPercentage(team.hundredGameRate)} />
                <NumberCell value={Math.round(team.averageGames)} />
                <NumberCell value={team.lateRoundRegulars} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="workspace-table-note">
        Rates use every official selection in the chosen window as the denominator.
        “Late-round regulars” are round-four-or-later selections with at least 100 games.
      </div>
    </SortableTable>
  );
}

function buildOutcomeInsights(
  outcomes: DraftPlayerOutcome[],
  isDeveloping: boolean,
) {
  const selections = outcomes.length;
  const appearances = outcomes.filter((player) => player.careerGames > 0).length;
  const hundredGamePlayers = outcomes.filter((player) => player.careerGames >= 100).length;
  const totalGames = outcomes.reduce((total, player) => total + player.careerGames, 0);
  const leader = [...outcomes]
    .filter((outcome) => outcome.careerGames > 0)
    .sort((left, right) => right.careerGames - left.careerGames)[0];

  if (isDeveloping) {
    return [
      {
        label: "Official Selections",
        value: selections.toLocaleString("en-CA"),
        detail: "Complete draft class",
      },
      {
        label: "NHL Players So Far",
        value: appearances.toLocaleString("en-CA"),
        detail: "At least one stored NHL game",
      },
      {
        label: "NHL Games So Far",
        value: totalGames.toLocaleString("en-CA"),
        detail: "Combined regular-season games",
      },
      {
        label: "Games Leader",
        value: leader?.name ?? "—",
        detail: leader ? `${leader.careerGames.toLocaleString("en-CA")} GP` : "No appearances yet",
      },
    ];
  }

  return [
    {
      label: "Official Selections",
      value: selections.toLocaleString("en-CA"),
      detail: "Complete draft class",
    },
    {
      label: "NHL Appearance Rate",
      value: formatPercentage(appearances / selections),
      detail: `${appearances.toLocaleString("en-CA")} players reached one game`,
    },
    {
      label: "100-Game Rate",
      value: formatPercentage(hundredGamePlayers / selections),
      detail: `${hundredGamePlayers.toLocaleString("en-CA")} players reached 100 games`,
    },
    {
      label: "Games per Pick",
      value: Math.round(totalGames / selections).toLocaleString("en-CA"),
      detail: "Average regular-season games",
    },
  ];
}

function sortDraftOutcomes(
  outcomes: DraftPlayerOutcome[],
  sort: DraftSort,
  direction: "asc" | "desc",
): DraftPlayerOutcome[] {
  return [...outcomes].sort((left, right) => {
    const comparison = compareDraftOutcomes(left, right, sort);
    return applySortDirection(comparison, direction) ||
      right.draftYear - left.draftYear ||
      left.draftOverallPick - right.draftOverallPick;
  });
}

function compareDraftOutcomes(
  left: DraftPlayerOutcome,
  right: DraftPlayerOutcome,
  sort: DraftSort,
): number {
  switch (sort) {
    case "player":
      return right.name.localeCompare(left.name);
    case "year":
      return left.draftYear - right.draftYear;
    case "team":
      return right.draftTeamName.localeCompare(left.draftTeamName);
    case "round":
      return right.draftRound - left.draftRound;
    case "position":
      return formatPlayerPosition(right.position).localeCompare(formatPlayerPosition(left.position));
    case "country":
      return (right.birthCountry ?? "").localeCompare(left.birthCountry ?? "");
    case "overall":
    default:
      return right.draftOverallPick - left.draftOverallPick;
  }
}

function draftViewTabs({
  view,
  selectedYear,
  selectedTeam,
  selectedFromYear,
  selectedToYear,
}: {
  view: DraftView;
  selectedYear: number | null;
  selectedTeam: string;
  selectedFromYear: number | null;
  selectedToYear: number | null;
}) {
  const boardParams = new URLSearchParams({ view: "board" });
  if (view !== "teams" && selectedYear !== null) {
    boardParams.set("year", String(selectedYear));
  }
  if (selectedTeam) boardParams.set("team", selectedTeam);

  const outcomeParams = new URLSearchParams({ view: "outcomes" });
  if (view !== "teams" && selectedYear !== null) {
    outcomeParams.set("year", String(selectedYear));
  }

  const teamParams = new URLSearchParams({ view: "teams" });
  if (selectedFromYear !== null) teamParams.set("from", String(selectedFromYear));
  if (selectedToYear !== null) teamParams.set("to", String(selectedToYear));

  return [
    { id: "board" as const, label: "Draft Board", href: `/drafts?${boardParams.toString()}` },
    { id: "outcomes" as const, label: "Player Outcomes", href: `/drafts?${outcomeParams.toString()}` },
    { id: "teams" as const, label: "Team Drafting", href: `/drafts?${teamParams.toString()}` },
  ];
}

function parseDraftView(value: string | undefined): DraftView {
  if (value === "teams") return "teams";
  if (value === "outcomes" || value === "pick-value") return "outcomes";
  return "board";
}

function parseDraftSort(value: string | undefined, fallback: DraftSort): DraftSort {
  return value === "player" ||
    value === "year" ||
    value === "team" ||
    value === "round" ||
    value === "overall" ||
    value === "position" ||
    value === "country"
    ? value
    : fallback;
}

function parseDraftYear(value: string | undefined): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1963 ? parsed : null;
}

function parseRound(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 30 ? parsed : null;
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function NumberCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}
