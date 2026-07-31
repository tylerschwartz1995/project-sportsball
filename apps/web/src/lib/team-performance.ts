import type { TeamGameLogEntry } from "@/contracts/game-log";

export const TEAM_PERFORMANCE_WINDOWS = [5, 10, 20] as const;

export type TeamPerformanceWindow =
  (typeof TEAM_PERFORMANCE_WINDOWS)[number];

export type TeamPerformanceVenue = "all" | "home" | "away";

export type TeamPerformanceGame = Pick<
  TeamGameLogEntry,
  | "nhlGameId"
  | "gameDate"
  | "isHome"
  | "opponent"
  | "score"
  | "opponentScore"
  | "result"
  | "fiveOnFiveXGoalsFor"
  | "fiveOnFiveXGoalsAgainst"
>;

export type RollingTeamPerformancePoint = {
  nhlGameId: number;
  gameDate: string;
  opponentAbbreviation: string;
  opponentName: string;
  venueLabel: "vs" | "at";
  result: TeamGameLogEntry["result"];
  scoreLabel: string;
  sampleSize: number;
  advancedSampleSize: number;
  goalSharePercentage: number | null;
  fiveOnFiveExpectedGoalSharePercentage: number | null;
};

export function filterTeamPerformanceGames(
  games: TeamPerformanceGame[],
  venue: TeamPerformanceVenue,
): TeamPerformanceGame[] {
  if (venue === "all") {
    return games;
  }

  return games.filter((game) =>
    venue === "home" ? game.isHome : !game.isHome,
  );
}

export function buildRollingTeamPerformance(
  games: TeamPerformanceGame[],
  windowSize: TeamPerformanceWindow,
): RollingTeamPerformancePoint[] {
  const chronologicalGames = [...games].sort(
    (left, right) =>
      left.gameDate.localeCompare(right.gameDate) ||
      left.nhlGameId - right.nhlGameId,
  );

  return chronologicalGames.map((game, index) => {
    const rollingGames = chronologicalGames.slice(
      Math.max(0, index - windowSize + 1),
      index + 1,
    );
    const goalsFor = rollingGames.reduce(
      (total, rollingGame) => total + rollingGame.score,
      0,
    );
    const goalsAgainst = rollingGames.reduce(
      (total, rollingGame) => total + rollingGame.opponentScore,
      0,
    );
    const advancedGames = rollingGames.filter(
      (rollingGame) =>
        rollingGame.fiveOnFiveXGoalsFor !== null &&
        rollingGame.fiveOnFiveXGoalsAgainst !== null,
    );
    const expectedGoalsFor = advancedGames.reduce(
      (total, rollingGame) =>
        total + (rollingGame.fiveOnFiveXGoalsFor ?? 0),
      0,
    );
    const expectedGoalsAgainst = advancedGames.reduce(
      (total, rollingGame) =>
        total + (rollingGame.fiveOnFiveXGoalsAgainst ?? 0),
      0,
    );

    return {
      nhlGameId: game.nhlGameId,
      gameDate: game.gameDate,
      opponentAbbreviation: game.opponent.abbreviation,
      opponentName: game.opponent.name,
      venueLabel: game.isHome ? "vs" : "at",
      result: game.result,
      scoreLabel: `${game.score}–${game.opponentScore}`,
      sampleSize: rollingGames.length,
      advancedSampleSize: advancedGames.length,
      goalSharePercentage: percentage(goalsFor, goalsAgainst),
      fiveOnFiveExpectedGoalSharePercentage: percentage(
        expectedGoalsFor,
        expectedGoalsAgainst,
      ),
    };
  });
}

function percentage(forValue: number, againstValue: number): number | null {
  const total = forValue + againstValue;
  return total === 0 ? null : (forValue / total) * 100;
}
