import Link from "next/link";

import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
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
  parseHistoryMetric,
  parseHistoryView,
} from "@/data/history";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams: Promise<{
    phase?: string | string[];
    view?: string | string[];
    metric?: string | string[];
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const phase = parseSeasonPhase(firstValue(params.phase));
  const view = parseHistoryView(firstValue(params.view));
  const metric = parseHistoryMetric(view, firstValue(params.metric));
  const leaders = await getHistoricalLeaders(
    view,
    metric,
    gameTypeForPhase(phase),
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="history" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / History"
          title="NHL Historical Leaders"
          description="Career leaders and the greatest individual and team seasons across the NHL's complete statistical history, beginning in 1917–18."
          action={<HistoryMetricFilter view={view} metric={leaders.metric} phase={phase} />}
        />

        <div className="workspace-coverage-note mt-6">
          <strong>Coverage:</strong> basic scoring, goalie results, and team
          results begin in 1917–18. Later statistics retain their real source
          cutoffs—unavailable early-era values are never treated as zero.
        </div>

        <SeasonPhaseFilter
          active={phase}
          path="/history"
          params={{ view, metric }}
        />

        <nav className="workspace-standings-scope" aria-label="Historical leader type">
          {(["skaters", "goalies", "teams"] as const).map((option) => (
            <Link
              key={option}
              href={`/history?phase=${phase}&view=${option}`}
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

        {leaders.view === "skaters" ? (
          <SkaterHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
          />
        ) : leaders.view === "goalies" ? (
          <GoalieHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
          />
        ) : (
          <TeamHistory
            careers={leaders.careers}
            seasons={leaders.seasons}
            phase={phase}
          />
        )}
      </section>
    </main>
  );
}

function HistoryMetricFilter({
  view,
  metric,
  phase,
}: {
  view: HistoryView;
  metric: HistoryMetric;
  phase: SeasonPhase;
}) {
  const options = metricOptions(view);
  return (
    <form method="get" className="workspace-history-filter">
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="phase" value={phase} />
      <label>
        Ranking Metric
        <select name="metric" defaultValue={metric}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Apply</button>
    </form>
  );
}

function SkaterHistory({
  careers,
  seasons,
  phase,
}: {
  careers: HistoricalSkaterCareer[];
  seasons: HistoricalSkaterSeason[];
  phase: SeasonPhase;
}) {
  return (
    <>
      <WorkspacePanel
        className="mt-7"
        title="Career Leaders"
        description={`Top ${seasonPhaseLabel(phase).toLowerCase()} skater careers for the selected ranking metric.`}
      >
        <SortableTable defaultSortKey="points">
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
                </tr>
              </thead>
              <tbody>
                {careers.map((row) => (
                  <tr key={row.nhlPlayerId}>
                    <td className="workspace-team-cell"><strong>{row.name}</strong></td>
                    <td>{row.position ?? "—"}</td>
                    <NumberCell value={row.seasonsPlayed} />
                    <NumberCell value={row.gamesPlayed} />
                    <NumberCell value={row.goals} />
                    <NumberCell value={row.assists} />
                    <NumberCell value={row.points} highlight />
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
        <SortableTable defaultSortKey="points">
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
                </tr>
              </thead>
              <tbody>
                {seasons.map((row) => (
                  <tr key={`${row.nhlPlayerId}-${row.seasonId}`}>
                    <td className="workspace-team-cell"><strong>{row.name}</strong></td>
                    <td data-sort-value={row.seasonId}>{formatSeason(row.seasonId)}</td>
                    <td>{row.teamAbbreviations ?? "—"}</td>
                    <NumberCell value={row.gamesPlayed} />
                    <NumberCell value={row.goals} />
                    <NumberCell value={row.assists} />
                    <NumberCell value={row.points} highlight />
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

function GoalieHistory({ careers, seasons, phase }: {
  careers: HistoricalGoalieCareer[];
  seasons: HistoricalGoalieSeason[];
  phase: SeasonPhase;
}) {
  return (
    <>
      <WorkspacePanel className="mt-7" title="Career Leaders" description={`Top ${seasonPhaseLabel(phase).toLowerCase()} goalie careers.`}>
        <SortableTable defaultSortKey="wins">
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[700px]">
              <thead><tr>
                <SortableHeader label="Goalie" sortKey="goalie" align="left" />
                <SortableHeader label="Seasons" sortKey="seasons" />
                <SortableHeader label="GP" sortKey="games" />
                <SortableHeader label="W" sortKey="wins" />
                <SortableHeader label="L" sortKey="losses" />
                <SortableHeader label="SO" sortKey="shutouts" />
              </tr></thead>
              <tbody>{careers.map((row) => (
                <tr key={row.nhlPlayerId}>
                  <td className="workspace-team-cell"><strong>{row.name}</strong></td>
                  <NumberCell value={row.seasonsPlayed} />
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} highlight />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.shutouts} />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      <WorkspacePanel className="mt-7" title="Best Single Seasons" description={`Top individual ${seasonPhaseLabel(phase).toLowerCase()} goalie seasons. Save percentage is available from 1955–56 onward.`}>
        <SortableTable defaultSortKey="wins">
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
                  <td className="workspace-team-cell"><strong>{row.name}</strong></td>
                  <td data-sort-value={row.seasonId}>{formatSeason(row.seasonId)}</td>
                  <td>{row.teamAbbreviations ?? "—"}</td>
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

function TeamHistory({ careers, seasons, phase }: {
  careers: HistoricalTeamCareer[];
  seasons: HistoricalTeamSeason[];
  phase: SeasonPhase;
}) {
  return (
    <>
      <WorkspacePanel className="mt-7" title="Team Identity Totals" description="Totals follow the NHL source team identity. A future franchise-history pass will combine relocations and renames into lineages.">
        <SortableTable defaultSortKey="points">
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
              </tr></thead>
              <tbody>{careers.map((row) => (
                <tr key={row.nhlTeamId}>
                  <td className="workspace-team-cell"><strong>{row.name}</strong></td>
                  <NumberCell value={row.seasonsPlayed} />
                  <NumberCell value={row.gamesPlayed} />
                  <NumberCell value={row.wins} />
                  <NumberCell value={row.losses} />
                  <NumberCell value={row.ties} />
                  <NumberCell value={row.overtimeLosses} />
                  <NumberCell value={row.points} highlight />
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SortableTable>
      </WorkspacePanel>
      <WorkspacePanel className="mt-7" title="Best Team Seasons" description={`The strongest team ${seasonPhaseLabel(phase).toLowerCase()} seasons by the selected metric.`}>
        <SortableTable defaultSortKey="points">
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
                  <td className="workspace-team-cell"><strong>{row.name}</strong></td>
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
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
