import { getHistoryRecordProgression } from "./history/leaders";
import "server-only";
import { getHistoryLeagueTrend, getHistoricalDecadeLeaders, getHistoricalGoalieDecadeLeaders } from "./history";
import { sharedRead } from "./shared-cache";

export const getHistorySupplement = sharedRead("history-supplement-v1", async (
  gameType: 2 | 3, view: "records" | "skaters" | "goalies",
) => {
  const minimumGames = gameType === 3 ? 25 : 200;
  const [progression, trend, skaters, goalies] = await Promise.all([
    view === "records" ? getHistoryRecordProgression(gameType) : Promise.resolve([]),
    view !== "records" ? getHistoryLeagueTrend(gameType) : Promise.resolve([]),
    view === "skaters" ? getHistoricalDecadeLeaders(gameType) : Promise.resolve([]),
    view === "goalies" ? getHistoricalGoalieDecadeLeaders(gameType, minimumGames) : Promise.resolve([]),
  ]);
  return { progression, trend, skaters, goalies, minimumGames };
}, 3600, ["history"]);
