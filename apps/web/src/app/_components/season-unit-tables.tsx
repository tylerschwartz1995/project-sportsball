import Link from "next/link";

import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import type {
  MoneyPuckSeasonUnitLeaders,
  MoneyPuckSeasonUnitStats,
} from "@/contracts/season-unit";

export function SeasonUnitTables({
  data,
  seasonId,
  showTeam = true,
}: {
  data: MoneyPuckSeasonUnitLeaders;
  seasonId: number;
  showTeam?: boolean;
}) {
  return (
    <div className="space-y-10">
      <SeasonUnitTable
        title="Forward lines"
        description="Three-player combinations at five-on-five."
        rows={data.forwardLines}
        seasonId={seasonId}
        showTeam={showTeam}
      />
      <SeasonUnitTable
        title="Defensive pairings"
        description="Two-player defensive combinations at five-on-five."
        rows={data.defensivePairings}
        seasonId={seasonId}
        showTeam={showTeam}
      />
    </div>
  );
}

function SeasonUnitTable({
  title,
  description,
  rows,
  seasonId,
  showTeam,
}: {
  title: string;
  description: string;
  rows: MoneyPuckSeasonUnitStats[];
  seasonId: number;
  showTeam: boolean;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <p className="text-sm text-slate-500">
          {rows.length === 100
            ? "Top 100 qualifying units"
            : `${rows.length} qualifying units`}
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
          <SortableTable defaultSortKey="xgPercentage">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
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
                      />
                    ) : null}
                    <SortableHeader
                      label={title}
                      sortKey="players"
                      align="left"
                      defaultDirection="asc"
                    />
                    <SortableHeader label="GP" sortKey="games" />
                    <SortableHeader label="TOI" sortKey="iceTime" />
                    <SortableHeader label="xG%" sortKey="xgPercentage" />
                    <SortableHeader label="CF%" sortKey="corsiPercentage" />
                    <SortableHeader label="xGF" sortKey="xGoalsFor" />
                    <SortableHeader label="xGA" sortKey="xGoalsAgainst" />
                    <SortableHeader label="GF" sortKey="goalsFor" />
                    <SortableHeader label="GA" sortKey="goalsAgainst" />
                    <SortableHeader label="SOG" sortKey="shotsFor" />
                    <SortableHeader label="SA" sortKey="shotsAgainst" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.team.nhlTeamId}-${row.unitType}-${row.players.map((player) => player.nhlPlayerId).join("-")}`}
                      className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.025]"
                    >
                      {showTeam ? (
                        <td className="px-4 py-3 text-left">
                          <Link
                            href={`/teams/${row.team.nhlTeamId}?season=${seasonId}`}
                            className="font-medium text-white transition hover:text-violet-200"
                          >
                            {row.team.abbreviation}
                          </Link>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-wrap gap-x-1">
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
                      </td>
                      <ValueCell value={String(row.gamesPlayed)} />
                      <ValueCell value={formatTimeOnIce(row.iceTimeSeconds)} />
                      <ValueCell
                        value={formatPercentage(row.expectedGoalsPercentage)}
                        highlight
                      />
                      <ValueCell value={formatPercentage(row.corsiPercentage)} />
                      <ValueCell value={formatDecimal(row.expectedGoalsFor)} />
                      <ValueCell value={formatDecimal(row.expectedGoalsAgainst)} />
                      <ValueCell value={formatDecimal(row.goalsFor, 0)} />
                      <ValueCell value={formatDecimal(row.goalsAgainst, 0)} />
                      <ValueCell value={formatDecimal(row.shotsOnGoalFor, 0)} />
                      <ValueCell
                        value={formatDecimal(row.shotsOnGoalAgainst, 0)}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SortableTable>
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
}: {
  value: string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-right tabular-nums ${
        highlight ? "font-semibold text-violet-200" : "text-slate-300"
      }`}
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
