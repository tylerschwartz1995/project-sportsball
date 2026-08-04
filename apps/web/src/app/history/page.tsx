import Link from "next/link";
import { unstable_cache } from "next/cache";

import {
  HistoryDecadeLeaders,
  HistoryEraTable,
  HistoryExplorerNav,
  HistoryFilters,
  HistoryLeaderboardTable,
  HistoryPeaksTable,
  HistoryRankingSummary,
  HistoryRecordBook,
} from "@/app/_components/history-record-book";
import {
  HistoryRecordProgression,
  HistoryScoringEnvironment,
} from "@/app/_components/history-visuals";
import { Pagination } from "@/app/_components/pagination";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { ViewTabs } from "@/app/_components/view-tabs";
import { WorkspacePanel } from "@/app/_components/workspace-primitives";
import type {
  HistoryDisplay,
  HistoryFilters as HistoryFilterValues,
  HistoryMetric,
  HistorySection,
  HistoryView,
} from "@/contracts/history";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  type SeasonPhase,
} from "@/contracts/season-phase";
import {
  getHistoricalDecadeLeaders,
  getHistoricalEraScores,
  getHistoricalLeaderboard,
  getHistoricalPeaks,
  getHistoryFilterOptions,
  getHistoryLeagueTrend,
  getHistoryOverview,
  historyDefaultMinimumGames,
  parseHistoryFilters,
  parseHistoryMetric,
  parseHistoryView,
} from "@/data/history";
import { parsePage } from "@/lib/directory";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const loadHistoryOverview = unstable_cache(
  getHistoryOverview,
  ["history-record-book-overview"],
  { revalidate: 3_600 },
);
const loadHistoryFilterOptions = unstable_cache(
  getHistoryFilterOptions,
  ["history-filter-options"],
  { revalidate: 3_600 },
);
const loadHistoryLeagueTrend = unstable_cache(
  getHistoryLeagueTrend,
  ["history-league-trend"],
  { revalidate: 3_600 },
);
const loadHistoricalDecadeLeaders = unstable_cache(
  getHistoricalDecadeLeaders,
  ["history-decade-leaders"],
  { revalidate: 3_600 },
);

type HistoryPageProps = {
  searchParams: Promise<{
    section?: string | string[];
    entity?: string | string[];
    view?: string | string[];
    display?: string | string[];
    phase?: string | string[];
    metric?: string | string[];
    startYear?: string | string[];
    endYear?: string | string[];
    minimumGames?: string | string[];
    position?: string | string[];
    team?: string | string[];
    country?: string | string[];
    page?: string | string[];
    window?: string | string[];
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const section = parseHistorySection(
    firstValue(params.section),
    firstValue(params.display),
    firstValue(params.view),
  );
  const phase = parseSeasonPhase(firstValue(params.phase));
  const sectionTabs = historySectionTabs(section, phase);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="history" />
      <section className="py-8 sm:py-10">
        <HistoryHeader phase={phase} />
        <div className="workspace-history-primary-navs">
          <SeasonPhaseFilter
            active={phase}
            path="/history"
            params={historyPhaseParams(section, params)}
          />
          <ViewTabs
            active={section}
            ariaLabel="History views"
            tabs={sectionTabs}
          />
        </div>
        {section === "overview" ? (
          <HistoryOverviewContent phase={phase} />
        ) : section === "careers" || section === "seasons" ? (
          <HistoryLeaderboardContent params={params} section={section} phase={phase} />
        ) : section === "peaks" ? (
          <HistoryPeaksContent params={params} phase={phase} />
        ) : (
          <HistoryErasContent params={params} phase={phase} />
        )}
      </section>
    </main>
  );
}

