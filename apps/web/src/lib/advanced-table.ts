import type { AdvancedGoalieLeaderboardRow, AdvancedSkaterLeaderboardRow, AdvancedTeamLeaderboardRow } from "@/contracts/advanced-leaderboard";
type Row = AdvancedGoalieLeaderboardRow | AdvancedSkaterLeaderboardRow | AdvancedTeamLeaderboardRow;
const keys: Record<string, string> = {
  games: "gamesPlayed", iceTime: "iceTimeSeconds", gameScore: "gameScore",
  xgPercentage: "onIceExpectedGoalsPercentage", corsiPercentage: "onIceCorsiPercentage",
  individualXGoals: "individualExpectedGoals", goals: "individualGoals", points: "individualPoints",
  goalsSaved: "goalsSavedAboveExpected", xGoalsAgainst: "expectedGoalsAgainst", goalsAgainst: "goalsAgainst",
  expectedShots: "expectedShotsOnGoalAgainst", shots: "shotsOnGoalAgainst",
};
export function sortAdvancedRows<T extends Row>(rows: T[], key: string, direction: "asc" | "desc"): T[] {
  const value = (row: T): string | number | null => {
    if (key === "player" || key === "goalie") return "player" in row ? row.player.name : row.team.name;
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
