import type { AdvancedGoalieLeaderboardRow, AdvancedSkaterLeaderboardRow, AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
type Row = AdvancedGoalieLeaderboardRow | AdvancedSkaterLeaderboardRow | AdvancedTeamLeaderboardRow;
const keys: Record<string, string> = {
  goalieXGoalsAgainstPer60: "expectedGoalsAgainstPer60",
  highDangerGoalsSaved: "highDangerGoalsSavedAboveExpected",
  mediumDangerGoalsSaved: "mediumDangerGoalsSavedAboveExpected",
  lowDangerGoalsSaved: "lowDangerGoalsSavedAboveExpected",
  reboundsPer60: "reboundsPer60",
  games: "gamesPlayed", iceTime: "iceTimeSeconds", gameScore: "gameScore",
  xgPercentage: "onIceExpectedGoalsPercentage", corsiPercentage: "onIceCorsiPercentage",
  pointsPer60: "pointsPer60", individualXGoalsPer60: "individualExpectedGoalsPer60",
  onIceXGoalsForPer60: "onIceExpectedGoalsForPer60", onIceXGoalsAgainstPer60: "onIceExpectedGoalsAgainstPer60",
  hdXgPercentage: "onIceHighDangerExpectedGoalsPercentage",
  fenwickPercentage: "onIceFenwickPercentage",
  individualXGoals: "individualExpectedGoals", goals: "individualGoals", points: "individualPoints",
  goalsSaved: "goalsSavedAboveExpected", xGoalsAgainst: "expectedGoalsAgainst", goalsAgainst: "goalsAgainst",
  expectedShots: "expectedShotsOnGoalAgainst", shots: "shotsOnGoalAgainst",
};
export function goalieGoalsSavedPer60(row: AdvancedGoalieLeaderboardRow): number | null {
  return row.goalsSavedAboveExpected === null || row.iceTimeSeconds <= 0
    ? null
    : row.goalsSavedAboveExpected * 3600 / row.iceTimeSeconds;
}

export function sortAdvancedRows<T extends Row>(rows: T[], key: string, direction: "asc" | "desc"): T[] {
  const value = (row: T): string | number | null => {
    if (key === "player" || key === "goalie") return "player" in row ? row.player.name : row.team.name;
    if (key === "goalsSavedPer60" && "goalsSavedAboveExpected" in row) return goalieGoalsSavedPer60(row);
    const result = (row as unknown as Record<string, unknown>)[keys[key]];
    return typeof result === "number" ? result : null;
  };
  return [...rows].sort((a, b) => {
    const left = value(a), right = value(b);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return direction === "asc" ? order : -order;
  });
}
