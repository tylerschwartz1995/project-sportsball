import Link from "next/link";

import {
  ColumnPresetTable,
  type ColumnPreset,
} from "@/app/_components/column-preset-table";
import { SortableHeader } from "@/app/_components/sortable-header";
import { TeamLogo } from "@/app/_components/team-logo";
import type {
  MoneyPuckSeasonUnitLeaders,
  MoneyPuckSeasonUnitStats,
} from "@/contracts/season-unit";

const UNIT_COLUMN_PRESETS: ColumnPreset[] = [
  {
    value: "core",
    label: "Core",
    description: "Identity, workload, and expected-goal share.",
  },
  {
    value: "possession",
    label: "Possession",
    description: "Expected-goal and shot-attempt shares.",
  },
  {
    value: "shot-quality",
    label: "Shot Quality",
    description: "Expected goals created and allowed.",
  },
  {
    value: "results",
    label: "Results",
    description: "Goals and shots for and against.",
  },
  {
    value: "all",
    label: "All Columns",
    description: "Every available unit metric.",
  },
];

export function SeasonUnitTables({
  data,
  seasonId,
  showTeam = true,
  only,
  urlSort,
}: {
  data: MoneyPuckSeasonUnitLeaders;
  seasonId: number;
  showTeam?: boolean;
  only?: "line" | "pairing";
  urlSort?: { key: string; direction: "asc" | "desc"; scrollTarget: string };
}) {
  return (
    <div className="space-y-10">
      {only !== "pairing" ? <SeasonUnitTable
        title="Forward Lines"
        description="Three-player combinations at five-on-five."
        rows={data.forwardLines}
        seasonId={seasonId}
        showTeam={showTeam}
        urlSort={urlSort}
      /> : null}
      {only !== "line" ? <SeasonUnitTable
        title="Defensive Pairings"
        description="Two-player defensive combinations at five-on-five."
        rows={data.defensivePairings}
        seasonId={seasonId}
        showTeam={showTeam}
        urlSort={urlSort}
      /> : null}
    </div>
  );
}

