import { Pagination } from "@/components/ui/pagination";
import {
  gameTypeForPhase,
  type SeasonPhase
} from "@/contracts/season-phase";
import {
  getHistoricalEraScores,
  getHistoricalGoalieEraScores,
  historyDefaultMinimumGames,
  parseHistoryView
} from "@/data/history";
import { HistorySupplement } from "@/features/history/history-supplement";

import {
  HistoryEraTable,
  HistoryExplorerNav,
  HistoryFilters,
  HistoryGoalieEraTable
} from "@/features/history/history-record-book";
import { parsePage } from "@/lib/directory";
import { HistoryPageProps, PAGE_SIZE, firstValue, hasCustomFilters, historyFiltersFromParams, historyHref, historyQueryParams, pageEnd, pageStart } from '../logic';
import { loadHistoryFilterOptions } from '../queries';
import { HistoryResultsSection } from './overview';
export async function HistoryErasContent({
  params,
  phase,
}: {
  params: Awaited<HistoryPageProps["searchParams"]>;
  phase: SeasonPhase;
}) {
  const parsedView = parseHistoryView(firstValue(params.entity) ?? firstValue(params.view));
  const view: "skaters" | "goalies" = parsedView === "goalies" ? "goalies" : "skaters";
  const metric = view === "goalies" ? "savePercentage" : "pointsPerGame";
  const gameType = gameTypeForPhase(phase);
  const defaultMinimum = historyDefaultMinimumGames(view, metric, "career", gameType);
  const filters = historyFiltersFromParams(params, defaultMinimum);
  const page = parsePage(firstValue(params.page));
  const qualificationIsDefault = firstValue(params.minimumGames) === undefined;
  const entityHrefs = {
    skaters: historyHref({ section: "eras", phase, view: "skaters", metric: "pointsPerGame", filters, omitMinimum: qualificationIsDefault }),
    goalies: historyHref({ section: "eras", phase, view: "goalies", metric: "savePercentage", filters, omitMinimum: qualificationIsDefault }),
    teams: historyHref({ section: "eras", phase, view: "skaters", metric: "pointsPerGame", filters, omitMinimum: qualificationIsDefault }),
  };

  if (view === "goalies") {
    const [scores, options] = await Promise.all([
      getHistoricalGoalieEraScores(gameType, filters, page, PAGE_SIZE),
      loadHistoryFilterOptions(gameType),
    ]);
    const totalRows = scores[0]?.totalRows ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    return (
      <div className="workspace-history-eras">
        <HistoryExplorerNav view={view} metric={metric} entityHrefs={entityHrefs} metricHrefs={[]} entities={["skaters", "goalies"]} showMetricNav={false} />
        <section className="workspace-history-intro">
          <div><h2>Era-Adjusted Goaltending</h2></div>
          <div className="workspace-history-era-definition">
            <p>Save Index compares the goals a goalie actually allowed with the number a league-average goalie would be expected to allow on the same shots in those same seasons. Only seasons with recorded saves and shots against are included.</p>
            <dl aria-label="Save Index reference values">
              <div><dt>100</dt><dd>At league average</dd></div>
              <div><dt>125</dt><dd>League average allows 25% more</dd></div>
              <div><dt>150</dt><dd>League average allows 50% more</dd></div>
            </dl>
          </div>
        </section>

        <HistoryFilters
          section="eras"
          view={view}
          metric={metric}
          phase={phase}
          filters={filters}
          options={options}
          isOpen={hasCustomFilters(params, defaultMinimum)}
          minimumIsCustom={!qualificationIsDefault}
        />
        <HistoryResultsSection title="Career Save Index" description={`Qualified at ${filters.minimumGames.toLocaleString("en-CA")} games with recorded shot data. Showing ${pageStart(page, scores.length)}–${pageEnd(page, scores.length)} of ${totalRows.toLocaleString("en-CA")} eligible goalies.`}>
          <HistoryGoalieEraTable rows={scores} />
        </HistoryResultsSection>
        <HistorySupplement phase={phase} view={view} />
        <Pagination path="/history" currentPage={page} totalPages={totalPages} params={historyQueryParams("eras", phase, view, metric, filters)} scrollTarget="history-results" />
      </div>
    );
  }

  const [scores, options] = await Promise.all([
    getHistoricalEraScores(gameType, filters, page, PAGE_SIZE),
    loadHistoryFilterOptions(gameType),
  ]);
  const totalRows = scores[0]?.totalRows ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  return (
    <div className="workspace-history-eras">
      <HistoryExplorerNav view={view} metric={metric} entityHrefs={entityHrefs} metricHrefs={[]} entities={["skaters", "goalies"]} showMetricNav={false} />
      <section className="workspace-history-intro">
        <div><h2>Era-Adjusted Scoring</h2></div>
        <div className="workspace-history-era-definition">
          <p>Era Score compares a player’s actual points with the total a league-average skater would be expected to produce over the same number of games in those same seasons.</p>
          <dl aria-label="Era Score reference values">
            <div><dt>100</dt><dd>At league average</dd></div>
            <div><dt>150</dt><dd>50% above average</dd></div>
            <div><dt>200</dt><dd>2× league average</dd></div>
          </dl>
        </div>
      </section>

      <HistoryFilters
        section="eras"
        view={view}
        metric={metric}
        phase={phase}
        filters={filters}
        options={options}
        isOpen={hasCustomFilters(params, defaultMinimum)}
        minimumIsCustom={!qualificationIsDefault}
      />
      <HistoryResultsSection title="Career Era Scores" description={`Qualified at ${filters.minimumGames.toLocaleString("en-CA")} games. Showing ${pageStart(page, scores.length)}–${pageEnd(page, scores.length)} of ${totalRows.toLocaleString("en-CA")} eligible skaters.`}>
        <HistoryEraTable rows={scores} />
      </HistoryResultsSection>
      <HistorySupplement phase={phase} view={view} />
      <Pagination path="/history" currentPage={page} totalPages={totalPages} params={historyQueryParams("eras", phase, view, metric, filters)} scrollTarget="history-results" />
    </div>
  );
}
