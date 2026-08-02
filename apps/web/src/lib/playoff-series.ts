import type {
  PlayoffBracketTeam,
  PlayoffSeries,
} from "@/contracts/playoffs";

export type PlayoffSeriesTeamSummary = {
  team: PlayoffBracketTeam;
  wins: number;
  goals: number;
  goalsPerGame: number;
  shotsOnGoal: number | null;
  shotsPerGame: number | null;
  shotShare: number | null;
};

export type PlayoffSeriesSummary = {
  gamesPlayed: number;
  overtimeGames: number;
  oneGoalGames: number;
  teamOne: PlayoffSeriesTeamSummary;
  teamTwo: PlayoffSeriesTeamSummary;
};

export function summarizePlayoffSeries(
  series: PlayoffSeries,
): PlayoffSeriesSummary | null {
  if (!series.teamOne || !series.teamTwo) return null;

  const completedGames = series.games.filter(
    (game) => game.awayTeam.score !== null && game.homeTeam.score !== null,
  );
  if (completedGames.length === 0) return null;

  const teamOneGoals = goalsFor(series.teamOne.nhlTeamId, completedGames);
  const teamTwoGoals = goalsFor(series.teamTwo.nhlTeamId, completedGames);
  const teamOneShots = shotsFor(series.teamOne.nhlTeamId, completedGames);
  const teamTwoShots = shotsFor(series.teamTwo.nhlTeamId, completedGames);
  const totalShots =
    teamOneShots !== null && teamTwoShots !== null
      ? teamOneShots + teamTwoShots
      : null;

  return {
    gamesPlayed: completedGames.length,
    overtimeGames: completedGames.filter(
      (game) => game.lastPeriodType && game.lastPeriodType !== "REG",
    ).length,
    oneGoalGames: completedGames.filter(
      (game) =>
        Math.abs((game.homeTeam.score ?? 0) - (game.awayTeam.score ?? 0)) === 1,
    ).length,
    teamOne: {
      team: series.teamOne,
      wins: series.teamOneWins,
      goals: teamOneGoals,
      goalsPerGame: teamOneGoals / completedGames.length,
      shotsOnGoal: teamOneShots,
      shotsPerGame:
        teamOneShots === null ? null : teamOneShots / completedGames.length,
      shotShare:
        teamOneShots === null || totalShots === null || totalShots === 0
          ? null
          : teamOneShots / totalShots,
    },
    teamTwo: {
      team: series.teamTwo,
      wins: series.teamTwoWins,
      goals: teamTwoGoals,
      goalsPerGame: teamTwoGoals / completedGames.length,
      shotsOnGoal: teamTwoShots,
      shotsPerGame:
        teamTwoShots === null ? null : teamTwoShots / completedGames.length,
      shotShare:
        teamTwoShots === null || totalShots === null || totalShots === 0
          ? null
          : teamTwoShots / totalShots,
    },
  };
}

function goalsFor(
  nhlTeamId: number,
  games: PlayoffSeries["games"],
): number {
  return games.reduce((total, game) => {
    if (game.awayTeam.nhlTeamId === nhlTeamId) {
      return total + (game.awayTeam.score ?? 0);
    }
    if (game.homeTeam.nhlTeamId === nhlTeamId) {
      return total + (game.homeTeam.score ?? 0);
    }
    return total;
  }, 0);
}

function shotsFor(
  nhlTeamId: number,
  games: PlayoffSeries["games"],
): number | null {
  let total = 0;
  for (const game of games) {
    const shots =
      game.awayTeam.nhlTeamId === nhlTeamId
        ? game.awayTeam.shotsOnGoal
        : game.homeTeam.nhlTeamId === nhlTeamId
          ? game.homeTeam.shotsOnGoal
          : null;
    if (shots === null) return null;
    total += shots;
  }
  return total;
}
