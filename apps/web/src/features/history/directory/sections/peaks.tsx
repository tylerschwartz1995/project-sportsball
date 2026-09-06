import { ContextLink as Link } from "@/components/ui/context-link";
import { Pagination } from "@/components/ui/pagination";
import {
  gameTypeForPhase,
  type SeasonPhase
} from "@/contracts/season-phase";
import {
  getHistoricalPeaks,
  parseHistoryView
} from "@/data/history";
import {
  HistoryExplorerNav,
  HistoryFilters,
  HistoryPeaksTable
} from "@/features/history/history-record-book";
import { parsePage } from "@/lib/directory";
import { HistoryPageProps, PAGE_SIZE, firstValue, hasCustomFilters, historyFiltersFromParams, historyHref, historyQueryParams, metricLabel, pageEnd, pageStart, parsePeakMetric, peakMetricOptions } from '../logic';
import { loadHistoryFilterOptions } from '../queries';
import { HistoryResultsSection } from './overview';
export async function HistoryPeaksContent({
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
      <HistoryFilters
        window={window}
        section="peaks"
        view={view}
        metric={metric}
        phase={phase}
        filters={filters}
        options={options}
        isOpen={hasCustomFilters(params, defaultMinimum)}
        minimumIsCustom={firstValue(params.minimumGames) !== undefined}
      />
      <HistoryResultsSection title={`${metricLabel(metric)} Peaks`} description={`Showing ${pageStart(page, rows.length)}–${pageEnd(page, rows.length)} of ${totalRows.toLocaleString("en-CA")} eligible consecutive-season stretches. A player may appear in multiple overlapping stretches.`}>
        <HistoryPeaksTable rows={rows} metricLabel={metricLabel(metric)} window={window} />
      </HistoryResultsSection>
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={{ ...historyQueryParams("peaks", phase, view, metric, filters), window }} scrollTarget="history-results" />
    </div>
  );
}