function HistoryHeader({ phase }: { phase: SeasonPhase }) {
  return (
    <header className="workspace-history-header">
      <div className="workspace-history-header-copy">
        <h1>NHL History</h1>
        <p>
          Career, season, peak, and era-adjusted {phase === "regular" ? "regular-season" : "playoff"} records.
        </p>
      </div>
      <details>
        <summary>Data coverage</summary>
        <p>
          Basic scoring, goalie results, and team results begin in 1917–18.
          Later statistics keep their real source cutoffs; unavailable values
          are never treated as zero. Birth-country filters include only known
          profiles, and “Played For” selects whole seasons associated with that
          team rather than attempting to split multi-team season totals.
        </p>
      </details>
    </header>
  );
}

async function HistoryOverviewContent({ phase }: { phase: SeasonPhase }) {
  const overview = await loadHistoryOverview(gameTypeForPhase(phase));
  return (
    <div className="workspace-history-overview">
      <section className="workspace-history-intro">
        <div><h2>Record Leaders</h2></div>
        <p>Career and single-season leaders for skaters, goalies, and teams.</p>
      </section>
      <HistoryRecordBook overview={overview} phase={phase} />
      <div className="workspace-history-chart-grid">
        <HistoryRecordProgression points={overview.recordProgression} />
        <HistoryScoringEnvironment points={overview.leagueTrend} />
      </div>
      <section className="workspace-history-discovery">
        <Link href={`/history?section=peaks&phase=${phase}`}><span>3- and 5-season windows</span><strong>Peak Rankings →</strong></Link>
        <Link href={`/history?section=eras&phase=${phase}`}><span>League-adjusted scoring rates</span><strong>Era-Adjusted Scoring →</strong></Link>
        <Link href={`/history?section=seasons&entity=skaters&metric=points&phase=${phase}`}><span>Qualified historical rankings</span><strong>Single-Season Rankings →</strong></Link>
      </section>
    </div>
  );
}

async function HistoryLeaderboardContent({
  params,
  section,
  phase,
}: {
  params: Awaited<HistoryPageProps["searchParams"]>;
  section: "careers" | "seasons";
  phase: SeasonPhase;
}) {
  const view = parseHistoryView(firstValue(params.entity) ?? firstValue(params.view));
  const metric = parseHistoryMetric(view, firstValue(params.metric));
  const display: HistoryDisplay = section === "seasons" ? "seasons" : "career";
  const gameType = gameTypeForPhase(phase);
  const defaultMinimum = historyDefaultMinimumGames(view, metric, display, gameType);
  const filters = historyFiltersFromParams(params, defaultMinimum);
  const page = parsePage(firstValue(params.page));
  const [leaderboard, options] = await Promise.all([
    getHistoricalLeaderboard(view, display, metric, gameType, filters, page, PAGE_SIZE),
    loadHistoryFilterOptions(gameType),
  ]);
  const qualificationIsDefault = firstValue(params.minimumGames) === undefined;
  const metricLinks = metricOptions(view).map((option) => ({
    ...option,
    href: historyHref({
      section,
      phase,
      view,
      metric: option.metric,
      filters,
      omitMinimum: qualificationIsDefault,
    }),
  }));
  const entityHrefs = entityLinks(
    section,
    phase,
    filters,
    qualificationIsDefault,
  );
  const totalPages = Math.max(1, Math.ceil(leaderboard.totalRows / PAGE_SIZE));
  const paginationParams = historyQueryParams(section, phase, view, leaderboard.metric, filters);
  if (qualificationIsDefault) paginationParams.minimumGames = undefined;

  return (
    <div className="workspace-history-explorer">
      <HistoryExplorerNav
        view={view}
        metric={leaderboard.metric}
        entityHrefs={entityHrefs}
        metricHrefs={metricLinks}
        showMetricNav={false}
      />
      <HistoryRankingSummary leaderboard={leaderboard} filters={filters} phase={phase} metricLabel={metricLabel(leaderboard.metric)} />
      {defaultMinimum > 0 && qualificationIsDefault ? (
        <p className="workspace-history-qualification">
          <strong>Qualified leaderboard:</strong> {filters.minimumGames.toLocaleString("en-CA")} games is applied automatically so short appearances do not outrank sustained performance. You can change it below.
        </p>
      ) : null}
      <HistoryFilters
        section={section}
        view={view}
        metric={leaderboard.metric}
        phase={phase}
        filters={filters}
        options={options}
        isOpen={hasCustomFilters(params, defaultMinimum)}
      />
      <WorkspacePanel
        className="mt-5"
        title={`${metricLabel(leaderboard.metric)} Ranking`}
        description={`Showing ${pageStart(page, leaderboard.rows.length)}–${pageEnd(page, leaderboard.rows.length)} of ${leaderboard.totalRows.toLocaleString("en-CA")} eligible ${view}. Select a supported column heading to rerank the complete result set.`}
      >
        <HistoryLeaderboardTable leaderboard={leaderboard} metricHrefs={Object.fromEntries(metricLinks.map((item) => [item.metric, item.href]))} />
      </WorkspacePanel>
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={paginationParams} />
    </div>
  );
}

