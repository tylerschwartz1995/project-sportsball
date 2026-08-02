import Link from "next/link";

import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo, TeamLogoStack } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
  type WorkspaceWidth,
} from "@/app/_components/workspace-primitives";
import type {
  GoalieHistoryMetric,
  HistoricalGoalieCareer,
  HistoricalGoalieSeason,
  HistoricalSkaterCareer,
  HistoricalSkaterSeason,
  HistoricalTeamCareer,
  HistoricalTeamSeason,
  HistoryFilterOptions,
  HistoryFilters,
  HistoryMetric,
  HistoryView,
  SkaterHistoryMetric,
  TeamHistoryMetric,
} from "@/contracts/history";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
  type SeasonPhase,
} from "@/contracts/season-phase";
import {
  getHistoricalLeaders,
  getHistoryFilterOptions,
  parseHistoryFilters,
  parseHistoryMetric,
  parseHistoryView,
} from "@/data/history";

export const dynamic = "force-dynamic";

type HistoryDisplay = "career" | "seasons";

type HistoryPageProps = {
  searchParams: Promise<{
    phase?: string | string[];
    view?: string | string[];
    metric?: string | string[];
    startYear?: string | string[];
    endYear?: string | string[];
    minimumGames?: string | string[];
    position?: string | string[];
    team?: string | string[];
    country?: string | string[];
    display?: string | string[];
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const phase = parseSeasonPhase(firstValue(params.phase));
  const view = parseHistoryView(firstValue(params.view));
  const display = parseHistoryDisplay(firstValue(params.display));
  const contentWidth = historyContentWidth(view, display);
  const metric = parseHistoryMetric(view, firstValue(params.metric));
  const filters = parseHistoryFilters({
    startYear: firstValue(params.startYear),
    endYear: firstValue(params.endYear),
    minimumGames: firstValue(params.minimumGames),
    position: firstValue(params.position),
    team: firstValue(params.team),
    country: firstValue(params.country),
  });
  const gameType = gameTypeForPhase(phase);
  const [leaders, filterOptions] = await Promise.all([
    getHistoricalLeaders(view, metric, gameType, filters),
    getHistoryFilterOptions(gameType),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="history" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / History"
          title="NHL Historical Leaders"
          description="Career leaders and the greatest individual and team seasons across the NHL's complete statistical history, beginning in 1917–18."
        />

        <div className="workspace-coverage-note mt-6">
          <strong>Coverage:</strong> basic scoring, goalie results, and team
          results begin in 1917–18. Later statistics retain their real source
          cutoffs—unavailable early-era values are never treated as zero.
          Birth-country filters use available player profiles; team filters
          select whole seasons in which that player represented the team.
        </div>

        <div className="workspace-context-navs">
          <SeasonPhaseFilter
            active={phase}
            path="/history"
            params={historyParams(view, metric, filters, display)}
          />
        </div>

        <HistoryFiltersForm
          view={view}
          metric={leaders.metric}
          phase={phase}
          filters={filters}
          options={filterOptions}
          display={display}
          width={contentWidth}
        />

        <ViewTabs
          active={display}
          ariaLabel="Historical ranking views"
          tabs={historyDisplayTabs(view, leaders.metric, phase, filters)}
          width={contentWidth}
        />

        {leaders.view === "skaters" ? (
          <SkaterHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
            display={display}
            width={contentWidth}
          />
        ) : leaders.view === "goalies" ? (
          <GoalieHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
            display={display}
            width={contentWidth}
          />
        ) : (
          <TeamHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
            display={display}
            width={contentWidth}
          />
        )}
      </section>
    </main>
  );
}

function HistoryFiltersForm({
  view,
  metric,
  phase,
  filters,
  options,
  display,
  width,
}: {
  view: HistoryView;
  metric: HistoryMetric;
  phase: SeasonPhase;
  filters: HistoryFilters;
  options: HistoryFilterOptions;
  display: HistoryDisplay;
  width: WorkspaceWidth;
}) {
  const widthClass =
    width === "wide" ? "" : ` workspace-width-${width}`;

  return (
    <form
      action="/history"
      method="get"
      className={`workspace-player-filters${widthClass}`}
    >
      <input type="hidden" name="phase" value={phase} />
      <input type="hidden" name="display" value={display} />

      <fieldset className="workspace-player-filter-group is-primary">
        <legend>Find Historical Leaders</legend>
        <div>
          <label>
            Leader Type
            <select name="view" defaultValue={view}>
              <option value="skaters">Skaters</option>
              <option value="goalies">Goalies</option>
              <option value="teams">Teams</option>
            </select>
          </label>
          <label>
            Ranking Metric
            <select name="metric" defaultValue={metric}>
              {metricOptions(view).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="workspace-player-filter-group">
        <legend>Time Period</legend>
        <div>
          <label>
            Start Season
            <input
              name="startYear"
              type="number"
              min="1917"
              max="2025"
              defaultValue={filters.startYear}
            />
          </label>
          <label>
            End Season
            <input
              name="endYear"
              type="number"
              min="1917"
              max="2025"
              defaultValue={filters.endYear}
            />
          </label>
          <label>
            Minimum Games
            <input
              name="minimumGames"
              type="number"
              min="0"
              max="5000"
              defaultValue={filters.minimumGames}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="workspace-player-filter-group">
        <legend>Player Filters</legend>
        {view === "teams" ? (
          <p className="workspace-filter-group-note">
            Player filters do not apply to historical team rankings.
          </p>
        ) : (
          <div>
            {view === "skaters" ? (
              <label>
                Position
                <select name="position" defaultValue={filters.position ?? ""}>
                  <option value="">All Positions</option>
                  {options.positions.map((value) => (
                    <option key={value} value={value}>
                      {positionLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Team
              <select name="team" defaultValue={filters.team ?? ""}>
                <option value="">All Teams</option>
                {options.teams.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Birth Country
              <select name="country" defaultValue={filters.country ?? ""}>
                <option value="">All Countries</option>
                {options.countries.map((value) => (
                  <option key={value} value={value}>
                    {countryLabel(value)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </fieldset>

      <div className="workspace-player-filter-actions">
        <button type="submit">Show History</button>
        <Link
          href={`/history?phase=${phase}&view=${view}&display=${display}`}
          className="workspace-directory-reset"
        >
          Clear Filters
        </Link>
      </div>
    </form>
  );
}

function SkaterHistory({
  careers,
  seasons,
  phase,
  metric,
  display,
  width,
}: {
  careers: HistoricalSkaterCareer[];
  seasons: HistoricalSkaterSeason[];
  phase: SeasonPhase;
  metric: SkaterHistoryMetric;
  display: HistoryDisplay;
  width: WorkspaceWidth;
}) {
  return (
    <>
      {display === "career" ? (
      <WorkspacePanel
        className="mt-7"
        width={width}
        title="Career Leaders"
        description={`Top ${seasonPhaseLabel(phase).toLowerCase()} skater careers for the selected ranking metric.`}
      >
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
              <colgroup>
                <col />
                <col className="workspace-col-position" />
                <col className="workspace-col-number" span={6} />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader label="Player" sortKey="player" align="left" />
                  <SortableHeader label="Pos" sortKey="position" align="left" />
                  <SortableHeader label="Seasons" sortKey="seasons" />
                  <SortableHeader label="GP" sortKey="games" />
                  <SortableHeader label="G" sortKey="goals" />
                  <SortableHeader label="A" sortKey="assists" />
                  <SortableHeader label="PTS" sortKey="points" />
                  <SortableHeader label="P/GP" sortKey="pointsPerGame" />
                </tr>
              </thead>
              <tbody>
                {careers.map((row) => (
                  <tr key={row.nhlPlayerId}>
                    <td className="workspace-team-cell"><Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link></td>
                    <td className="workspace-position-cell">
                      {row.position ?? "—"}
                    </td>
                    <NumberCell value={row.seasonsPlayed} />
                    <NumberCell value={row.gamesPlayed} />
                    <NumberCell value={row.goals} />
                    <NumberCell value={row.assists} />
                    <NumberCell value={row.points} highlight />
                    <NumberCell value={formatRate(row.pointsPerGame)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}

      {display === "seasons" ? (
      <WorkspacePanel
        className="mt-7"
        width={width}
        title="Best Single Seasons"
        description={`The strongest individual ${seasonPhaseLabel(phase).toLowerCase()} seasons for the selected ranking metric.`}
      >
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[860px]">
              <colgroup>
                <col />
                <col className="workspace-col-season" />
                <col className="workspace-col-team" />
                <col className="workspace-col-number" span={5} />
              </colgroup>
              <thead>
                <tr>
                  <SortableHeader label="Player" sortKey="player" align="left" />
                  <SortableHeader label="Season" sortKey="season" align="left" />
                  <SortableHeader label="Team(s)" sortKey="teams" align="left" />
                  <SortableHeader label="GP" sortKey="games" />
                  <SortableHeader label="G" sortKey="goals" />
                  <SortableHeader label="A" sortKey="assists" />
                  <SortableHeader label="PTS" sortKey="points" />
                  <SortableHeader label="P/GP" sortKey="pointsPerGame" />
                </tr>
              </thead>
              <tbody>
                {seasons.map((row) => (
                  <tr key={`${row.nhlPlayerId}-${row.seasonId}`}>
                    <td className="workspace-team-cell">
                      <div className="flex items-center gap-2">
                        <TeamLogoStack abbreviations={row.teamAbbreviations} />
                        <Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link>
                      </div>
                    </td>
                    <td data-sort-value={row.seasonId}>{formatSeason(row.seasonId)}</td>
                    <td data-sort-value={row.teamAbbreviations ?? ""}>
                      <TeamLogoStack abbreviations={row.teamAbbreviations} />
                    </td>
                    <NumberCell value={row.gamesPlayed} />
                    <NumberCell value={row.goals} />
                    <NumberCell value={row.assists} />
                    <NumberCell value={row.points} highlight />
                    <NumberCell value={formatRate(row.pointsPerGame)} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}
    </>
  );
}

function GoalieHistory({ careers, seasons, phase, metric, display, width }: {
  careers: HistoricalGoalieCareer[];
  seasons: HistoricalGoalieSeason[];
  phase: SeasonPhase;
  metric: GoalieHistoryMetric;
  display: HistoryDisplay;
  width: WorkspaceWidth;
}) {
  return (
    <>
      {display === "career" ? (
      <WorkspacePanel className="mt-7" width={width} title="Career Leaders" description={`Top ${seasonPhaseLabel(phase).toLowerCase()} goalie careers.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[700px]">
              <colgroup>
                <col />
                <col className="workspace-col-number" span={5} />
                <col className="workspace-col-percentage" />
              </colgroup>
              <thead><tr>
                <SortableHeader label="Goalie" sortKey="goalie" align="left" />
                <SortableHeader label="Seasons" sortKey="seasons" />
                <SortableHeader label="GP" sortKey="games" />
                <SortableHeader label="W" sortKey="wins" />
                <SortableHeader label="L" sortKey="losses" />
                <SortableHeader label="SO" sortKey="shutouts" />
                <SortableHeader label="SV%" sortKey="savePercentage" />
              </tr></thead>
              <tbody>{careers.map((row) => (
                <tr key={row.nhlPlayerId}>
                  <td className="workspace-team-cell"><Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link></td>
                  <NumberCell value={row.seasonsPlayed} />
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} highlight />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.shutouts} />
                  <NumberCell value={formatSavePercentage(row.savePercentage)} />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}
      {display === "seasons" ? (
      <WorkspacePanel className="mt-7" width={width} title="Best Single Seasons" description={`Top individual ${seasonPhaseLabel(phase).toLowerCase()} goalie seasons. Save percentage is available from 1955–56 onward.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[900px]">
              <colgroup>
                <col />
                <col className="workspace-col-season" />
                <col className="workspace-col-team" />
                <col className="workspace-col-number" span={5} />
                <col className="workspace-col-percentage" />
              </colgroup>
              <thead><tr>
                <SortableHeader label="Goalie" sortKey="goalie" align="left" />
                <SortableHeader label="Season" sortKey="season" align="left" />
                <SortableHeader label="Team(s)" sortKey="teams" align="left" />
                <SortableHeader label="GP" sortKey="games" />
                <SortableHeader label="W" sortKey="wins" />
                <SortableHeader label="L" sortKey="losses" />
                <SortableHeader label="SO" sortKey="shutouts" />
                <SortableHeader label="GAA" sortKey="gaa" defaultDirection="asc" />
                <SortableHeader label="SV%" sortKey="savePercentage" />
              </tr></thead>
              <tbody>{seasons.map((row) => (
                <tr key={`${row.nhlPlayerId}-${row.seasonId}`}>
                  <td className="workspace-team-cell">
                    <div className="flex items-center gap-2">
                      <TeamLogoStack abbreviations={row.teamAbbreviations} />
                      <Link href={`/players/${row.nhlPlayerId}`}><strong>{row.name}</strong></Link>
                    </div>
                  </td>
                  <td data-sort-value={row.seasonId}>{formatSeason(row.seasonId)}</td>
                  <td data-sort-value={row.teamAbbreviations ?? ""}>
                    <TeamLogoStack abbreviations={row.teamAbbreviations} />
                  </td>
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} highlight />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.shutouts} />
                  <NumberCell value={formatDecimal(row.goalsAgainstAverage, 2)} />
                  <NumberCell value={formatSavePercentage(row.savePercentage)} />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}
    </>
  );
}

function TeamHistory({ careers, seasons, phase, metric, display, width }: {
  careers: HistoricalTeamCareer[];
  seasons: HistoricalTeamSeason[];
  phase: SeasonPhase;
  metric: TeamHistoryMetric;
  display: HistoryDisplay;
  width: WorkspaceWidth;
}) {
  return (
    <>
      {display === "career" ? (
      <WorkspacePanel className="mt-7" width={width} title="Team Identity Totals" description="Totals follow the NHL source team identity. A future franchise-history pass will combine relocations and renames into lineages.">
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[760px]">
              <colgroup>
                <col />
                <col className="workspace-col-number" span={7} />
                <col className="workspace-col-percentage" />
              </colgroup>
              <thead><tr>
                <SortableHeader label="Team" sortKey="team" align="left" />
                <SortableHeader label="Seasons" sortKey="seasons" />
                <SortableHeader label="GP" sortKey="games" />
                <SortableHeader label="W" sortKey="wins" />
                <SortableHeader label="L" sortKey="losses" />
                <SortableHeader label="T" sortKey="ties" />
                <SortableHeader label="OTL" sortKey="overtimeLosses" />
                <SortableHeader label="PTS" sortKey="points" />
                <SortableHeader label="PTS%" sortKey="pointPercentage" />
              </tr></thead>
              <tbody>{careers.map((row) => (
                <tr key={row.nhlTeamId}>
                  <td className="workspace-team-cell">
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo nhlTeamId={row.nhlTeamId} name={row.name} size="compact" decorative />
                      <strong>{row.name}</strong>
                    </span>
                  </td>
                  <NumberCell value={row.seasonsPlayed} />
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.ties} />
                  <NumberCell value={row.overtimeLosses} />
                  <NumberCell value={row.points} highlight />
                  <NumberCell value={formatPercentage(row.pointPercentage)} />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}
      {display === "seasons" ? (
      <WorkspacePanel className="mt-7" width={width} title="Best Team Seasons" description={`The strongest team ${seasonPhaseLabel(phase).toLowerCase()} seasons by the selected metric.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[900px]">
              <colgroup>
                <col />
                <col className="workspace-col-season" />
                <col className="workspace-col-number" span={6} />
                <col className="workspace-col-percentage" />
                <col className="workspace-col-number" />
              </colgroup>
              <thead><tr>
                <SortableHeader label="Team" sortKey="team" align="left" />
                <SortableHeader label="Season" sortKey="season" align="left" />
                <SortableHeader label="GP" sortKey="games" />
                <SortableHeader label="W" sortKey="wins" />
                <SortableHeader label="L" sortKey="losses" />
                <SortableHeader label="T" sortKey="ties" />
                <SortableHeader label="OTL" sortKey="overtimeLosses" />
                <SortableHeader label="PTS" sortKey="points" />
                <SortableHeader label="PTS%" sortKey="pointPercentage" />
                <SortableHeader label="GD" sortKey="goalDifferential" />
              </tr></thead>
              <tbody>{seasons.map((row) => (
                <tr key={`${row.nhlTeamId}-${row.seasonId}`}>
                  <td className="workspace-team-cell">
                    <span className="inline-flex items-center gap-2">
                      <TeamLogo nhlTeamId={row.nhlTeamId} name={row.name} size="compact" decorative />
                      <strong>{row.name}</strong>
                    </span>
                  </td>
                  <td data-sort-value={row.seasonId}>{formatSeason(row.seasonId)}</td>
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.ties} />
                  <NumberCell value={row.overtimeLosses} />
                  <NumberCell value={row.points} highlight />
                  <NumberCell value={formatPercentage(row.pointPercentage)} />
                  <NumberCell value={formatSigned(row.goalsFor - row.goalsAgainst)} />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      ) : null}
    </>
  );
}

function NumberCell({ value, highlight = false }: { value: number | string | null; highlight?: boolean }) {
  return <td className={highlight ? "workspace-points-cell" : "workspace-number-cell"}>{value ?? "—"}</td>;
}

function metricOptions(view: HistoryView): Array<{ value: HistoryMetric; label: string }> {
  if (view === "goalies") return [
    { value: "wins" satisfies GoalieHistoryMetric, label: "Wins" },
    { value: "games" satisfies GoalieHistoryMetric, label: "Games Played" },
    { value: "shutouts" satisfies GoalieHistoryMetric, label: "Shutouts" },
    { value: "savePercentage" satisfies GoalieHistoryMetric, label: "Save Percentage" },
  ];
  if (view === "teams") return [
    { value: "points" satisfies TeamHistoryMetric, label: "Points" },
    { value: "wins" satisfies TeamHistoryMetric, label: "Wins" },
    { value: "pointPercentage" satisfies TeamHistoryMetric, label: "Points Percentage" },
  ];
  return [
    { value: "points" satisfies SkaterHistoryMetric, label: "Points" },
    { value: "goals" satisfies SkaterHistoryMetric, label: "Goals" },
    { value: "assists" satisfies SkaterHistoryMetric, label: "Assists" },
    { value: "games" satisfies SkaterHistoryMetric, label: "Games Played" },
    { value: "pointsPerGame" satisfies SkaterHistoryMetric, label: "Points Per Game" },
  ];
}

function formatSeason(seasonId: number): string {
  return `${Math.floor(seasonId / 10_000)}–${String(seasonId % 10_000).slice(-2)}`;
}
function formatDecimal(value: number | null, digits: number): string | null {
  return value === null ? null : value.toFixed(digits);
}
function formatSavePercentage(value: number | null): string | null {
  return value === null ? null : value.toFixed(3).replace(/^0/, "");
}
function formatPercentage(value: number | null): string | null {
  return value === null ? null : `${(value * 100).toFixed(1)}%`;
}
function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
function formatRate(value: number): string {
  return value.toFixed(2);
}
function positionLabel(position: string): string {
  return ({ C: "Centre", L: "Left Wing", R: "Right Wing", D: "Defence" } as Record<string, string>)[position] ?? position;
}
function countryLabel(country: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
  } catch {
    return country;
  }
}
function historyParams(
  view: HistoryView,
  metric: HistoryMetric,
  filters: HistoryFilters,
  display: HistoryDisplay,
) {
  return {
    view,
    metric,
    display,
    startYear: filters.startYear,
    endYear: filters.endYear,
    minimumGames: filters.minimumGames,
    position: filters.position ?? undefined,
    team: filters.team ?? undefined,
    country: filters.country ?? undefined,
  };
}

function historyDisplayTabs(
  view: HistoryView,
  metric: HistoryMetric,
  phase: SeasonPhase,
  filters: HistoryFilters,
) {
  return ([
    { id: "career" as const, label: "Career Leaders" },
    { id: "seasons" as const, label: "Best Single Seasons" },
  ]).map((tab) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(
      historyParams(view, metric, filters, tab.id),
    )) {
      if (value !== undefined) params.set(name, String(value));
    }
    params.set("phase", phase);
    return { ...tab, href: `/history?${params.toString()}` };
  });
}

function historyContentWidth(
  view: HistoryView,
  display: HistoryDisplay,
): WorkspaceWidth {
  if (view === "goalies" && display === "career") return "compact";
  if (view === "teams" && display === "seasons") return "wide";
  return "standard";
}

function parseHistoryDisplay(value: string | undefined): HistoryDisplay {
  return value === "seasons" ? "seasons" : "career";
}
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
