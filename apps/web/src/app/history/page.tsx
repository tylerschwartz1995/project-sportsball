import Link from "next/link";

import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo, TeamLogoStack } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
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
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const phase = parseSeasonPhase(firstValue(params.phase));
  const view = parseHistoryView(firstValue(params.view));
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

        <SeasonPhaseFilter
          active={phase}
          path="/history"
          params={historyParams(view, metric, filters)}
        />

        <nav className="workspace-standings-scope" aria-label="Historical leader type">
          {(["skaters", "goalies", "teams"] as const).map((option) => (
            <Link
              key={option}
              href={historyHref(option, phase, filters)}
              aria-current={view === option ? "page" : undefined}
            >
              {option === "skaters"
                ? "Skaters"
                : option === "goalies"
                  ? "Goalies"
                  : "Teams"}
            </Link>
          ))}
        </nav>

        <HistoryFiltersForm
          view={view}
          metric={leaders.metric}
          phase={phase}
          filters={filters}
          options={filterOptions}
        />

        {leaders.view === "skaters" ? (
          <SkaterHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
          />
        ) : leaders.view === "goalies" ? (
          <GoalieHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
          />
        ) : (
          <TeamHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
            metric={leaders.metric}
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
}: {
  view: HistoryView;
  metric: HistoryMetric;
  phase: SeasonPhase;
  filters: HistoryFilters;
  options: HistoryFilterOptions;
}) {
  return (
    <form method="get" className="workspace-history-controls">
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="phase" value={phase} />
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
      <label>Start Season
        <input name="startYear" type="number" min="1917" max="2025" defaultValue={filters.startYear} />
      </label>
      <label>End Season
        <input name="endYear" type="number" min="1917" max="2025" defaultValue={filters.endYear} />
      </label>
      <label>Minimum Games
        <input name="minimumGames" type="number" min="0" max="5000" defaultValue={filters.minimumGames} />
      </label>
      {view === "skaters" ? <label>Position
        <select name="position" defaultValue={filters.position ?? ""}>
          <option value="">All Positions</option>
          {options.positions.map((value) => <option key={value} value={value}>{positionLabel(value)}</option>)}
        </select>
      </label> : null}
      {view !== "teams" ? <>
        <label>Team
          <select name="team" defaultValue={filters.team ?? ""}>
            <option value="">All Teams</option>
            {options.teams.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Birth Country
          <select name="country" defaultValue={filters.country ?? ""}>
            <option value="">All</option>
            {options.countries.map((value) => <option key={value} value={value}>{countryLabel(value)}</option>)}
          </select>
        </label>
      </> : null}
      <div className="workspace-history-actions">
        <button type="submit">Apply Filters</button>
        <Link href={`/history?phase=${phase}&view=${view}`}>Reset</Link>
      </div>
    </form>
  );
}

function SkaterHistory({
  careers,
  seasons,
  phase,
  metric,
}: {
  careers: HistoricalSkaterCareer[];
  seasons: HistoricalSkaterSeason[];
  phase: SeasonPhase;
  metric: SkaterHistoryMetric;
}) {
  return (
    <>
      <WorkspacePanel
        className="mt-7"
        title="Career Leaders"
        description={`Top ${seasonPhaseLabel(phase).toLowerCase()} skater careers for the selected ranking metric.`}
      >
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[760px]">
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
                    <td>{row.position ?? "—"}</td>
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

      <WorkspacePanel
        className="mt-7"
        title="Best Single Seasons"
        description={`The strongest individual ${seasonPhaseLabel(phase).toLowerCase()} seasons for the selected ranking metric.`}
      >
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[860px]">
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
    </>
  );
}

function GoalieHistory({ careers, seasons, phase, metric }: {
  careers: HistoricalGoalieCareer[];
  seasons: HistoricalGoalieSeason[];
  phase: SeasonPhase;
  metric: GoalieHistoryMetric;
}) {
  return (
    <>
      <WorkspacePanel className="mt-7" title="Career Leaders" description={`Top ${seasonPhaseLabel(phase).toLowerCase()} goalie careers.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[700px]">
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
      <WorkspacePanel className="mt-7" title="Best Single Seasons" description={`Top individual ${seasonPhaseLabel(phase).toLowerCase()} goalie seasons. Save percentage is available from 1955–56 onward.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[900px]">
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
    </>
  );
}

function TeamHistory({ careers, seasons, phase, metric }: {
  careers: HistoricalTeamCareer[];
  seasons: HistoricalTeamSeason[];
  phase: SeasonPhase;
  metric: TeamHistoryMetric;
}) {
  return (
    <>
      <WorkspacePanel className="mt-7" title="Team Identity Totals" description="Totals follow the NHL source team identity. A future franchise-history pass will combine relocations and renames into lineages.">
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[760px]">
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
      <WorkspacePanel className="mt-7" title="Best Team Seasons" description={`The strongest team ${seasonPhaseLabel(phase).toLowerCase()} seasons by the selected metric.`}>
        <SortableTable defaultSortKey={metric}>
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[900px]">
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
) {
  return {
    view,
    metric,
    startYear: filters.startYear,
    endYear: filters.endYear,
    minimumGames: filters.minimumGames,
    position: filters.position ?? undefined,
    team: filters.team ?? undefined,
    country: filters.country ?? undefined,
  };
}
function historyHref(
  view: HistoryView,
  phase: SeasonPhase,
  filters: HistoryFilters,
): string {
  const params = new URLSearchParams({
    phase,
    view,
    startYear: String(filters.startYear),
    endYear: String(filters.endYear),
    minimumGames: String(filters.minimumGames),
  });
  if (view === "skaters" && filters.position) params.set("position", filters.position);
  if (view !== "teams" && filters.team) params.set("team", filters.team);
  if (view !== "teams" && filters.country) params.set("country", filters.country);
  return `/history?${params.toString()}`;
}
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
