import Link from "next/link";
import { notFound } from "next/navigation";

import {
  GameAdvancedAnalytics,
  type GameAdvancedView,
} from "@/app/_components/game-advanced-analytics";
import { GamePlayByPlayView } from "@/app/_components/play-by-play";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamGameRecord } from "@/app/_components/team-game-record";
import { TeamLogo } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  DataTableShell,
  SectionHeader,
} from "@/app/_components/ui-primitives";
import { parseNhlId } from "@/contracts/entity";
import {
  formatGameState,
  type GameBoxScoreTeam,
  type GameGoalieStats,
  type GameSkaterStats,
} from "@/contracts/game";
import { getMoneyPuckGameAnalytics } from "@/data/advanced-game";
import { getGameBoxScore } from "@/data/games";
import { getGamePlayByPlay } from "@/data/play-by-play";
import { buildGameFlow } from "@/lib/game-flow";
import { formatPlayerPosition } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type GameView = "scoring" | "box-score" | "advanced";

type GamePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    view?: string | string[];
    advancedView?: string | string[];
  }>;
};

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const nhlGameId = parseNhlId((await params).id);
  if (nhlGameId === null) {
    notFound();
  }

  const [game, advanced, playByPlay] = await Promise.all([
    getGameBoxScore(nhlGameId),
    getMoneyPuckGameAnalytics(nhlGameId),
    getGamePlayByPlay(nhlGameId),
  ]);
  if (!game) {
    notFound();
  }

  const completed =
    game.awayTeam.score !== null && game.homeTeam.score !== null;
  const hasBoxScore =
    game.awayTeam.skaters.length > 0 ||
    game.homeTeam.skaters.length > 0 ||
    game.awayTeam.goalies.length > 0 ||
    game.homeTeam.goalies.length > 0;
  const pageParams = await searchParams;
  const requestedView = parseGameView(firstValue(pageParams.view));
  const view = normalizeGameView(requestedView, {
    scoring: playByPlay.events.length > 0,
    boxScore: hasBoxScore,
    advanced: Boolean(advanced),
  });
  const advancedView = parseGameAdvancedView(
    firstValue(pageParams.advancedView),
  );
  const tabs = [
    playByPlay.events.length > 0
      ? {
          id: "scoring" as const,
          label: "Scoring & Timeline",
          href: `/games/${game.nhlGameId}?view=scoring`,
        }
      : null,
    hasBoxScore
      ? {
          id: "box-score" as const,
          label: "Box Score",
          href: `/games/${game.nhlGameId}?view=box-score`,
        }
      : null,
    advanced
      ? {
          id: "advanced" as const,
          label: "Advanced Analytics",
          href: `/games/${game.nhlGameId}?view=advanced&advancedView=${advancedView}`,
        }
      : null,
  ].filter((tab): tab is NonNullable<typeof tab> => tab !== null);
  const gameFlow = buildGameFlow({
    shots: advanced?.shots ?? [],
    events: playByPlay.events,
    awayTeam: game.awayTeam,
    homeTeam: game.homeTeam,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <Link
          href={`/games?season=${game.seasonId}&phase=${game.gameType === 3 ? "playoffs" : "regular"}&date=${game.gameDate}`}
          className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          ← Games on {formatDate(game.gameDate)}
        </Link>

        <div className="workspace-game-hero">
          <div className="workspace-game-hero-meta">
            <span>
              {game.gameType === 3 ? "NHL playoffs" : "Regular season"}
            </span>
            <h1 className="sr-only">
              {game.awayTeam.name} at {game.homeTeam.name}
            </h1>
            <strong>
              {completed ? finalLabel(game.lastPeriodType) : formatGameState(game.state)}
            </strong>
          </div>

          <div className="workspace-game-hero-score">
            <ScoreTeam team={game.awayTeam} seasonId={game.seasonId} />
            <div className="workspace-game-hero-at">
              at
            </div>
            <ScoreTeam
              team={game.homeTeam}
              seasonId={game.seasonId}
              align="right"
            />
          </div>

          <div className="workspace-game-hero-footer">
            <span>{formatDate(game.gameDate)}</span>
            <span>{formatTime(game.startTimeUtc)}</span>
          </div>
        </div>

        <ViewTabs
          active={view}
          ariaLabel="Game views"
          tabs={tabs}
        />

        {view === "scoring" ? (
          <GamePlayByPlayView
            data={playByPlay}
            awayTeam={game.awayTeam}
            homeTeam={game.homeTeam}
            seasonId={game.seasonId}
            gameFlow={gameFlow}
          />
        ) : null}

        {view === "box-score" && hasBoxScore ? (
          <div
            id="box-score"
            className="workspace-width-standard mt-12 space-y-14 scroll-mt-6"
          >
            <TeamBoxScore team={game.awayTeam} seasonId={game.seasonId} />
            <TeamBoxScore team={game.homeTeam} seasonId={game.seasonId} />
          </div>
        ) : view === "box-score" ? (
          <div className="mt-10 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
            The player box score is not available yet.
          </div>
        ) : null}

        {view === "advanced" && advanced ? (
          <div>
            <GameAdvancedAnalytics data={advanced} view={advancedView} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ScoreTeam({
  team,
  seasonId,
  align = "left",
}: {
  team: GameBoxScoreTeam;
  seasonId: number;
  align?: "left" | "right";
}) {
  return (
    <div className="workspace-game-score-team" data-align={align}>
      <div className="workspace-game-score-identity">
        <TeamLogo
          nhlTeamId={team.nhlTeamId}
          abbreviation={team.abbreviation}
          name={team.name}
          size="profile"
          decorative
          prominent
        />
        <div>
          <small>
            {align === "right" ? "Home" : "Away"} · {team.abbreviation}
          </small>
          <div className="workspace-game-score-name">
            {align === "right" ? (
              <TeamGameRecord record={team.record} />
            ) : null}
            <Link
              href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
            >
              {team.name}
            </Link>
            {align === "left" ? (
              <TeamGameRecord record={team.record} />
            ) : null}
          </div>
          <p>
            {team.shotsOnGoal === null
              ? "Shots unavailable"
              : `${team.shotsOnGoal} shots`}
          </p>
        </div>
      </div>
      <strong>
        {team.score ?? "—"}
      </strong>
    </div>
  );
}

function TeamBoxScore({
  team,
  seasonId,
}: {
  team: GameBoxScoreTeam;
  seasonId: number;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow={`${team.abbreviation} box score`}
        title={team.name}
        description="Official NHL player results for this game."
        action={
          <div className="flex items-center gap-3">
            <TeamLogo
              nhlTeamId={team.nhlTeamId}
              abbreviation={team.abbreviation}
              name={team.name}
              size="compact"
              decorative
              prominent
            />
            <p className="text-sm text-slate-500">
              {team.skaters.length} skaters · {team.goalies.length} goalies
            </p>
          </div>
        }
      />

      <h3 className="mt-7 text-lg font-semibold text-white">Skaters</h3>
      <SkaterTable
        players={team.skaters}
        seasonId={seasonId}
        team={team}
      />

      <h3 className="mt-8 text-lg font-semibold text-white">Goalies</h3>
      <GoalieTable
        players={team.goalies}
        seasonId={seasonId}
        team={team}
      />
    </section>
  );
}

function SkaterTable({
  players,
  seasonId,
  team,
}: {
  players: GameSkaterStats[];
  seasonId: number;
  team: GameBoxScoreTeam;
}) {
  return (
    <DataTableShell>
      <SortableTable defaultSortKey="points">
      <div className="workspace-table-scroll">
        <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[940px]">
          <colgroup>
            <col className="workspace-col-entity" />
            <col className="workspace-col-stat" span={8} />
            <col className="workspace-col-time" />
          </colgroup>
          <caption className="sr-only">{team.name} skater box score</caption>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <SortableHeader label="Player" sortKey="player" align="left" defaultDirection="asc" />
              <SortableHeader label="G" sortKey="goals" />
              <SortableHeader label="A" sortKey="assists" />
              <SortableHeader label="PTS" sortKey="points" />
              <SortableHeader label="+/-" sortKey="plusMinus" />
              <SortableHeader label="S" sortKey="shots" />
              <SortableHeader label="HIT" sortKey="hits" />
              <SortableHeader label="BLK" sortKey="blocks" />
              <SortableHeader label="PIM" sortKey="penaltyMinutes" />
              <SortableHeader label="TOI" sortKey="timeOnIce" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.nhlPlayerId}
                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
              >
                <td className="px-4 py-3">
                  <div>
                      <Link
                        href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                        className="workspace-entity-name font-medium text-white transition hover:text-cyan-200"
                      >
                        {player.name}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">
                        {player.sweaterNumber === null
                          ? ""
                          : `#${player.sweaterNumber} · `}
                        {formatPlayerPosition(player.position)}
                      </span>
                  </div>
                </td>
                <NumericCell value={player.goals} />
                <NumericCell value={player.assists} />
                <NumericCell value={player.points} highlight />
                <NumericCell value={formatSigned(player.plusMinus)} />
                <NumericCell value={player.shotsOnGoal} />
                <NumericCell value={player.hits} />
                <NumericCell value={player.blockedShots} />
                <NumericCell value={player.penaltyMinutes} />
                <NumericCell value={formatTimeOnIce(player.timeOnIceSeconds)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </SortableTable>
    </DataTableShell>
  );
}

function GoalieTable({
  players,
  seasonId,
  team,
}: {
  players: GameGoalieStats[];
  seasonId: number;
  team: GameBoxScoreTeam;
}) {
  return (
    <DataTableShell>
      <SortableTable defaultSortKey="shotsAgainst">
      <div className="workspace-table-scroll">
        <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[900px]">
          <colgroup>
            <col className="workspace-col-entity" />
            <col className="workspace-col-stat" span={4} />
            <col className="workspace-col-percentage" />
            <col className="workspace-col-split" span={2} />
            <col className="workspace-col-time" />
          </colgroup>
          <caption className="sr-only">{team.name} goalie box score</caption>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.035] text-left text-xs uppercase tracking-[0.12em] text-slate-400">
              <SortableHeader label="Goalie" sortKey="goalie" align="left" defaultDirection="asc" />
              <SortableHeader label="DEC" sortKey="decision" defaultDirection="asc" />
              <SortableHeader label="SA" sortKey="shotsAgainst" />
              <SortableHeader label="SV" sortKey="saves" />
              <SortableHeader label="GA" sortKey="goalsAgainst" defaultDirection="asc" />
              <SortableHeader label="SV%" sortKey="savePercentage" />
              <SortableHeader label="EV SV/GA" sortKey="evenStrength" />
              <SortableHeader label="PP SV/GA" sortKey="powerPlay" />
              <SortableHeader label="TOI" sortKey="timeOnIce" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr
                key={player.nhlPlayerId}
                className="border-b border-white/[0.06] text-slate-300 last:border-0 hover:bg-white/[0.035]"
              >
                <td className="px-4 py-3">
                  <div>
                      <Link
                        href={`/players/${player.nhlPlayerId}?season=${seasonId}`}
                        className="workspace-entity-name font-medium text-white transition hover:text-cyan-200"
                      >
                        {player.name}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">
                        {player.starter ? "Starter" : "Backup"}
                      </span>
                  </div>
                </td>
                <NumericCell value={player.decision ?? "—"} />
                <NumericCell value={player.shotsAgainst} />
                <NumericCell value={player.saves} />
                <NumericCell value={player.goalsAgainst} />
                <NumericCell
                  value={formatSavePercentage(player.savePercentage)}
                  highlight
                />
                <NumericCell
                  value={`${player.evenStrengthSaves}/${player.evenStrengthGoalsAgainst}`}
                />
                <NumericCell
                  value={`${player.powerPlaySaves}/${player.powerPlayGoalsAgainst}`}
                />
                <NumericCell
                  value={
                    player.timeOnIceSeconds
                      ? formatTimeOnIce(player.timeOnIceSeconds)
                      : "DNP"
                  }
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </SortableTable>
    </DataTableShell>
  );
}

function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${
        highlight ? "font-semibold text-cyan-200" : "text-slate-300"
      }`}
    >
      {value}
    </td>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatTimeOnIce(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

function parseGameView(value: string | undefined): GameView {
  return value === "scoring" || value === "box-score" || value === "advanced"
    ? value
    : "scoring";
}

function normalizeGameView(
  view: GameView,
  availability: {
    scoring: boolean;
    boxScore: boolean;
    advanced: boolean;
  },
): GameView {
  if (view === "scoring" && availability.scoring) return view;
  if (view === "box-score" && availability.boxScore) return view;
  if (view === "advanced" && availability.advanced) return view;
  if (availability.scoring) return "scoring";
  if (availability.boxScore) return "box-score";
  return "advanced";
}

function parseGameAdvancedView(value: string | undefined): GameAdvancedView {
  return value === "shots" ||
    value === "players" ||
    value === "combinations"
    ? value
    : "teams";
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
