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
  Pick<SkaterGameLogEntry, "points" | "individualXGoals">;

export type GoaliePerformanceGame = PlayerGameIdentity &
  Pick<
    GoalieGameLogEntry,
    "saves" | "shotsAgainst" | "goalsSavedAboveExpected"
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
  advancedSampleSize: number;
};

export type RollingSkaterPerformancePoint =
  RollingPlayerPerformancePointBase & {
    pointsPerGame: number;
    individualExpectedGoalsPerGame: number | null;
  };

export type RollingGoaliePerformancePoint =
  RollingPlayerPerformancePointBase & {
    savePercentage: number | null;
    goalsSavedAboveExpectedPerGame: number | null;
  };

export function buildRollingSkaterPerformance(
  games: SkaterPerformanceGame[],
  windowSize: RollingWindow,
): RollingSkaterPerformancePoint[] {
  const chronologicalGames = chronological(games);

  return chronologicalGames.map((game, index) => {
    const rollingGames = window(chronologicalGames, index, windowSize);
    const advancedGames = rollingGames.filter(
      (rollingGame) => rollingGame.individualXGoals !== null,
    );

    return {
      ...identity(game),
      sampleSize: rollingGames.length,
      advancedSampleSize: advancedGames.length,
      pointsPerGame:
        sum(rollingGames, (rollingGame) => rollingGame.points) /
        rollingGames.length,
      individualExpectedGoalsPerGame:
        advancedGames.length === 0
          ? null
          : sum(
              advancedGames,
              (rollingGame) => rollingGame.individualXGoals ?? 0,
            ) / advancedGames.length,
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
    const advancedGames = rollingGames.filter(
      (rollingGame) => rollingGame.goalsSavedAboveExpected !== null,
    );
    const saves = sum(rollingGames, (rollingGame) => rollingGame.saves);
    const shotsAgainst = sum(
      rollingGames,
      (rollingGame) => rollingGame.shotsAgainst,
    );

    return {
      ...identity(game),
      sampleSize: rollingGames.length,
      advancedSampleSize: advancedGames.length,
      savePercentage:
        shotsAgainst === 0 ? null : (saves / shotsAgainst) * 100,
      goalsSavedAboveExpectedPerGame:
        advancedGames.length === 0
          ? null
          : sum(
              advancedGames,
              (rollingGame) =>
                rollingGame.goalsSavedAboveExpected ?? 0,
            ) / advancedGames.length,
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
): Omit<
  RollingPlayerPerformancePointBase,
  "sampleSize" | "advancedSampleSize"
> {
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

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}
