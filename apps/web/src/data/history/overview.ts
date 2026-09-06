import type {
  HistoricalGoalieCareer,
  HistoricalSkaterCareer,
  HistoricalTeamSeason,
  HistoryOverview
} from "@/contracts/history";
import "server-only";
import { getHistoricalLeaderboard, getHistoryRecordProgression } from './leaders';
import { DEFAULT_HISTORY_FILTERS, historyDefaultMinimumGames } from './rows';
import { getHistoryLeagueTrend } from './trends';
export async function getHistoryOverview(
  gameType: number,
): Promise<HistoryOverview> {
  const filters = { ...DEFAULT_HISTORY_FILTERS };
  const teamFilters = {
    ...filters,
    minimumGames: historyDefaultMinimumGames(
      "teams",
      "pointPercentage",
      "seasons",
      gameType,
    ),
  };
  const [points, goals, goalies, teams, recordProgression, leagueTrend] =
    await Promise.all([
      getHistoricalLeaderboard(
        "skaters",
        "career",
        "points",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "skaters",
        "career",
        "goals",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "goalies",
        "career",
        "wins",
        gameType,
        filters,
        1,
        3,
      ),
      getHistoricalLeaderboard(
        "teams",
        "seasons",
        "pointPercentage",
        gameType,
        teamFilters,
        1,
        3,
      ),
      getHistoryRecordProgression(gameType),
      getHistoryLeagueTrend(gameType),
    ]);

  return {
    careerPoints: points.view === "skaters"
      ? points.rows as HistoricalSkaterCareer[]
      : [],
    careerGoals: goals.view === "skaters"
      ? goals.rows as HistoricalSkaterCareer[]
      : [],
    goalieWins: goalies.view === "goalies"
      ? goalies.rows as HistoricalGoalieCareer[]
      : [],
    teamSeasons: teams.view === "teams"
      ? teams.rows as HistoricalTeamSeason[]
      : [],
    recordProgression,
    leagueTrend,
  };
}