async function HistoryPeaksContent({
  params,
  phase,
}: {
  params: Awaited<HistoryPageProps["searchParams"]>;
  phase: SeasonPhase;
}) {
  const parsedView = parseHistoryView(firstValue(params.entity) ?? firstValue(params.view));
  const view: "skaters" | "goalies" = parsedView === "goalies" ? "goalies" : "skaters";
  const metric = parsePeakMetric(view, firstValue(params.metric));
  const window = firstValue(params.window) === "5" ? 5 : 3;
  const defaultMinimum = gameTypeForPhase(phase) === 3 ? window * 8 : window * 40;
  const filters = historyFiltersFromParams(params, defaultMinimum);
  const page = parsePage(firstValue(params.page));
  const gameType = gameTypeForPhase(phase);
  const [rows, options] = await Promise.all([
    getHistoricalPeaks(view, metric, window, gameType, filters, page, PAGE_SIZE),
    loadHistoryFilterOptions(gameType),
  ]);
  const totalRows = rows[0]?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const peakMetrics = peakMetricOptions(view).map((option) => ({
    ...option,
    href: historyHref({ section: "peaks", phase, view, metric: option.metric, filters, window }),
  }));
  const entityHrefs = {
    skaters: historyHref({ section: "peaks", phase, view: "skaters", metric: "points", filters, window }),
    goalies: historyHref({ section: "peaks", phase, view: "goalies", metric: "wins", filters, window }),
    teams: historyHref({ section: "peaks", phase, view: "skaters", metric: "points", filters, window }),
  };
  return (
    <div className="workspace-history-explorer">
      <HistoryExplorerNav view={view} metric={metric} entityHrefs={entityHrefs} metricHrefs={peakMetrics} entities={["skaters", "goalies"]} />
      <div className="workspace-history-peaks-heading">
        <div><h2>{window}-Season Peaks</h2><span>Consecutive-season windows with at least {filters.minimumGames} total games.</span></div>
        <nav aria-label="Peak length">
          {[3, 5].map((value) => <Link key={value} aria-current={window === value ? "page" : undefined} href={historyHref({ section: "peaks", phase, view, metric, filters, window: value as 3 | 5 })}>{value} Seasons</Link>)}
        </nav>
      </div>
      <HistoryFilters section="peaks" view={view} metric={metric} phase={phase} filters={filters} options={options} isOpen={hasCustomFilters(params, defaultMinimum)} />
      <WorkspacePanel className="mt-5" title={`${metricLabel(metric)} Peaks`} description={`Showing ${pageStart(page, rows.length)}–${pageEnd(page, rows.length)} of ${totalRows.toLocaleString("en-CA")} eligible consecutive-season stretches.`}>
        <HistoryPeaksTable rows={rows} metricLabel={metricLabel(metric)} window={window} />
      </WorkspacePanel>
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={{ ...historyQueryParams("peaks", phase, view, metric, filters), window }} />
    </div>
  );
}

