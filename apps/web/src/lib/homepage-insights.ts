import type { GameSummary } from "@/contracts/game";
import type {
  StandingsEntry,
  StandingsPointsHistoryPoint,
} from "@/contracts/standings";

export type StandingsMovementEntry = {
  team: StandingsEntry;
  recentGamePoints: number[];
  recentPoints: number | null;
  previousPoints: number | null;
  pointsChange: number | null;
};

export type LeagueTrendMetric = {
  key: "scoring" | "home-wins" | "one-goal" | "extra-time";
  label: string;
  current: number | null;
  previous: number | null;
  change: number | null;
  format: "decimal" | "percentage";
};

export type LeagueTrendSummary = {
  currentSampleSize: number;
  previousSampleSize: number;
  currentStartDate: string | null;
  currentEndDate: string | null;
  metrics: LeagueTrendMetric[];
  highestScoringGame: GameSummary | null;
};

export function buildStandingsMovement(
  standings: StandingsEntry[],
  history: StandingsPointsHistoryPoint[],
  teamLimit = 6,
  windowGames = 10,
): StandingsMovementEntry[] {
  const historyByTeam = new Map<number, StandingsPointsHistoryPoint[]>();
  for (const point of history) {
    const points = historyByTeam.get(point.nhlTeamId) ?? [];
    points.push(point);
    historyByTeam.set(point.nhlTeamId, points);
  }

  return [...standings]
    .sort((left, right) => left.leagueRank - right.leagueRank)
    .slice(0, teamLimit)
    .map((team) => {
      const teamHistory = (historyByTeam.get(team.nhlTeamId) ?? []).sort(
        (left, right) => left.gamesPlayed - right.gamesPlayed,
      );
      const gamePoints = teamHistory.map((point, index) =>
        point.points - (teamHistory[index - 1]?.points ?? 0),
      );
      const recent = gamePoints.slice(-windowGames);
      const previous = gamePoints.slice(-windowGames * 2, -windowGames);
      const recentPoints =
        recent.length === windowGames ? sum(recent) : null;
      const previousPoints =
        previous.length === windowGames ? sum(previous) : null;
      return {
        team,
        recentGamePoints: recent,
        recentPoints,
        previousPoints,
        pointsChange:
          recentPoints === null || previousPoints === null
            ? null
            : recentPoints - previousPoints,
      };
    });
}

export function buildLeagueTrendSummary(
  recentGames: GameSummary[],
  sampleSize = 30,
): LeagueTrendSummary {
  const completed = recentGames
    .filter(
      (game) =>
        game.awayTeam.score !== null && game.homeTeam.score !== null,
    )
    .sort((left, right) =>
      right.startTimeUtc.localeCompare(left.startTimeUtc),
    );
  const current = completed.slice(0, sampleSize);
  const previous = completed.slice(sampleSize, sampleSize * 2);
  const currentRange = [...current].sort((left, right) =>
    left.gameDate.localeCompare(right.gameDate),
  );

  return {
    currentSampleSize: current.length,
    previousSampleSize: previous.length,
    currentStartDate: currentRange[0]?.gameDate ?? null,
    currentEndDate: currentRange.at(-1)?.gameDate ?? null,
    metrics: [
      metric("scoring", "Goals per game", current, previous, averageGoals, "decimal"),
      metric("home-wins", "Home win rate", current, previous, homeWinRate, "percentage"),
      metric("one-goal", "One-goal games", current, previous, oneGoalRate, "percentage"),
      metric("extra-time", "Extra-time games", current, previous, extraTimeRate, "percentage"),
    ],
    highestScoringGame:
      [...current].sort(
        (left, right) => totalGoals(right) - totalGoals(left),
      )[0] ?? null,
  };
}

function metric(
  key: LeagueTrendMetric["key"],
  label: string,
  currentGames: GameSummary[],
  previousGames: GameSummary[],
  calculate: (games: GameSummary[]) => number | null,
  format: LeagueTrendMetric["format"],
): LeagueTrendMetric {
  const current = calculate(currentGames);
  const previous = calculate(previousGames);
  return {
    key,
    label,
    current,
    previous,
    change:
      current === null || previous === null ? null : current - previous,
    format,
  };
}

function averageGoals(games: GameSummary[]): number | null {
  return games.length === 0
    ? null
    : games.reduce((total, game) => total + totalGoals(game), 0) /
        games.length;
}

function homeWinRate(games: GameSummary[]): number | null {
  return rate(games, (game) => game.homeTeam.score! > game.awayTeam.score!);
}

function oneGoalRate(games: GameSummary[]): number | null {
  return rate(
    games,
    (game) => Math.abs(game.homeTeam.score! - game.awayTeam.score!) === 1,
  );
}

function extraTimeRate(games: GameSummary[]): number | null {
  return rate(
    games,
    (game) => game.lastPeriodType === "OT" || game.lastPeriodType === "SO",
  );
}

function rate(
  games: GameSummary[],
  predicate: (game: GameSummary) => boolean,
): number | null {
  return games.length === 0
    ? null
    : games.filter(predicate).length / games.length;
}

function totalGoals(game: GameSummary): number {
  return (game.awayTeam.score ?? 0) + (game.homeTeam.score ?? 0);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
