import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type {
  MoneyPuckSeasonUnitType,
  MoneyPuckUnitGameStats,
} from "@/contracts/season-unit";
import { parseSeasonId } from "@/contracts/season";
import { getMoneyPuckUnitDetail } from "@/data/season-units";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

type UnitPageProps = {
  params: Promise<{ unit: string }>;
  searchParams: Promise<{
    season?: string | string[];
    team?: string | string[];
  }>;
};

export default async function UnitPage({
  params,
  searchParams,
}: UnitPageProps) {
  const route = parseUnitRoute((await params).unit);
  const query = await searchParams;
  const seasonId = parseSeasonId(firstQueryValue(query.season));
  const teamNhlId = parsePositiveInteger(firstQueryValue(query.team));
  if (!route || seasonId === null || teamNhlId === null) {
    notFound();
  }
  const detail = await getMoneyPuckUnitDetail(
    seasonId,
    teamNhlId,
    route.unitType,
    route.playerNhlIds,
  );
  if (!detail) {
    notFound();
  }
  const title = detail.players.map((player) => player.name).join(" / ");

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="analytics" />
      <section className="py-10">
        <Link
          href={`/lines?season=${seasonId}&team=${teamNhlId}`}
          className="workspace-back-link"
        >
          ← Combination Explorer
        </Link>
        <div className="mt-5">
          <WorkspacePageHeader
            eyebrow={`MoneyPuck five-on-five ${detail.unitType}`}
            title={title}
            description={`${detail.team.name} game-by-game results for every stored regular-season appearance by this combination.`}
            action={
              <Link
                href={`/teams/${detail.team.nhlTeamId}?season=${seasonId}&phase=regular&view=combinations`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <TeamLogo {...detail.team} size="tiny" decorative />
                {detail.team.abbreviation} profile
              </Link>
            }
          />
        </div>

        <WorkspacePanel
          className="mt-8"
          title="Supporting Games"
          description={`${detail.games.length} games, newest first. Percentages are MoneyPuck's game-level five-on-five values.`}
        >
          <SortableTable defaultSortKey="date" defaultDirection="desc">
            <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-unit-games-table min-w-[900px]">
              <caption className="sr-only">Supporting combination games</caption>
              <thead>
                <tr>
                  <SortableHeader label="Date" sortKey="date" align="left" defaultDirection="desc" />
                  <SortableHeader label="Opponent" sortKey="opponent" align="left" defaultDirection="asc" />
                  <SortableHeader label="Score" sortKey="score" />
                  <SortableHeader label="TOI" sortKey="toi" />
                  <SortableHeader label="xG%" sortKey="xgPercentage" />
                  <SortableHeader label="CF%" sortKey="corsiPercentage" />
                  <SortableHeader label="xGF–xGA" sortKey="xgDifferential" />
                  <SortableHeader label="GF–GA" sortKey="goalDifferential" />
                  <SortableHeader label="SOG–SA" sortKey="shotDifferential" />
                </tr>
              </thead>
              <tbody>
                {detail.games.map((game) => (
                  <GameRow
                    key={game.nhlGameId}
                    game={game}
                    seasonId={seasonId}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </SortableTable>
        </WorkspacePanel>
      </section>
    </main>
  );
}

function GameRow({
  game,
  seasonId,
}: {
  game: MoneyPuckUnitGameStats;
  seasonId: number;
}) {
  return (
    <tr>
      <td data-sort-value={game.gameDate}>
        <Link href={`/games/${game.nhlGameId}`} className="workspace-table-link">
          {formatDate(game.gameDate)}
        </Link>
      </td>
      <td data-sort-value={game.opponent.name}>
        <span className="inline-flex items-center gap-2">
          <TeamLogo {...game.opponent} size="tiny" decorative />
          {game.isHome ? "vs" : "at"}{" "}
          <Link
            href={`/teams/${game.opponent.nhlTeamId}?season=${seasonId}`}
            className="workspace-table-link"
          >
            {game.opponent.abbreviation}
          </Link>
        </span>
      </td>
      <Value value={formatScore(game)} sortValue={scoreDifferential(game)} />
      <Value
        value={formatTime(game.iceTimeSeconds)}
        sortValue={game.iceTimeSeconds}
      />
      <Value
        value={formatPercentage(game.expectedGoalsPercentage)}
        sortValue={game.expectedGoalsPercentage}
        highlight
      />
      <Value
        value={formatPercentage(game.corsiPercentage)}
        sortValue={game.corsiPercentage}
      />
      <Value
        value={formatPair(game.expectedGoalsFor, game.expectedGoalsAgainst)}
        sortValue={difference(
          game.expectedGoalsFor,
          game.expectedGoalsAgainst,
        )}
      />
      <Value
        value={formatPair(game.goalsFor, game.goalsAgainst, 0)}
        sortValue={difference(game.goalsFor, game.goalsAgainst)}
      />
      <Value
        value={formatPair(
          game.shotsOnGoalFor,
          game.shotsOnGoalAgainst,
          0,
        )}
        sortValue={difference(
          game.shotsOnGoalFor,
          game.shotsOnGoalAgainst,
        )}
      />
    </tr>
  );
}

function Value({
  value,
  sortValue,
  highlight = false,
}: {
  value: string;
  sortValue: number | null;
  highlight?: boolean;
}) {
  return (
    <td
      data-sort-value={sortValue ?? ""}
      className={highlight ? "workspace-points-cell" : "workspace-semantic-number"}
    >
      {value}
    </td>
  );
}

function parseUnitRoute(value: string): {
  unitType: MoneyPuckSeasonUnitType;
  playerNhlIds: number[];
} | null {
  const [type, ...rawIds] = value.split("-");
  const unitType = type === "line" || type === "pairing" ? type : null;
  const playerNhlIds = rawIds.map(Number);
  const expected = unitType === "line" ? 3 : 2;
  return unitType && playerNhlIds.length === expected && playerNhlIds.every(Number.isSafeInteger)
    ? { unitType, playerNhlIds }
    : null;
}

function parsePositiveInteger(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatScore(game: MoneyPuckUnitGameStats): string {
  return game.teamScore === null || game.opponentScore === null
    ? "—"
    : `${game.teamScore}–${game.opponentScore}`;
}

function scoreDifferential(game: MoneyPuckUnitGameStats): number | null {
  return difference(game.teamScore, game.opponentScore);
}

function difference(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left - right;
}

function formatTime(value: number): string {
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatPair(left: number | null, right: number | null, digits = 2): string {
  return left === null || right === null ? "—" : `${left.toFixed(digits)}–${right.toFixed(digits)}`;
}
