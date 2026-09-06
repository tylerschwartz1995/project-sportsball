import {
  getHistoricalDecadeLeaders,
  getHistoricalGoalieDecadeLeaders,
  getHistoryFilterOptions,
  getHistoryLeagueTrend,
  getHistoryOverview
} from "@/data/history";
import { trackedCache } from "@/data/shared-cache";
import "server-only";
export const loadHistoryOverview = trackedCache(
  (gameType: number) => getHistoryOverview(gameType, false),
  ["history-record-book-overview-v3"],
  { revalidate: 3_600 },
);

export const loadHistoryFilterOptions = trackedCache(
  getHistoryFilterOptions,
  ["history-filter-options-v3"],
  { revalidate: 3_600 },
);

export const loadHistoryLeagueTrend = trackedCache(
  getHistoryLeagueTrend,
  ["history-league-trend-v3"],
  { revalidate: 3_600 },
);

export const loadHistoricalDecadeLeaders = trackedCache(
  getHistoricalDecadeLeaders,
  ["history-decade-leaders-v2"],
  { revalidate: 3_600 },
);

export const loadHistoricalGoalieDecadeLeaders = trackedCache(
  getHistoricalGoalieDecadeLeaders,
  ["history-goalie-decade-leaders-v2"],
  { revalidate: 3_600 },
);