function SeasonUnitTable({
  title,
  description,
  rows,
  seasonId,
  showTeam,
  urlSort,
}: {
  title: string;
  description: string;
  rows: MoneyPuckSeasonUnitStats[];
  seasonId: number;
  showTeam: boolean;
  urlSort?: { key: string; direction: "asc" | "desc"; scrollTarget: string };
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>
            {rows.length === 100
              ? "Top 100 qualifying units"
              : `${rows.length} qualifying units`}
          </p>
          <Link
            href={`/analytics/guide?season=${seasonId}`}
            className="mt-1 inline-block font-medium text-violet-300 hover:text-violet-200"
          >
            Metric Guide →
          </Link>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
          <ColumnPresetTable
            presets={UNIT_COLUMN_PRESETS}
            defaultSortKey={urlSort?.key ?? "xgPercentage"}
            defaultDirection={urlSort?.direction}
            urlBacked={Boolean(urlSort)}
            scrollTarget={urlSort?.scrollTarget}
          >
            <div className="workspace-table-scroll-viewport">
              <table className="workspace-table workspace-table-dense workspace-table-semantic workspace-sticky-table-header min-w-[1500px]">
                <colgroup>
                  {showTeam ? <col className="workspace-col-team" data-column-group="core possession shot-quality results" /> : null}
                  <col className="workspace-col-season-unit" data-column-group="core possession shot-quality results" />
                  <col className="workspace-col-number" data-column-group="core possession shot-quality results" />
                  <col className="workspace-col-time" data-column-group="core possession shot-quality results" />
                  <col className="workspace-col-percentage" data-column-group="core possession" />
                  <col className="workspace-col-percentage" data-column-group="possession" />
                  <col className="workspace-col-number" span={2} data-column-group="shot-quality" />
                  <col className="workspace-col-number" span={4} data-column-group="results" />
                </colgroup>
                <caption className="sr-only">
                  {title} season rankings
                </caption>
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                    {showTeam ? (
                      <SortableHeader
                        label="Team"
                        sortKey="team"
                        align="left"
                        defaultDirection="asc"
                        sticky
                        metricGroup="core possession shot-quality results"
                      />
                    ) : null}
                    <SortableHeader
                      label={title}
                      sortKey="players"
                      align="left"
                      defaultDirection="asc"
                      sticky={!showTeam}
                      metricGroup="core possession shot-quality results"
                    />
                    <SortableHeader label="GP" sortKey="games" metricGroup="core possession shot-quality results" />
                    <SortableHeader label="TOI" sortKey="iceTime" metricGroup="core possession shot-quality results" />
                    <SortableHeader label="xG%" sortKey="xgPercentage" metricGroup="core possession" />
                    <SortableHeader label="CF%" sortKey="corsiPercentage" metricGroup="possession" />
                    <SortableHeader label="xGF" sortKey="xGoalsFor" metricGroup="shot-quality" />
                    <SortableHeader label="xGA" sortKey="xGoalsAgainst" metricGroup="shot-quality" />
                    <SortableHeader label="GF" sortKey="goalsFor" metricGroup="results" />
                    <SortableHeader label="GA" sortKey="goalsAgainst" metricGroup="results" />
                    <SortableHeader label="SOG" sortKey="shotsFor" metricGroup="results" />
                    <SortableHeader label="SA" sortKey="shotsAgainst" metricGroup="results" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.team.nhlTeamId}-${row.unitType}-${row.players.map((player) => player.nhlPlayerId).join("-")}`}
                      className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                    >
                      {showTeam ? (
                        <td className="workspace-sticky-entity px-4 py-3 text-left" data-column-group="core possession shot-quality results">
                          <div className="flex items-center gap-2">
                            <TeamLogo {...row.team} size="tiny" decorative />
                            <Link
                              href={`/teams/${row.team.nhlTeamId}?season=${seasonId}`}
                              className="font-medium text-white transition hover:text-violet-200"
                            >
                              {row.team.abbreviation}
                            </Link>
                          </div>
                        </td>
                      ) : null}
                      <td className={`${showTeam ? "" : "workspace-sticky-entity"} px-4 py-3 text-left`} data-column-group="core possession shot-quality results">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                          <div className="flex min-w-0 items-center gap-2">
                            {!showTeam ? (
                              <TeamLogo {...row.team} size="tiny" decorative />
                            ) : null}
                            <div className="flex whitespace-nowrap">
                              {row.players.map((player, index) => (
                                <span key={player.nhlPlayerId}>
                                  {index > 0 ? (
                                    <span className="text-slate-600"> / </span>
                                  ) : null}
                                  <Link
                                    href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                                    className="font-medium text-white transition hover:text-violet-200"
                                  >
                                    {player.name}
                                  </Link>
                                </span>
                              ))}
                            </div>
                          </div>
                          <Link
                            href={`/lines/${row.unitType}-${row.players.map((player) => player.nhlPlayerId).join("-")}?season=${seasonId}&team=${row.team.nhlTeamId}`}
                            className="shrink-0 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                          >
                            Games →
                          </Link>
                        </div>
                      </td>
                      <ValueCell value={String(row.gamesPlayed)} metricGroup="core possession shot-quality results" />
                      <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} metricGroup="core possession shot-quality results" />
                      <ValueCell
                        value={formatPercentage(row.expectedGoalsPercentage)}
                        highlight
                        metricGroup="core possession"
                      />
                      <ValueCell value={formatPercentage(row.corsiPercentage)} metricGroup="possession" />
                      <ValueCell value={formatDecimal(row.expectedGoalsFor)} metricGroup="shot-quality" />
                      <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} metricGroup="shot-quality" />
                      <ValueCell value={formatDecimal(row.goalsFor, 0)} metricGroup="results" />
                      <ValueCell value={formatDecimal(row.goalsAgainst, 0)} metricGroup="results" />
                      <ValueCell value={formatDecimal(row.shotsOnGoalFor, 0)} metricGroup="results" />
                      <ValueCell
                        value={formatDecimal(row.shotsOnGoalAgainst, 0)}
                        metricGroup="results"
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ColumnPresetTable>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-sm text-slate-500">
          No combinations meet this season and ice-time threshold.
        </p>
      )}
    </section>
  );
}

function ValueCell({
  value,
  highlight = false,
  metricGroup,
}: {
  value: string;
  highlight?: boolean;
  metricGroup?: string;
}) {
  return (
    <td
      className={`workspace-semantic-number px-4 py-3 text-center tabular-nums ${
        highlight ? "font-semibold text-violet-200" : "text-slate-300"
      }`}
      data-column-group={metricGroup}
    >
      {value}
    </td>
  );
}

function formatTimeOnIce(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null, digits = 2): string {
  return value === null ? "—" : value.toFixed(digits);
}
