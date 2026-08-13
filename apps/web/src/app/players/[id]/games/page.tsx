import Link from "next/link";
import { notFound } from "next/navigation";

import { SeasonPicker } from "@/app/_components/season-picker";
import { ResultNavigation } from "@/app/_components/result-navigation";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo } from "@/app/_components/team-logo";
import { parseNhlId } from "@/contracts/entity";
import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
  seasonPhaseLabel,
} from "@/contracts/season-phase";
import {
  getPlayerGameLog,
  listPlayerGameSeasonIds,
} from "@/data/game-logs";
import { listSeasons } from "@/data/seasons";
import { formatPlayerPosition } from "@/lib/player-position";
import { paginate, parsePage, parsePageSize, parseSortDirection, type PageSlice } from "@/lib/directory";

export const dynamic = "force-dynamic";

type PlayerGamesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    season?: string | string[];
    phase?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
    sort?: string | string[];
    direction?: string | string[];
  }>;
};

export default async function PlayerGamesPage({
  params,
  searchParams,
}: PlayerGamesPageProps) {
  const nhlPlayerId = parseNhlId((await params).id);
  if (nhlPlayerId === null) {
    notFound();
  }

  const [seasons, playerSeasonIds] = await Promise.all([
    listSeasons(),
    listPlayerGameSeasonIds(nhlPlayerId),
  ]);
  const availableSeasonIds = new Set(playerSeasonIds);
  const availableSeasons = seasons.filter((season) =>
    availableSeasonIds.has(season.id),
  );
  const pageParams = await searchParams;
  const requestedSeason = parseSeasonId(firstValue(pageParams.season));
  const phase = parseSeasonPhase(firstValue(pageParams.phase));
  const selectedSeason =
    availableSeasons.find((season) => season.id === requestedSeason) ??
    availableSeasons[0];

  if (!selectedSeason) {
    notFound();
  }

  const log = await getPlayerGameLog(nhlPlayerId, selectedSeason.id);
  if (!log) {
    notFound();
  }

  const isGoalie =
    log.profile.position === "G" ||
    (log.goalieGames.length > 0 && log.skaterGames.length === 0);
  const gameType = gameTypeForPhase(phase);
  const skaterGames = log.skaterGames.filter(
    (game) => game.gameType === gameType,
  );
  const goalieGames = log.goalieGames.filter(
    (game) => game.gameType === gameType,
  );
  const pageSize = parsePageSize(firstValue(pageParams.perPage));
  const direction = parseSortDirection(firstValue(pageParams.direction), "desc");
  const requestedPage = parsePage(firstValue(pageParams.page));
  const skaterSort = parseSkaterSort(firstValue(pageParams.sort));
  const goalieSort = parseGoalieSort(firstValue(pageParams.sort));
  const skaterPage = paginate(sortSkaterGames(skaterGames, skaterSort, direction), requestedPage, pageSize);
  const goaliePage = paginate(sortGoalieGames(goalieGames, goalieSort, direction), requestedPage, pageSize);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <Link
          href={`/players/${log.profile.nhlPlayerId}?season=${selectedSeason.id}&phase=${phase}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← {log.profile.name}
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-cyan-300">
              {formatPlayerPosition(log.profile.position, "Player")} ·{" "}
              {seasonPhaseLabel(phase)}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              {log.profile.name} Game Log
            </h1>
            <p className="mt-4 text-base text-slate-400">
              {selectedSeason.label} game-by-game traditional and advanced
              performance.
            </p>
          </div>
          <SeasonPicker
            seasons={availableSeasons}
            selectedSeasonId={selectedSeason.id}
            params={{ phase, perPage: pageSize }}
          />
        </div>

        <SeasonPhaseFilter
          active={phase}
          path={`/players/${log.profile.nhlPlayerId}/games`}
          params={{ season: selectedSeason.id }}
        />

        {isGoalie ? (
          <GoalieRecentForm games={goalieGames.slice(0, 10)} />
        ) : (
          <SkaterRecentForm games={skaterGames.slice(0, 10)} />
        )}

        {skaterGames.length > 0 ? (
          <SkaterGameTable
            gamePage={skaterPage}
            seasonId={selectedSeason.id}
            playerId={log.profile.nhlPlayerId}
            phase={phase}
            pageSize={pageSize}
            sort={skaterSort}
            direction={direction}
          />
        ) : null}

        {goalieGames.length > 0 ? (
          <GoalieGameTable
            gamePage={goaliePage}
            seasonId={selectedSeason.id}
            playerId={log.profile.nhlPlayerId}
            phase={phase}
            pageSize={pageSize}
            sort={goalieSort}
            direction={direction}
          />
        ) : null}
      </section>
    </main>
  );
}

function SkaterRecentForm({ games }: { games: SkaterGameLogEntry[] }) {
  return (
    <RecentFormSection gameCount={games.length}>
      <div
        className="grid grid-cols-5 gap-2 sm:grid-cols-10"
        aria-label="Points in recent games"
      >
        {games.map((game) => (
          <Link
            key={game.nhlGameId}
            href={`/games/${game.nhlGameId}`}
            title={`${formatDate(game.gameDate)}: ${game.points} ${game.points === 1 ? "point" : "points"} vs ${game.opponent.name}`}
            className="group flex min-h-20 flex-col justify-end rounded-lg border border-white/10 bg-white/[0.035] p-2 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.07]"
          >
            <span
              className="block rounded-sm bg-cyan-300/70 transition group-hover:bg-cyan-200"
              style={{ height: `${Math.max(4, Math.min(48, game.points * 14))}px` }}
            />
            <span className="mt-2 text-center text-xs font-semibold text-white">
              {game.points} P
            </span>
          </Link>
        ))}
      </div>
    </RecentFormSection>
  );
}

function GoalieRecentForm({ games }: { games: GoalieGameLogEntry[] }) {
  return (
    <RecentFormSection gameCount={games.length}>
      <div
        className="grid grid-cols-5 gap-2 sm:grid-cols-10"
        aria-label="Save percentage in recent games"
      >
        {games.map((game) => (
          <Link
            key={game.nhlGameId}
            href={`/games/${game.nhlGameId}`}
            title={`${formatDate(game.gameDate)}: ${formatSavePercentage(game.savePercentage)} vs ${game.opponent.name}`}
            className="rounded-lg border border-white/10 bg-white/[0.035] px-2 py-4 text-center transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.07]"
          >
            <span className="block text-xs text-slate-500">
              {game.decision ?? "—"}
            </span>
            <span className="mt-1 block text-xs font-semibold text-white">
              {formatSavePercentage(game.savePercentage)}
            </span>
          </Link>
        ))}
      </div>
    </RecentFormSection>
  );
}

function RecentFormSection({
  gameCount,
  children,
}: {
  gameCount: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-300">
            Recent form
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            Last {gameCount} Games
          </h3>
        </div>
        <p className="text-sm text-slate-500">Newest game appears first</p>
      </div>
      {children}
    </section>
  );
}

function SkaterGameTable({
  gamePage,
  seasonId,
  playerId,
  phase,
  pageSize,
  sort,
  direction,
}: {
  gamePage: PageSlice<SkaterGameLogEntry>;
  seasonId: number;
  playerId: number;
  phase: string;
  pageSize: number;
  sort: SkaterSort;
  direction: "asc" | "desc";
}) {
  return (
    <GameTableSection
      eyebrow="Skater appearances"
      title="All Games"
      detail={`${gamePage.firstItem}–${gamePage.lastItem} of ${gamePage.totalItems} games`}
      note="Game score, individual xG, and on-ice xG% are MoneyPuck all-situations metrics. Advanced player data covers regular-season games from 2008–09 onward."
    >
      <SortableTable defaultSortKey={sort} defaultDirection={direction} urlBacked scrollTarget="game-log-results">
        <div className="workspace-table-scroll-viewport">
          <table className="workspace-table-dense workspace-sticky-table-header w-full min-w-[1380px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <LogHeaders goalie={false} />
              </tr>
            </thead>
            <tbody>
              {gamePage.items.map((game) => (
                <tr
                  key={game.nhlGameId}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                >
                  <GameIdentityCells game={game} seasonId={seasonId} />
                  <NumericCell value={game.goals} />
                  <NumericCell value={game.assists} />
                  <NumericCell value={game.points} highlight />
                  <NumericCell
                    value={formatSigned(game.plusMinus)}
                    sortValue={game.plusMinus}
                  />
                  <NumericCell value={game.shotsOnGoal} />
                  <NumericCell value={game.hits} />
                  <NumericCell value={game.blockedShots} />
                  <NumericCell
                    value={formatTimeOnIce(game.timeOnIceSeconds)}
                    sortValue={game.timeOnIceSeconds}
                  />
                  <NumericCell
                    value={formatDecimal(game.gameScore)}
                    sortValue={game.gameScore}
                  />
                  <NumericCell
                    value={formatDecimal(game.individualXGoals)}
                    sortValue={game.individualXGoals}
                  />
                  <NumericCell
                    value={formatPercentage(game.onIceXGoalsPercentage)}
                    sortValue={game.onIceXGoalsPercentage}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SortableTable>
      <ResultNavigation path={`/players/${playerId}/games`} params={{ season: seasonId, phase, sort, direction }} currentPage={gamePage.currentPage} totalPages={gamePage.totalPages} firstItem={gamePage.firstItem} lastItem={gamePage.lastItem} totalItems={gamePage.totalItems} pageSize={pageSize} scrollTarget="game-log-results" />
    </GameTableSection>
  );
}

function GoalieGameTable({
  gamePage,
  seasonId,
  playerId,
  phase,
  pageSize,
  sort,
  direction,
}: {
  gamePage: PageSlice<GoalieGameLogEntry>;
  seasonId: number;
  playerId: number;
  phase: string;
  pageSize: number;
  sort: GoalieSort;
  direction: "asc" | "desc";
}) {
  return (
    <GameTableSection
      eyebrow="Goalie appearances"
      title="All Games"
      detail={`${gamePage.firstItem}–${gamePage.lastItem} of ${gamePage.totalItems} games`}
      note="Expected goals against and GSAx are MoneyPuck all-situations metrics. Advanced player data covers regular-season games from 2008–09 onward."
    >
      <SortableTable defaultSortKey={sort} defaultDirection={direction} urlBacked scrollTarget="game-log-results">
        <div className="workspace-table-scroll-viewport">
          <table className="workspace-table-dense workspace-sticky-table-header w-full min-w-[1220px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-xs uppercase tracking-[0.12em] text-slate-400">
                <LogHeaders goalie />
              </tr>
            </thead>
            <tbody>
              {gamePage.items.map((game) => (
                <tr
                  key={game.nhlGameId}
                  className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
                >
                  <GameIdentityCells game={game} seasonId={seasonId} />
                  <td className="px-3 py-3 text-center">
                    {game.starter ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-white">
                    {game.decision ?? "—"}
                  </td>
                  <NumericCell value={game.goalsAgainst} />
                  <NumericCell value={game.shotsAgainst} />
                  <NumericCell value={game.saves} />
                  <NumericCell
                    value={formatSavePercentage(game.savePercentage)}
                    sortValue={game.savePercentage}
                    highlight
                  />
                  <NumericCell
                    value={formatTimeOnIce(game.timeOnIceSeconds)}
                    sortValue={game.timeOnIceSeconds}
                  />
                  <NumericCell
                    value={formatDecimal(game.expectedGoalsAgainst)}
                    sortValue={game.expectedGoalsAgainst}
                  />
                  <NumericCell
                    value={formatSignedDecimal(game.goalsSavedAboveExpected)}
                    sortValue={game.goalsSavedAboveExpected}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SortableTable>
      <ResultNavigation path={`/players/${playerId}/games`} params={{ season: seasonId, phase, sort, direction }} currentPage={gamePage.currentPage} totalPages={gamePage.totalPages} firstItem={gamePage.firstItem} lastItem={gamePage.lastItem} totalItems={gamePage.totalItems} pageSize={pageSize} scrollTarget="game-log-results" />
    </GameTableSection>
  );
}

function LogHeaders({ goalie }: { goalie: boolean }) {
  return (
    <>
      <SortableHeader label="Date" sortKey="date" align="left" />
      <SortableHeader label="Type" sortKey="type" align="left" />
      <SortableHeader
        label="Team"
        sortKey="team"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader
        label="Venue"
        sortKey="venue"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader
        label="Opponent"
        sortKey="opponent"
        align="left"
        defaultDirection="asc"
      />
      <SortableHeader label="Score" sortKey="score" />
      {goalie ? (
        <>
          <SortableHeader
            label="Start"
            sortKey="starter"
            align="center"
          />
          <SortableHeader
            label="Dec."
            sortKey="decision"
            align="center"
          />
          <SortableHeader label="GA" sortKey="goalsAgainst" />
          <SortableHeader label="SA" sortKey="shotsAgainst" />
          <SortableHeader label="SV" sortKey="saves" />
          <SortableHeader label="SV%" sortKey="savePercentage" />
          <SortableHeader label="TOI" sortKey="timeOnIce" />
          <SortableHeader label="xGA" sortKey="expectedGoalsAgainst" />
          <SortableHeader label="GSAx" sortKey="goalsSavedAboveExpected" />
        </>
      ) : (
        <>
          <SortableHeader label="G" sortKey="goals" />
          <SortableHeader label="A" sortKey="assists" />
          <SortableHeader label="PTS" sortKey="points" />
          <SortableHeader label="+/-" sortKey="plusMinus" />
          <SortableHeader label="SOG" sortKey="shotsOnGoal" />
          <SortableHeader label="HIT" sortKey="hits" />
          <SortableHeader label="BLK" sortKey="blockedShots" />
          <SortableHeader label="TOI" sortKey="timeOnIce" />
          <SortableHeader label="Game score" sortKey="gameScore" />
          <SortableHeader label="ixG" sortKey="individualXGoals" />
          <SortableHeader label="On-ice xG%" sortKey="onIceXGoalsPercentage" />
        </>
      )}
    </>
  );
}

function GameIdentityCells({
  game,
  seasonId,
}: {
  game: SkaterGameLogEntry | GoalieGameLogEntry;
  seasonId: number;
}) {
  return (
    <>
      <td
        className="px-3 py-3"
        data-sort-value={game.gameDate.replaceAll("-", "")}
      >
        <Link
          href={`/games/${game.nhlGameId}`}
          className="font-medium text-white transition hover:text-cyan-200"
        >
          {formatDate(game.gameDate)}
        </Link>
      </td>
      <td className="px-3 py-3">{game.gameType === 3 ? "Playoffs" : "Regular"}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <TeamLogo {...game.team} size="tiny" decorative />
          <Link
            href={`/teams/${game.team.nhlTeamId}?season=${seasonId}`}
            className="transition hover:text-cyan-200"
          >
            {game.team.abbreviation}
          </Link>
        </div>
      </td>
      <td className="px-3 py-3">{game.isHome ? "Home" : "Away"}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <TeamLogo {...game.opponent} size="tiny" decorative />
          <Link
            href={`/teams/${game.opponent.nhlTeamId}?season=${seasonId}`}
            className="transition hover:text-cyan-200"
          >
            {game.opponent.abbreviation}
          </Link>
        </div>
      </td>
      <NumericCell
        value={
          game.teamScore === null || game.opponentScore === null
            ? null
            : `${game.teamScore}–${game.opponentScore}`
        }
        sortValue={
          game.teamScore === null || game.opponentScore === null
            ? null
            : game.teamScore - game.opponentScore
        }
      />
    </>
  );
}

function GameTableSection({
  eyebrow,
  title,
  detail,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12" id="game-log-results">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
        {children}
      </div>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
    </section>
  );
}

const SKATER_SORTS = ["date", "type", "team", "venue", "opponent", "score", "goals", "assists", "points", "plusMinus", "shotsOnGoal", "hits", "blockedShots", "timeOnIce", "gameScore", "individualXGoals", "onIceXGoalsPercentage"] as const;
const GOALIE_SORTS = ["date", "type", "team", "venue", "opponent", "score", "starter", "decision", "goalsAgainst", "shotsAgainst", "saves", "savePercentage", "timeOnIce", "expectedGoalsAgainst", "goalsSavedAboveExpected"] as const;
type SkaterSort = (typeof SKATER_SORTS)[number];
type GoalieSort = (typeof GOALIE_SORTS)[number];

function parseSkaterSort(value: string | undefined): SkaterSort {
  return SKATER_SORTS.includes(value as SkaterSort) ? (value as SkaterSort) : "date";
}

function parseGoalieSort(value: string | undefined): GoalieSort {
  return GOALIE_SORTS.includes(value as GoalieSort) ? (value as GoalieSort) : "date";
}

function gameIdentityValue(game: SkaterGameLogEntry | GoalieGameLogEntry, sort: string): string | number | null | undefined {
  return ({ date: game.gameDate, type: game.gameType, team: game.team.name, venue: game.isHome ? "Home" : "Away", opponent: game.opponent.name, score: game.teamScore === null || game.opponentScore === null ? null : game.teamScore - game.opponentScore, timeOnIce: game.timeOnIceSeconds })[sort];
}

function sortSkaterGames(rows: SkaterGameLogEntry[], sort: SkaterSort, direction: "asc" | "desc"): SkaterGameLogEntry[] {
  const value = (game: SkaterGameLogEntry): string | number | null => gameIdentityValue(game, sort) ?? (skaterMetricValues(game)[sort] ?? null);
  return [...rows].sort((left, right) => compareNullable(value(left), value(right), direction));
}

function sortGoalieGames(rows: GoalieGameLogEntry[], sort: GoalieSort, direction: "asc" | "desc"): GoalieGameLogEntry[] {
  const value = (game: GoalieGameLogEntry): string | number | null => gameIdentityValue(game, sort) ?? (goalieMetricValues(game)[sort] ?? null);
  return [...rows].sort((left, right) => compareNullable(value(left), value(right), direction));
}

function skaterMetricValues(game: SkaterGameLogEntry): Record<string, string | number | null> {
  return { goals: game.goals, assists: game.assists, points: game.points, plusMinus: game.plusMinus, shotsOnGoal: game.shotsOnGoal, hits: game.hits, blockedShots: game.blockedShots, gameScore: game.gameScore, individualXGoals: game.individualXGoals, onIceXGoalsPercentage: game.onIceXGoalsPercentage };
}

function goalieMetricValues(game: GoalieGameLogEntry): Record<string, string | number | null> {
  return { starter: game.starter ? 1 : 0, decision: game.decision, goalsAgainst: game.goalsAgainst, shotsAgainst: game.shotsAgainst, saves: game.saves, savePercentage: game.savePercentage, expectedGoalsAgainst: game.expectedGoalsAgainst, goalsSavedAboveExpected: game.goalsSavedAboveExpected };
}

function compareNullable(left: string | number | null, right: string | number | null, direction: "asc" | "desc"): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  const comparison = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? comparison : -comparison;
}

function NumericCell({
  value,
  sortValue,
  highlight = false,
}: {
  value: string | number | null;
  sortValue?: string | number | null;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-white" : ""}`}
      data-sort-value={sortValue ?? value ?? ""}
    >
      {value ?? "—"}
    </td>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTimeOnIce(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function formatDecimal(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSignedDecimal(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
