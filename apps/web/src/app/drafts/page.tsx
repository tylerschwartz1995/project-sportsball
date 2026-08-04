import Link from "next/link";
import type { CSSProperties } from "react";

import { AutoSubmitSelect } from "@/app/_components/auto-submit-select";
import { ClassRankingVisuals } from "@/app/_components/class-ranking-visuals";
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
import { WorkspaceModal } from "@/app/_components/workspace-modal";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type {
  DraftAnalytics,
  DraftClassPerformance,
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

type DraftView = "board" | "outcomes" | "teams" | "classes";
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

const teamPickOutcomeColumns = [
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

const classPerformanceColumns = [
  {
    label: "Draft",
    sortKey: "class",
    align: "left",
    defaultDirection: "desc",
    description: "Draft year; open the class to inspect its players",
  },
  {
    label: "Picks",
    sortKey: "selections",
    description: "Official selections in the draft class",
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
    label: "500+ Rate",
    sortKey: "five-hundred-rate",
    description: "Share of selections who reached 500 NHL games",
  },
  {
    label: "Games / Pick",
    sortKey: "average-games",
    description: "Average regular-season NHL games per official selection",
  },
  {
    label: "Points / Skater",
    sortKey: "points",
    description: "Career points divided by all non-goalie selections",
  },
  {
    label: "Game Score / Skater*",
    sortKey: "game-score",
    description:
      "Stored career MoneyPuck Game Score divided by all non-goalie selections",
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
  const requestedTeam = view === "board" || view === "teams"
    ? (firstQueryValue(params.team) ?? "")
    : "";
  const requestedFromYear = parseDraftYear(firstQueryValue(params.from));
  const requestedToYear = parseDraftYear(firstQueryValue(params.to));
  const boardYearRange =
    view === "board" &&
    allYears &&
    requestedFromYear !== null &&
    requestedToYear !== null;
  const analytics = await getDraftAnalytics(
    view === "teams"
      ? {
          yearRange: true,
          fromYear: requestedFromYear,
          toYear: requestedToYear,
          includeAdvanced: true,
        }
      : view === "classes"
        ? {
            allYears: true,
            includeAdvanced: true,
          }
      : boardYearRange
        ? {
            allYears: true,
            yearRange: true,
            fromYear: requestedFromYear,
            toYear: requestedToYear,
            teamAbbreviation: requestedTeam || null,
          }
      : {
          draftYear: requestedYear,
          teamAbbreviation: requestedTeam || null,
          allYears,
          defaultYear: view === "outcomes" ? "mature" : "latest",
          includeAdvanced: view === "outcomes",
        },
  );
  const selectedBoardTeam = view === "board"
    ? (analytics.selectedTeamAbbreviation ?? "")
    : "";
  const selectedDraftingTeam =
    view === "teams" &&
    analytics.teamOptions.some(
      (team) => team.abbreviation === requestedTeam,
    )
      ? requestedTeam
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
            selectedTeam: selectedBoardTeam,
            selectedDraftingTeam,
            selectedFromYear: analytics.selectedFromYear,
            selectedToYear: analytics.selectedToYear,
          })}
        />

        {view === "board" ? (
          <DraftBoardView
            analytics={analytics}
            params={params}
            selectedTeam={selectedBoardTeam}
          />
        ) : null}

        {view === "outcomes" ? (
          <PlayerOutcomesView analytics={analytics} />
        ) : null}

        {view === "teams" ? (
          <TeamDraftingView
            analytics={analytics}
            selectedTeam={selectedDraftingTeam}
          />
        ) : null}

        {view === "classes" ? (
          <ClassRankingsView analytics={analytics} />
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
  const fromYear = analytics.selectedFromYear;
  const toYear = analytics.selectedToYear;
  const tableParams = {
    view: "board",
    year: selectedYear,
    team: selectedTeam || undefined,
    round: selectedRound ?? undefined,
    q: query || undefined,
    from: fromYear ?? undefined,
    to: toYear ?? undefined,
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
        fromYear={fromYear}
        toYear={toYear}
      />

      <WorkspacePanel
        className="mt-7"
        title={
          analytics.allYears
            ? fromYear !== null && toYear !== null
              ? `${fromYear}–${toYear} Draft Board`
              : "Complete Draft Archive"
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
            fromYear={fromYear}
            toYear={toYear}
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

function TeamDraftingView({
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

function ClassRankingsView({ analytics }: { analytics: DraftAnalytics }) {
  const rows = analytics.classPerformance
    .filter(
      (draftClass) =>
        analytics.latestMatureDraftYear === null ||
        draftClass.draftYear <= analytics.latestMatureDraftYear,
    )
    .sort(
      (left, right) =>
        right.averageGames - left.averageGames ||
        right.draftYear - left.draftYear,
    );
  const rankedYears = rows.map((draftClass) => draftClass.draftYear);
  const earliestYear = rankedYears.length > 0 ? Math.min(...rankedYears) : null;
  const latestYear = rankedYears.length > 0 ? Math.max(...rankedYears) : null;

  return rows.length > 0 ? (
    <>
      <WorkspacePanel
        className="mt-7"
        title="Draft Class Rankings"
        description={`Comparing mature draft classes from ${earliestYear ?? "—"} through ${latestYear ?? "—"}. Sort any metric to choose how quality is defined; career totals continue to grow for active players.`}
      >
        <ClassPerformanceTable rows={rows} />
      </WorkspacePanel>
      <ClassRankingVisuals rows={rows} />
    </>
  ) : (
    <div className="workspace-empty-state mt-7">
      No mature draft classes are available to compare.
    </div>
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
  fromYear,
  toYear,
}: {
  years: number[];
  teams: DraftTeamOption[];
  rounds: number[];
  selectedYear: number | null;
  selectedTeam: string;
  selectedRound: number | null;
  allYears: boolean;
  query: string;
  fromYear: number | null;
  toYear: number | null;
}) {
  const resetYear = allYears ? "all" : selectedYear;
  const resetParams = new URLSearchParams({ view: "board" });
  if (resetYear !== null) resetParams.set("year", String(resetYear));
  if (fromYear !== null) resetParams.set("from", String(fromYear));
  if (toYear !== null) resetParams.set("to", String(toYear));
  const resetHref = `/drafts?${resetParams.toString()}`;

  return (
    <form method="get" className="workspace-draft-filters is-board">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="q" value={query} />
      <input type="hidden" name="from" value={fromYear ?? ""} />
      <input type="hidden" name="to" value={toYear ?? ""} />
      <label>
        Draft Year
        <AutoSubmitSelect
          name="year"
          defaultValue={allYears ? "all" : (selectedYear ?? "")}
          resetFields={["team"]}
        >
          <option value="all">
            {fromYear !== null && toYear !== null
              ? `${fromYear}–${toYear} Window`
              : "All Drafts"}
          </option>
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
  fromYear,
  toYear,
}: {
  selectedYear: number | "all";
  selectedTeam: string;
  selectedRound: number | null;
  query: string;
  fromYear: number | null;
  toYear: number | null;
}) {
  return (
    <form method="get" className="workspace-draft-table-search">
      <input type="hidden" name="view" value="board" />
      <input type="hidden" name="year" value={selectedYear} />
      <input type="hidden" name="team" value={selectedTeam} />
      <input type="hidden" name="round" value={selectedRound ?? ""} />
      <input type="hidden" name="from" value={fromYear ?? ""} />
      <input type="hidden" name="to" value={toYear ?? ""} />
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
  selectedTeam,
}: {
  years: number[];
  fromYear: number | null;
  toYear: number | null;
  matureThrough: number | null;
  selectedTeam: string;
}) {
  const matureYears = years.filter(
    (year) => matureThrough === null || year <= matureThrough,
  );
  return (
    <form method="get" className="workspace-draft-filters is-range">
      <input type="hidden" name="view" value="teams" />
      <input type="hidden" name="team" value={selectedTeam} />
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

function TeamPerformanceTable({
  rows,
  fromYear,
  toYear,
}: {
  rows: DraftTeamPerformance[];
  fromYear: number | null;
  toYear: number | null;
}) {
  return (
    <SortableTable defaultSortKey="hundred-rate">
      <div className="workspace-table-scroll">
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
      </div>
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

function TeamPickOutcomesPanel({
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
      <dl className="workspace-team-pick-summary">
        <TeamPickSummaryItem label="Picks" value={team.selections} />
        <TeamPickSummaryItem
          label="NHL Rate"
          value={formatPercentage(team.appearanceRate)}
        />
        <TeamPickSummaryItem
          label="100+ Rate"
          value={formatPercentage(team.hundredGameRate)}
        />
        <TeamPickSummaryItem
          label="GP / Pick"
          value={Math.round(team.averageGames)}
        />
        <TeamPickSummaryItem
          label="Value +/-"
          value={formatSignedNumber(team.valueAboveExpected)}
        />
        <TeamPickSummaryItem
          label="GS / Skater"
          value={
            team.gameScorePerSkaterPick === null
              ? "—"
              : Math.round(team.gameScorePerSkaterPick)
          }
        />
      </dl>
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

function TeamPickSummaryItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TeamPickOutcomesTable({ rows }: { rows: DraftPlayerOutcome[] }) {
  return (
    <SortableTable
      defaultSortKey="games"
      className="workspace-team-picks-table-shell"
    >
      <div className="workspace-table-scroll workspace-team-picks-scroll">
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
      </div>
    </SortableTable>
  );
}

function MetricCell({
  value,
  displayValue,
}: {
  value: number | null;
  displayValue?: number | string;
}) {
  return (
    <td data-sort-value={value ?? undefined}>
      {value === null
        ? "—"
        : (displayValue ?? value.toLocaleString("en-CA"))}
    </td>
  );
}

function ClassPerformanceTable({ rows }: { rows: DraftClassPerformance[] }) {
  const advancedCoverageYears = rows
    .filter((row) => row.gameScorePerSkaterPick !== null)
    .map((row) => row.draftYear);
  const advancedCoverage =
    advancedCoverageYears.length > 0
      ? `${Math.min(...advancedCoverageYears)}–${Math.max(...advancedCoverageYears)}`
      : "Unavailable";
  const heatValues = {
    appearance: sortedValues(rows.map((row) => row.appearanceRate)),
    hundredGames: sortedValues(rows.map((row) => row.hundredGameRate)),
    fiveHundredGames: sortedValues(
      rows.map((row) => row.fiveHundredGameRate),
    ),
    averageGames: sortedValues(rows.map((row) => row.averageGames)),
    points: sortedValues(rows.map((row) => row.pointsPerSkaterPick)),
    gameScore: sortedValues(rows.map((row) => row.gameScorePerSkaterPick)),
  };

  return (
    <>
      <aside
        className="workspace-class-ranking-guide"
        aria-label="How to read the class ranking metrics"
      >
        <p>
          <strong>How to read these rankings</strong>
          <span>
            Higher values indicate more career return from the full class.
            Older classes have had more time to accumulate games, points, and
            Game Score.
          </span>
        </p>
        <div className="workspace-class-heat-guide">
          <div aria-hidden="true">
            <span>Lower</span>
            <i />
            <span>Higher</span>
          </div>
          <p>
            The sorted metric becomes the heatmap. Five distinct color bands
            separate lower from higher values; choose another header to recolor
            the comparison.
          </p>
          <small>Game Score coverage: {advancedCoverage} draft classes</small>
        </div>
        <dl>
          <div>
            <dt>Appearance and milestone percentages</dt>
            <dd>How often picks reached the NHL, 100 games, or 500 games.</dd>
          </div>
          <div>
            <dt>NHL Games / Pick</dt>
            <dd>Average career regular-season games across every selection.</dd>
          </div>
          <div>
            <dt>Points / Skater Pick</dt>
            <dd>Average career points across every non-goalie selection.</dd>
          </div>
          <div>
            <dt>Game Score / Skater Pick*</dt>
            <dd>
              Average cumulative MoneyPuck all-around impact across every
              non-goalie selection.
            </dd>
          </div>
        </dl>
      </aside>
      <SortableTable
        defaultSortKey="average-games"
        className="workspace-class-rankings-sort"
      >
        <div className="workspace-table-scroll">
          <table className="workspace-table workspace-table-dense workspace-class-rankings-table">
            <colgroup>
              <col className="workspace-class-rankings-class-col" />
              <col className="workspace-class-rankings-picks-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-rate-col" />
              <col className="workspace-class-rankings-games-col" />
              <col className="workspace-class-rankings-points-col" />
              <col className="workspace-class-rankings-score-col" />
            </colgroup>
            <thead>
              <tr className="workspace-class-ranking-groups" aria-hidden="true">
                <th colSpan={2}>Class</th>
                <th colSpan={3}>Milestone Rates</th>
                <th colSpan={2}>Career Return</th>
                <th>Advanced*</th>
              </tr>
              <tr>
                {classPerformanceColumns.map((column) => (
                  <SortableHeader key={column.sortKey} {...column} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((draftClass) => (
                <tr key={draftClass.draftYear}>
                  <td className="workspace-team-cell">
                    <Link
                      href={`/drafts?view=outcomes&year=${draftClass.draftYear}`}
                    >
                      <strong>{draftClass.draftYear} Draft</strong>
                    </Link>
                  </td>
                  <NumberCell value={draftClass.selections} />
                  <ClassMetricCell
                    metricKey="appearance-rate"
                    value={draftClass.appearanceRate}
                    displayValue={formatPercentage(draftClass.appearanceRate)}
                    comparisonValues={heatValues.appearance}
                  />
                  <ClassMetricCell
                    metricKey="hundred-rate"
                    value={draftClass.hundredGameRate}
                    displayValue={formatPercentage(draftClass.hundredGameRate)}
                    comparisonValues={heatValues.hundredGames}
                  />
                  <ClassMetricCell
                    metricKey="five-hundred-rate"
                    value={draftClass.fiveHundredGameRate}
                    displayValue={formatPercentage(
                      draftClass.fiveHundredGameRate,
                    )}
                    comparisonValues={heatValues.fiveHundredGames}
                  />
                  <ClassMetricCell
                    metricKey="average-games"
                    value={draftClass.averageGames}
                    displayValue={Math.round(draftClass.averageGames)}
                    comparisonValues={heatValues.averageGames}
                  />
                  <ClassMetricCell
                    metricKey="points"
                    value={draftClass.pointsPerSkaterPick}
                    displayValue={
                      draftClass.pointsPerSkaterPick === null
                        ? "—"
                        : Math.round(draftClass.pointsPerSkaterPick)
                    }
                    comparisonValues={heatValues.points}
                  />
                  <ClassMetricCell
                    metricKey="game-score"
                    value={draftClass.gameScorePerSkaterPick}
                    displayValue={
                      draftClass.gameScorePerSkaterPick === null
                        ? "—"
                        : Math.round(draftClass.gameScorePerSkaterPick)
                    }
                    comparisonValues={heatValues.gameScore}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="workspace-table-note">
          Five heat bands show where a class falls within the displayed range
          for the sorted metric; they are not a combined grade. Rates use every
          official selection as the denominator. Points and Game Score exclude
          goalies but include zero-game skater picks. Game Score uses stored
          all-situations data from{" "}
          <a href="https://moneypuck.com" target="_blank" rel="noreferrer">
            MoneyPuck.com
          </a>. A class is shown as unavailable when any NHL skater lacks
          advanced coverage.
        </div>
      </SortableTable>
    </>
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
  selectedDraftingTeam,
  selectedFromYear,
  selectedToYear,
}: {
  view: DraftView;
  selectedYear: number | null;
  selectedTeam: string;
  selectedDraftingTeam: string;
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
  if (selectedDraftingTeam) teamParams.set("team", selectedDraftingTeam);

  const classParams = new URLSearchParams({ view: "classes" });

  return [
    { id: "board" as const, label: "Draft Board", href: `/drafts?${boardParams.toString()}` },
    { id: "outcomes" as const, label: "Player Outcomes", href: `/drafts?${outcomeParams.toString()}` },
    { id: "teams" as const, label: "Team Drafting", href: `/drafts?${teamParams.toString()}` },
    { id: "classes" as const, label: "Class Rankings", href: `/drafts?${classParams.toString()}` },
  ];
}

function parseDraftView(value: string | undefined): DraftView {
  if (value === "teams") return "teams";
  if (value === "classes") return "classes";
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

function formatSignedNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : rounded.toString();
}

function formatSignedDecimal(value: number): string {
  const formatted = value.toFixed(1);
  return value > 0 ? `+${formatted}` : formatted;
}

function NumberCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function ClassMetricCell({
  metricKey,
  value,
  displayValue,
  comparisonValues,
}: {
  metricKey: string;
  value: number | null;
  displayValue: number | string;
  comparisonValues: number[];
}) {
  if (value === null) {
    return (
      <td
        className="workspace-number-cell workspace-class-metric-cell is-unavailable"
        data-metric={metricKey}
      >
        {displayValue}
      </td>
    );
  }

  const rangePosition = relativeRangePosition(comparisonValues, value);
  const heatLevel = Math.min(4, Math.floor(rangePosition * 5));
  const heatStrength = [12, 28, 44, 60, 76][heatLevel];
  const style = {
    "--heat-strength": `${heatStrength}%`,
  } as CSSProperties;

  return (
    <td
      className="workspace-number-cell workspace-class-metric-cell"
      data-heat-level={heatLevel + 1}
      data-metric={metricKey}
      data-sort-value={value}
      style={style}
    >
      {displayValue}
    </td>
  );
}

function sortedValues(values: Array<number | null>): number[] {
  return values
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
}

function relativeRangePosition(sortedNumbers: number[], value: number): number {
  const minimum = sortedNumbers[0] ?? value;
  const maximum = sortedNumbers.at(-1) ?? value;

  if (maximum === minimum) return 0.5;

  return (value - minimum) / (maximum - minimum);
}