async function HistoryErasContent({
  params,
  phase,
}: {
  params: Awaited<HistoryPageProps["searchParams"]>;
  phase: SeasonPhase;
}) {
  const defaultMinimum = gameTypeForPhase(phase) === 3 ? 100 : 500;
  const filters = historyFiltersFromParams(params, defaultMinimum);
  const page = parsePage(firstValue(params.page));
  const gameType = gameTypeForPhase(phase);
  const [scores, decades, leagueTrend, options] = await Promise.all([
    getHistoricalEraScores(gameType, filters, page, PAGE_SIZE),
    loadHistoricalDecadeLeaders(gameType),
    loadHistoryLeagueTrend(gameType),
    loadHistoryFilterOptions(gameType),
  ]);
  const totalRows = scores[0]?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  return (
    <div className="workspace-history-eras">
      <section className="workspace-history-intro">
        <div><h2>Era-Adjusted Scoring</h2></div>
        <div className="workspace-history-era-definition">
          <p>Era Score adjusts a player’s points per game for the league scoring rate during the same seasons.</p>
          <dl aria-label="Era Score reference values">
            <div><dt>100</dt><dd>League average</dd></div>
            <div><dt>200</dt><dd>2× league average</dd></div>
          </dl>
        </div>
      </section>
      <HistoryScoringEnvironment points={leagueTrend} />
      <HistoryDecadeLeaders rows={decades} />
      <HistoryFilters section="eras" view="skaters" metric="pointsPerGame" phase={phase} filters={filters} options={options} isOpen={hasCustomFilters(params, defaultMinimum)} />
      <WorkspacePanel className="mt-5" title="Career Era Scores" description={`Qualified at ${filters.minimumGames.toLocaleString("en-CA")} games. Showing ${pageStart(page, scores.length)}–${pageEnd(page, scores.length)} of ${totalRows.toLocaleString("en-CA")} eligible skaters.`}>
        <HistoryEraTable rows={scores} />
      </WorkspacePanel>
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={historyQueryParams("eras", phase, "skaters", "pointsPerGame", filters)} />
    </div>
  );
}

function historySectionTabs(active: HistorySection, phase: SeasonPhase) {
  const tabs: Array<{ id: HistorySection; label: string }> = [
    { id: "overview", label: "Record Book" },
    { id: "careers", label: "Careers" },
    { id: "seasons", label: "Single Seasons" },
    { id: "peaks", label: "Peaks" },
    { id: "eras", label: "Era Adjusted" },
  ];
  return tabs.map((tab) => ({ ...tab, href: `/history?section=${tab.id}&phase=${phase}`, active }));
}

function parseHistorySection(value: string | undefined, legacyDisplay: string | undefined, legacyView: string | undefined): HistorySection {
  if (value === "careers" || value === "seasons" || value === "peaks" || value === "eras") return value;
  if (value === "overview") return value;
  if (legacyDisplay === "seasons") return "seasons";
  if (legacyView) return "careers";
  return "overview";
}

function historyFiltersFromParams(params: Awaited<HistoryPageProps["searchParams"]>, defaultMinimum: number): HistoryFilterValues {
  return parseHistoryFilters({
    startYear: firstValue(params.startYear),
    endYear: firstValue(params.endYear),
    minimumGames: firstValue(params.minimumGames) ?? String(defaultMinimum),
    position: firstValue(params.position),
    team: firstValue(params.team),
    country: firstValue(params.country),
  });
}

function metricOptions(view: HistoryView): Array<{ metric: HistoryMetric; label: string }> {
  if (view === "goalies") return [{ metric: "wins", label: "Wins" }, { metric: "games", label: "Games" }, { metric: "shutouts", label: "Shutouts" }, { metric: "savePercentage", label: "Save %" }];
  if (view === "teams") return [{ metric: "points", label: "Points" }, { metric: "wins", label: "Wins" }, { metric: "pointPercentage", label: "Points %" }];
  return [{ metric: "points", label: "Points" }, { metric: "goals", label: "Goals" }, { metric: "assists", label: "Assists" }, { metric: "games", label: "Games" }, { metric: "pointsPerGame", label: "Points / Game" }];
}

