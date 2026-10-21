import { afterAll, describe, expect, it } from "vitest";
import { closeDatabasePool } from "./database";
import { getGameSummary, getTeamSchedule } from "./games";
import { getMoneyPuckGameAnalytics } from "./advanced-game";

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

  it("loads only the selected game analytics while retaining tab availability", async () => {
    const all = await getMoneyPuckGameAnalytics(2025020003);
    const shots = await getMoneyPuckGameAnalytics(2025020003, "shots");
    expect(shots?.shots).toEqual(all?.shots);
    expect(shots?.teamSituations).toEqual([]);
    expect(shots?.skaterSituations).toEqual([]);
    expect(shots?.availableViews?.teams).toBe(Boolean(all?.teamSituations.length));
  });
});
