import { afterAll, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./database";
import { getGameSummary, getTeamSchedule } from "./games";
import { getMoneyPuckGameAnalytics } from "./advanced-game";
import { getMoneyPuckPlayerSeason, getMoneyPuckPlayerSeasons } from "./advanced";
import { getPlayerComparisonRows, listPlayerComparisonOptions, listPlayersBySeason } from "./players";
import { getDraftAnalytics } from "./drafts";

describe.skipIf(process.env.SPORTSBALL_RUN_WEB_DATABASE_TESTS !== "1")("performance query semantics", () => {
  afterAll(closeDatabasePool);

  it("keeps cumulative schedule records identical to individual game reads", async () => {
    for (const phase of [2, 3]) {
      const schedule = await getTeamSchedule(26, 20252026, phase);
      for (const game of [schedule[0], schedule[Math.floor(schedule.length / 2)], schedule.at(-1)].filter(Boolean)) {
        expect(await getGameSummary(game!.nhlGameId)).toEqual(game);
      }
    }
  });

  it("preserves every selected player's totals and advanced situations in batch reads", async () => {
    for (const category of ["skaters", "goalies"] as const) {
      const all = await listPlayersBySeason(20252026, 2);
      const source = category === "skaters" ? all.skaters : all.goalies;
      const ids = source.slice(0, 4).map(row => row.nhlPlayerId);
      const options = await listPlayerComparisonOptions(20252026, 2, category);
      expect(options.slice(0, 8).map(row => row.nhlPlayerId)).toEqual(source.slice(0, 8).map(row => row.nhlPlayerId));
      expect(new Set(options.map(row => row.nhlPlayerId))).toEqual(new Set(source.map(row => row.nhlPlayerId)));
      const selected = await getPlayerComparisonRows(20252026, 2, category, ids);
      expect(selected).toHaveLength(ids.length);
      for (const row of selected) expect(row).toEqual(source.find(player => player.nhlPlayerId === row.nhlPlayerId));
      expect(await getMoneyPuckPlayerSeasons(ids, 20252026)).toEqual(await Promise.all(ids.map(id => getMoneyPuckPlayerSeason(id, 20252026))));
    }
  });

  it("loads only the selected game analytics while retaining tab availability", async () => {
    const all = await getMoneyPuckGameAnalytics(2025020003);
    const shots = await getMoneyPuckGameAnalytics(2025020003, "shots");
    expect(shots?.shots).toEqual(all?.shots);
    expect(shots?.teamSituations).toEqual([]);
    expect(shots?.skaterSituations).toEqual([]);
    expect(shots?.availableViews?.teams).toBe(Boolean(all?.teamSituations.length));
  });

  it("keeps draft ranking definitions when omitting unused outcomes and team summaries", async () => {
    const options = { draftYear: 2015, includeAdvanced: true };
    const full = await getDraftAnalytics(options);
    const classes = await getDraftAnalytics(options, "classes");
    expect(classes.classPerformance).toEqual(full.classPerformance);
    expect(classes.outcomes).toEqual([]);
    expect(classes.teamPerformance).toEqual([]);
  });
});
