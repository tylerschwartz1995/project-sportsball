import Link from "next/link";

import { SiteHeader } from "@/app/_components/site-header";
import { SeasonPhaseFilter } from "@/app/_components/season-phase-filter";
import {
  WorkspacePageHeader,
} from "@/app/_components/workspace-primitives";
import { parseGameDate, type GameSummary } from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
} from "@/contracts/season-phase";
import { getGamesByDate, listGameDates } from "@/data/games";
import { listScheduleSeasons } from "@/data/seasons";

export const dynamic = "force-dynamic";

type GamesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    date?: string | string[];
    phase?: string | string[];
  }>;
};

export default async function GamesPage({ searchParams }: GamesPageProps) {
  const seasons = await listScheduleSeasons();
  const requested = await searchParams;
  const requestedSeason = firstValue(requested.season);
  const phase = parseSeasonPhase(firstValue(requested.phase));
  const gameType = gameTypeForPhase(phase);
  const parsedSeason = parseSeasonId(requestedSeason);
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const gameDates = selectedSeason
    ? await listGameDates(selectedSeason.id, gameType)
    : [];
  const requestedDate = parseGameDate(firstValue(requested.date));
  const selectedDate =
    gameDates.find((entry) => entry.date === requestedDate)?.date ??
    gameDates[0]?.date;
  const games =
    selectedSeason && selectedDate
      ? await getGamesByDate(selectedSeason.id, selectedDate, gameType)
      : [];
  const chronologicalDates = [...gameDates].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const selectedDateIndex = chronologicalDates.findIndex(
    (entry) => entry.date === selectedDate,
  );
  const newerDate =
    selectedDateIndex >= 0
      ? chronologicalDates[selectedDateIndex + 1]?.date
      : undefined;
  const olderDate =
    selectedDateIndex > 0
      ? chronologicalDates[selectedDateIndex - 1]?.date
      : undefined;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Schedule and results"
          title={
            selectedDate ? formatDate(selectedDate) : "No Schedule Available"
          }
          description="Every NHL matchup, final score, and shot total from the selected date, using the team name active in that season."
          action={
            <GamePicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              gameDates={gameDates}
              selectedDate={selectedDate}
              phase={phase}
            />
          }
        />

        {selectedSeason && selectedDate ? (
          <>
            <SeasonPhaseFilter
              active={phase}
              path="/games"
              params={{ season: selectedSeason.id }}
              label="Schedule phase"
            />
            <div className="workspace-date-navigation">
              <p>
                {selectedSeason.label} season · {gameDates.length} game dates
              </p>
              <nav aria-label="Game date navigation">
                <DateLink
                  label="← Older"
                  seasonId={selectedSeason.id}
                  date={olderDate}
                  phase={phase}
                />
                <DateLink
                  label="Newer →"
                  seasonId={selectedSeason.id}
                  date={newerDate}
                  phase={phase}
                />
              </nav>
            </div>

            {games.length > 0 ? (
              <div className="workspace-game-grid">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="workspace-empty-state mt-8">
                <strong>No games on this date.</strong>
                <span>Choose another stored game date to view its schedule and results.</span>
              </div>
            )}
          </>
        ) : (
          <div className="workspace-empty-state mt-10">
            <strong>No schedule is available.</strong>
            <span>The selected season and phase do not contain stored game dates.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function GamePicker({
  seasons,
  selectedSeasonId,
  gameDates,
  selectedDate,
  phase,
}: {
  seasons: Array<{ id: number; label: string }>;
  selectedSeasonId: number | undefined;
  gameDates: Array<{ date: string; gameCount: number }>;
  selectedDate: string | undefined;
  phase: string;
}) {
  return (
    <form method="get" className="workspace-game-picker">
      <input type="hidden" name="phase" value={phase} />
      <label>
        Season
        <select name="season" defaultValue={selectedSeasonId}>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Game date
        <select name="date" defaultValue={selectedDate}>
          {gameDates.map((entry) => (
            <option key={entry.date} value={entry.date}>
              {entry.date} · {entry.gameCount}{" "}
              {entry.gameCount === 1 ? "game" : "games"}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">View</button>
    </form>
  );
}

function GameCard({ game }: { game: GameSummary }) {
  const completed = hasFinalScore(game);

  return (
    <article className="workspace-game-card">
      <div className="workspace-game-card-header">
        <span>
          {game.gameType === 3 ? "Playoffs" : "Regular season"}
        </span>
        <strong data-complete={completed}>
          {completed ? finalLabel(game.lastPeriodType) : gameStateLabel(game.state)}
        </strong>
      </div>
      <div className="workspace-game-card-teams">
        <TeamLine team={game.awayTeam} seasonId={game.seasonId} />
        <TeamLine team={game.homeTeam} seasonId={game.seasonId} />
      </div>
      <div className="workspace-game-card-footer">
        <span>{formatTime(game.startTimeUtc)}</span>
        <Link
          href={`/games/${game.nhlGameId}`}
        >
          {completed ? "View box score" : "Game preview"} →
        </Link>
      </div>
    </article>
  );
}

function TeamLine({
  team,
  seasonId,
}: {
  team: GameSummary["awayTeam"];
  seasonId: number;
}) {
  return (
    <div className="workspace-game-team">
      <span className="workspace-game-team-abbreviation">
        {team.abbreviation}
      </span>
      <div>
        <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
          {team.name}
        </Link>
        <p>
          {team.shotsOnGoal === null
            ? "Shots unavailable"
            : `${team.shotsOnGoal} shots`}
        </p>
      </div>
      <strong>
        {team.score ?? "—"}
      </strong>
    </div>
  );
}

function DateLink({
  label,
  seasonId,
  date,
  phase,
}: {
  label: string;
  seasonId: number;
  date: string | undefined;
  phase: string;
}) {
  const className = "workspace-date-link";

  return date ? (
    <Link
      href={`/games?season=${seasonId}&date=${date}&phase=${phase}`}
      className={className}
    >
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={className}>
      {label}
    </span>
  );
}

function hasFinalScore(game: GameSummary): boolean {
  return game.awayTeam.score !== null && game.homeTeam.score !== null;
}

function gameStateLabel(state: string): string {
  if (state === "FUT" || state === "PRE") return "Scheduled";
  if (state === "LIVE" || state === "CRIT") return "Live";
  return state;
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string): string {
  return `${new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value))} start`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