function peakMetricOptions(view: "skaters" | "goalies") {
  return view === "goalies"
    ? [{ metric: "wins" as const, label: "Wins" }, { metric: "shutouts" as const, label: "Shutouts" }]
    : [{ metric: "points" as const, label: "Points" }, { metric: "goals" as const, label: "Goals" }, { metric: "assists" as const, label: "Assists" }];
}

function parsePeakMetric(view: "skaters" | "goalies", value: string | undefined): HistoryMetric {
  if (view === "goalies") return value === "shutouts" ? "shutouts" : "wins";
  return value === "goals" || value === "assists" ? value : "points";
}

function metricLabel(metric: HistoryMetric): string {
  return ({ points: "Points", goals: "Goals", assists: "Assists", games: "Games Played", pointsPerGame: "Points Per Game", wins: "Wins", shutouts: "Shutouts", savePercentage: "Save Percentage", pointPercentage: "Points Percentage" } as Record<HistoryMetric, string>)[metric];
}

function entityLinks(
  section: HistorySection,
  phase: SeasonPhase,
  filters: HistoryFilterValues,
  qualificationIsDefault: boolean,
): Record<HistoryView, string> {
  return {
    skaters: historyHref({ section, phase, view: "skaters", metric: "points", filters, omitMinimum: qualificationIsDefault }),
    goalies: historyHref({ section, phase, view: "goalies", metric: "wins", filters, omitMinimum: qualificationIsDefault }),
    teams: historyHref({ section, phase, view: "teams", metric: "points", filters, omitMinimum: qualificationIsDefault }),
  };
}

function historyHref({ section, phase, view, metric, filters, window, omitMinimum = false }: { section: HistorySection; phase: SeasonPhase; view: HistoryView; metric: HistoryMetric; filters: HistoryFilterValues; window?: 3 | 5; omitMinimum?: boolean }) {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    ...historyQueryParams(section, phase, view, metric, filters),
    window,
  };
  if (omitMinimum) values.minimumGames = undefined;
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); });
  return `/history?${params.toString()}`;
}

function historyQueryParams(section: HistorySection, phase: SeasonPhase, view: HistoryView, metric: HistoryMetric, filters: HistoryFilterValues): Record<string, string | number | undefined> {
  return { section, phase, entity: view, metric, startYear: filters.startYear, endYear: filters.endYear, minimumGames: filters.minimumGames, position: filters.position ?? undefined, team: filters.team ?? undefined, country: filters.country ?? undefined };
}

function historyPhaseParams(
  section: HistorySection,
  params: Awaited<HistoryPageProps["searchParams"]>,
): Record<string, string | number | undefined> {
  return {
    section,
    entity: firstValue(params.entity) ?? firstValue(params.view),
    metric: firstValue(params.metric),
    startYear: firstValue(params.startYear),
    endYear: firstValue(params.endYear),
    minimumGames: firstValue(params.minimumGames),
    position: firstValue(params.position),
    team: firstValue(params.team),
    country: firstValue(params.country),
    window: firstValue(params.window),
  };
}

function hasCustomFilters(params: Awaited<HistoryPageProps["searchParams"]>, defaultMinimum: number): boolean {
  const minimum = firstValue(params.minimumGames);
  return Boolean(firstValue(params.startYear) || firstValue(params.endYear) || firstValue(params.position) || firstValue(params.team) || firstValue(params.country) || (minimum !== undefined && Number(minimum) !== defaultMinimum));
}

function pageStart(page: number, count: number): number { return count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1; }
function pageEnd(page: number, count: number): number { return count === 0 ? 0 : (page - 1) * PAGE_SIZE + count; }
function firstValue(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
