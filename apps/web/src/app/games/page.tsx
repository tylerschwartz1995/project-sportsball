import Link from "next/link";
import { redirect } from "next/navigation";

import { GamePicker } from "@/app/_components/game-picker";
import { LocalGameTime } from "@/app/_components/local-game-time";
import { SiteHeader } from "@/app/_components/site-header";
import { TeamGameRecord } from "@/app/_components/team-game-record";
import { TeamLogo } from "@/app/_components/team-logo";
import { WorkspacePageHeader } from "@/app/_components/workspace-primitives";
import {
  formatGameState,
  parseGameDate,
  type GameSummary,
} from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import {
  gameTypeForPhase,
  parseSeasonPhase,
} from "@/contracts/season-phase";
import {
  getGamesByDate,
  listGameDates,
  listScheduleTeams,
} from "@/data/games";
import { listScheduleSeasons } from "@/data/seasons";
import { resolveScheduleDate } from "@/lib/schedule-navigation";

export const dynamic = "force-dynamic";

type GamesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    date?: string | string[];
    phase?: string | string[];
    team?: string | string[];
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
  const rawTeamId = Number(firstValue(requested.team));
  const requestedTeamId =
    Number.isSafeInteger(rawTeamId) && rawTeamId > 0 ? rawTeamId : undefined;
  const [allGameDates, requestedTeamGameDates, scheduleTeams] = selectedSeason
    ? await Promise.all([
        listGameDates(selectedSeason.id, gameType),
        requestedTeamId
          ? listGameDates(selectedSeason.id, gameType, requestedTeamId)
          : Promise.resolve([]),
        listScheduleTeams(selectedSeason.id, gameType),
      ])
    : [[], [], []];
  const selectedTeam = scheduleTeams.find(
    (team) => team.nhlTeamId === requestedTeamId,
  );
  const gameDates = selectedTeam ? requestedTeamGameDates : allGameDates;
  const requestedDateValue = firstValue(requested.date);
  const requestedDate = parseGameDate(requestedDateValue);
  const selectedDate = resolveScheduleDate(requestedDate, gameDates);

  if (
    selectedSeason &&
    selectedDate &&
    requestedDateValue &&
    selectedDate !== requestedDateValue
  ) {
    const search = new URLSearchParams({
      season: String(selectedSeason.id),
      phase,
      date: selectedDate,
    });
    if (selectedTeam) search.set("team", String(selectedTeam.nhlTeamId));
    redirect(`/games?${search.toString()}`);
  }
  const games =
    selectedSeason && selectedDate
      ? await getGamesByDate(selectedSeason.id, selectedDate, gameType)
      : [];
  const visibleGames = selectedTeam
    ? games.filter(
        (game) =>
          game.awayTeam.nhlTeamId === selectedTeam.nhlTeamId ||
          game.homeTeam.nhlTeamId === selectedTeam.nhlTeamId,
      )
    : games;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="games" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Schedule and results"
          title={
            selectedSeason
              ? `${selectedSeason.label} NHL Schedule`
              : "No Schedule Available"
          }
          description="Every NHL matchup, final score, and shot total from the selected date, using the team name active in that season."
        />

        {selectedSeason && selectedDate && gameDates.length > 0 ? (
          <>
            <GamePicker
              key={`${selectedSeason.id}:${phase}:${selectedTeam?.nhlTeamId ?? "all"}`}
              seasons={seasons}
              selectedSeasonId={selectedSeason.id}
              gameDates={gameDates}
              selectedDate={selectedDate}
              phase={phase}
              teams={scheduleTeams}
              selectedTeamId={selectedTeam?.nhlTeamId}
            />

            <div className="workspace-schedule-results-heading">
              <div>
                <p>
                  {selectedTeam
                    ? `${selectedTeam.name} Schedule`
                    : "League Schedule"}
                </p>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <span>
                {visibleGames.length} {visibleGames.length === 1 ? "game" : "games"}
                {" · "}Times shown in your local timezone
              </span>
            </div>

            {visibleGames.length > 0 ? (
              <div className="workspace-game-grid">
                {visibleGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="workspace-empty-state mt-8">
                <strong>
                  {selectedTeam
                    ? `${selectedTeam.name} does not play on this date.`
                    : "No NHL games are scheduled on this date."}
                </strong>
                <span>
                  Choose another day from the week or open the calendar to jump
                  elsewhere in the season.
                </span>
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

function GameCard({ game }: { game: GameSummary }) {
  const completed = hasFinalScore(game);

  return (
    <article className="workspace-game-card">
      <div className="workspace-game-card-header">
        <span>
          {game.gameType === 3 ? "Playoffs" : "Regular season"}
        </span>
        <strong data-complete={completed}>
          {completed ? finalLabel(game.lastPeriodType) : formatGameState(game.state)}
        </strong>
      </div>
      <div className="workspace-game-card-teams">
        <TeamLine team={game.awayTeam} seasonId={game.seasonId} side="away" />
        <TeamLine team={game.homeTeam} seasonId={game.seasonId} side="home" />
      </div>
      <div className="workspace-game-card-footer">
        <span>
          <LocalGameTime value={game.startTimeUtc} /> start
        </span>
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
  side,
}: {
  team: GameSummary["awayTeam"];
  seasonId: number;
  side: "away" | "home";
}) {
  return (
    <div className="workspace-game-team">
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="compact"
        decorative
        prominent
      />
      <div>
        <div className="workspace-game-team-name">
          <span className="workspace-game-team-venue">{side}</span>
          <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
            {team.name}
          </Link>
          <TeamGameRecord record={team.record} />
        </div>
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

function hasFinalScore(game: GameSummary): boolean {
  return game.awayTeam.score !== null && game.homeTeam.score !== null;
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

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
