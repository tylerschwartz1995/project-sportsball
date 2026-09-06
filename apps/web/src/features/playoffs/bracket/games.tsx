"use client";
import Link from "@/components/ui/exploration-link";
import type {
  PlayoffSeries,
  PlayoffSeriesGame,
  PlayoffSeriesGameTeam
} from "@/contracts/playoffs";
import { TeamLogo } from "@/features/teams/team-logo";
import { SeriesEmptyState } from './cells';
import { formatGameDate, formatSeriesGameState, formatSeriesProgress } from './logic';
export function SeriesGames({
  series,
  isProjection,
}: {
  series: PlayoffSeries;
  isProjection: boolean;
}) {
  const { gamesWithProgress } = series.games.reduce<{
    teamOneWins: number;
    teamTwoWins: number;
    gamesWithProgress: Array<{
      game: PlayoffSeriesGame;
      seriesProgress: string | null;
    }>;
  }>(
    (progress, game) => {
      const isCompleted =
        game.awayTeam.score !== null && game.homeTeam.score !== null;
      const winningTeamId = isCompleted
        ? game.awayTeam.score! > game.homeTeam.score!
          ? game.awayTeam.nhlTeamId
          : game.homeTeam.nhlTeamId
        : null;
      const teamOneWins =
        progress.teamOneWins +
        (winningTeamId === series.teamOne?.nhlTeamId ? 1 : 0);
      const teamTwoWins =
        progress.teamTwoWins +
        (winningTeamId === series.teamTwo?.nhlTeamId ? 1 : 0);

      return {
        teamOneWins,
        teamTwoWins,
        gamesWithProgress: [
          ...progress.gamesWithProgress,
          {
            game,
            seriesProgress: isCompleted
              ? formatSeriesProgress(series, teamOneWins, teamTwoWins)
              : null,
          },
        ],
      };
    },
    { teamOneWins: 0, teamTwoWins: 0, gamesWithProgress: [] },
  );

  return (
    <section className="workspace-series-games" aria-label="Series games">
      {series.games.length > 0 ? (
        <div>
          {gamesWithProgress.map(({ game, seriesProgress }) => (
            <SeriesGame
              key={game.nhlGameId}
              game={game}
              seriesProgress={seriesProgress}
            />
          ))}
        </div>
      ) : (
        <SeriesEmptyState>
          {isProjection
            ? "Games will appear here once the playoff schedule is available."
            : "No games are stored for this series yet."}
        </SeriesEmptyState>
      )}
    </section>
  );
}

export function SeriesGame({
  game,
  seriesProgress,
}: {
  game: PlayoffSeriesGame;
  seriesProgress: string | null;
}) {
  const gameNumber = game.nhlGameId % 10;
  const state = formatSeriesGameState(game);
  const isFinal = state.startsWith("Final");
  const awayWon =
    game.awayTeam.score !== null &&
    game.homeTeam.score !== null &&
    game.awayTeam.score > game.homeTeam.score;
  const homeWon =
    game.awayTeam.score !== null &&
    game.homeTeam.score !== null &&
    game.homeTeam.score > game.awayTeam.score;

  return (
    <Link
      href={`/games/${game.nhlGameId}`}
      className="workspace-series-game"
      aria-label={`View Game ${gameNumber}: ${game.awayTeam.name} at ${game.homeTeam.name}`}
    >
      <div className="workspace-series-game-meta">
        <strong>Game {gameNumber}</strong>
        <time dateTime={game.startTimeUtc}>{formatGameDate(game)}</time>
        <span className="workspace-series-game-result">
          <span
            className={`workspace-series-game-state${isFinal ? " is-final" : ""}`}
          >
            {state}
          </span>
          {seriesProgress ? <small>{seriesProgress}</small> : null}
        </span>
      </div>
      <div className="workspace-series-game-score">
        <SeriesGameTeam team={game.awayTeam} location="Away" winner={awayWon} />
        <span className="workspace-series-game-at">at</span>
        <SeriesGameTeam team={game.homeTeam} location="Home" winner={homeWon} />
      </div>
      <span className="workspace-series-game-link">View Game →</span>
    </Link>
  );
}

export function SeriesGameTeam({
  team,
  location,
  winner,
}: {
  team: PlayoffSeriesGameTeam;
  location: "Away" | "Home";
  winner: boolean;
}) {
  return (
    <span className={`workspace-series-game-team${winner ? " is-winner" : ""}`}>
      <TeamLogo
        nhlTeamId={team.nhlTeamId}
        abbreviation={team.abbreviation}
        name={team.name}
        size="tiny"
        decorative
        prominent
      />
      <span>
        <small>{location}</small>
        <strong>{team.abbreviation}</strong>
      </span>
      <b>{team.score ?? "—"}</b>
    </span>
  );
}
