import {
  getHistoricalDecadeLeaders,
  getHistoricalGoalieDecadeLeaders,
  getHistoryFilterOptions,
  getHistoryLeagueTrend,
  getHistoryOverview
} from "@/data/history";
import { unstable_cache } from "next/cache";
import "server-only";
export const loadHistoryOverview = unstable_cache(
  getHistoryOverview,
  ["history-record-book-overview-v2"],
  { revalidate: 3_600 },
);

export const loadHistoryFilterOptions = unstable_cache(
  getHistoryFilterOptions,
  ["history-filter-options-v3"],
  { revalidate: 3_600 },
);

export const loadHistoryLeagueTrend = unstable_cache(
  getHistoryLeagueTrend,
  ["history-league-trend-v3"],
  { revalidate: 3_600 },
);

export const loadHistoricalDecadeLeaders = unstable_cache(
  getHistoricalDecadeLeaders,
  ["history-decade-leaders-v2"],
  { revalidate: 3_600 },
);

export const loadHistoricalGoalieDecadeLeaders = unstable_cache(
  getHistoricalGoalieDecadeLeaders,
  ["history-goalie-decade-leaders-v2"],
  { revalidate: 3_600 },
);
