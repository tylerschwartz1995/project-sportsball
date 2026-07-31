import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";
import type { RollingWindow } from "@/lib/rolling-performance";

type PlayerGameIdentity = Pick<
  SkaterGameLogEntry,
  | "nhlGameId"
  | "gameDate"
  | "isHome"
  | "team"
  | "opponent"
  | "teamScore"
  | "opponentScore"
>;

export type SkaterPerformanceGame = PlayerGameIdentity &
  Pick<
    SkaterGameLogEntry,
    | "goals"
    | "assists"
    | "points"
    | "shotsOnGoal"
    | "gameScore"
    | "individualXGoals"
    | "onIceXGoalsPercentage"
  >;

export type GoaliePerformanceGame = PlayerGameIdentity &
  Pick<
    GoalieGameLogEntry,
    | "goalsAgainst"
    | "saves"
    | "shotsAgainst"
    | "expectedGoalsAgainst"
    | "goalsSavedAboveExpected"
  >;

type RollingPlayerPerformancePointBase = {
  nhlGameId: number;
  gameDate: string;
  teamAbbreviation: string;
  opponentAbbreviation: string;
  opponentName: string;
  venueLabel: "vs" | "at";
  scoreLabel: string;
  sampleSize: number;
};

export type RollingSkaterPerformancePoint =
  RollingPlayerPerformancePointBase & {
    goalsPerGame: number;
    assistsPerGame: number;
    pointsPerGame: number;
    shotsPerGame: number;
    individualExpectedGoalsPerGame: number | null;
    gameScorePerGame: number | null;
    onIceExpectedGoalsPercentage: number | null;
    advancedSampleSizes: {
      individualExpectedGoalsPerGame: number;
      gameScorePerGame: number;
      onIceExpectedGoalsPercentage: number;
    };
  };

export type RollingGoaliePerformancePoint =
  RollingPlayerPerformancePointBase & {
    savePercentage: number | null;
    savesPerGame: number;
    goalsAgainstPerGame: number;
    expectedGoalsAgainstPerGame: number | null;
    goalsSavedAboveExpectedPerGame: number | null;
    advancedSampleSizes: {
      expectedGoalsAgainstPerGame: number;
      goalsSavedAboveExpectedPerGame: number;
    };
  };

export function buildRollingSkaterPerformance(
  games: SkaterPerformanceGame[],
  windowSize: RollingWindow,
): RollingSkaterPerformancePoint[] {
  const chronologicalGames = chronological(games);

  return chronologicalGames.map((game, index) => {
    const rollingGames = window(chronologicalGames, index, windowSize);
    const expectedGoals = available(
      rollingGames,
      (row) => row.individualXGoals,
    );
    const gameScores = available(rollingGames, (row) => row.gameScore);
    const onIceShares = available(
      rollingGames,
      (row) => row.onIceXGoalsPercentage,
    );

    return {
      ...identity(game),
      sampleSize: rollingGames.length,
      goalsPerGame: average(rollingGames, (row) => row.goals),
      assistsPerGame: average(rollingGames, (row) => row.assists),
      pointsPerGame: average(rollingGames, (row) => row.points),
      shotsPerGame: average(rollingGames, (row) => row.shotsOnGoal),
      individualExpectedGoalsPerGame: nullableAverage(expectedGoals),
      gameScorePerGame: nullableAverage(gameScores),
      onIceExpectedGoalsPercentage:
        onIceShares.length === 0
          ? null
          : (sum(onIceShares, (value) => value) / onIceShares.length) * 100,
      advancedSampleSizes: {
        individualExpectedGoalsPerGame: expectedGoals.length,
        gameScorePerGame: gameScores.length,
        onIceExpectedGoalsPercentage: onIceShares.length,
      },
    };
  });
}

export function buildRollingGoaliePerformance(
  games: GoaliePerformanceGame[],
  windowSize: RollingWindow,
): RollingGoaliePerformancePoint[] {
  const chronologicalGames = chronological(games);

  return chronologicalGames.map((game, index) => {
    const rollingGames = window(chronologicalGames, index, windowSize);
    const expectedGoals = available(
      rollingGames,
      (row) => row.expectedGoalsAgainst,
    );
    const goalsSaved = available(
      rollingGames,
      (row) => row.goalsSavedAboveExpected,
    );
    const saves = sum(rollingGames, (row) => row.saves);
    const shotsAgainst = sum(
      rollingGames,
      (row) => row.shotsAgainst,
    );

    return {
      ...identity(game),
      sampleSize: rollingGames.length,
      savePercentage:
        shotsAgainst === 0 ? null : (saves / shotsAgainst) * 100,
      savesPerGame: saves / rollingGames.length,
      goalsAgainstPerGame:
        sum(rollingGames, (row) => row.goalsAgainst) /
        rollingGames.length,
      expectedGoalsAgainstPerGame: nullableAverage(expectedGoals),
      goalsSavedAboveExpectedPerGame: nullableAverage(goalsSaved),
      advancedSampleSizes: {
        expectedGoalsAgainstPerGame: expectedGoals.length,
        goalsSavedAboveExpectedPerGame: goalsSaved.length,
      },
    };
  });
}

function chronological<T extends PlayerGameIdentity>(games: T[]): T[] {
  return [...games].sort(
    (left, right) =>
      left.gameDate.localeCompare(right.gameDate) ||
      left.nhlGameId - right.nhlGameId,
  );
}

function window<T>(games: T[], index: number, size: RollingWindow): T[] {
  return games.slice(Math.max(0, index - size + 1), index + 1);
}

function identity(
  game: PlayerGameIdentity,
): Omit<RollingPlayerPerformancePointBase, "sampleSize"> {
  const scoreLabel =
    game.teamScore === null || game.opponentScore === null
      ? "Score unavailable"
      : `${game.teamScore}–${game.opponentScore}`;

  return {
    nhlGameId: game.nhlGameId,
    gameDate: game.gameDate,
    teamAbbreviation: game.team.abbreviation,
    opponentAbbreviation: game.opponent.abbreviation,
    opponentName: game.opponent.name,
    venueLabel: game.isHome ? "vs" : "at",
    scoreLabel,
  };
}

function available<T>(
  rows: T[],
  value: (row: T) => number | null,
): number[] {
  return rows.flatMap((row) => {
    const result = value(row);
    return result === null ? [] : [result];
  });
}

function average<T>(rows: T[], value: (row: T) => number): number {
  return sum(rows, value) / rows.length;
}

function nullableAverage(values: number[]): number | null {
  return values.length === 0
    ? null
    : sum(values, (value) => value) / values.length;
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}
