import { Pagination } from "@/components/ui/pagination";
import type {
  HistoryDisplay
} from "@/contracts/history";
import {
  gameTypeForPhase,
  type SeasonPhase
} from "@/contracts/season-phase";
import {
  getHistoricalLeaderboard,
  historyDefaultMinimumGames,
  parseHistoryMetric,
  parseHistoryView
} from "@/data/history";
import {
  HistoryExplorerNav,
  HistoryFilters,
  HistoryLeaderboardTable,
  HistoryRankingSummary
} from "@/features/history/history-record-book";
import { parsePage } from "@/lib/directory";
import { HistoryPageProps, PAGE_SIZE, entityLinks, firstValue, hasCustomFilters, historyFiltersFromParams, historyHref, historyQueryParams, metricLabel, metricOptions, pageEnd, pageStart } from '../logic';
import { loadHistoryFilterOptions } from '../queries';
import { HistoryResultsSection } from './overview';
export async function HistoryLeaderboardContent({
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
        minimumIsCustom={!qualificationIsDefault}
      />
      <HistoryResultsSection
        title={`${metricLabel(leaderboard.metric)} Ranking`}
        description={`Showing ${pageStart(page, leaderboard.rows.length)}–${pageEnd(page, leaderboard.rows.length)} of ${leaderboard.totalRows.toLocaleString("en-CA")} eligible ${view}. Select a supported column heading to rerank the complete result set.`}
      >
        <HistoryLeaderboardTable leaderboard={leaderboard} metricHrefs={Object.fromEntries(metricLinks.map((item) => [item.metric, item.href]))} />
      </HistoryResultsSection>
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={paginationParams} scrollTarget="history-results" />
    </div>
  );
}
