import { afterAll, describe, expect, it } from "vitest";
import { closeDatabasePool } from "@/data/database";
import { listSeasons, listScheduleSeasons } from "@/data/seasons";
import { getGameBoxScore, getGamesByDate, getGamesForSeasonByType } from "@/data/games";
import { getTeamIdentityForSeason } from "@/data/teams";
import { getMoneyPuckGameAnalytics } from "@/data/advanced-game";
import { getHistoricalPlayerSeasons } from "@/data/history";
import { getPlayerCareer } from "@/data/player-career";
import { findPlayers } from "@/data/player-search";
import { getDraftAnalytics } from "@/data/drafts";

// A reproducible schema contract suite, independent of the full archive audit.
describe.skipIf(process.env.SPORTSBALL_RUN_WEB_FIXTURE_TESTS !== "1")("migrated web fixtures", () => {
  afterAll(closeDatabasePool);

  it("distinguishes statistical seasons from future schedule-only seasons", async () => {
    expect((await listSeasons()).map(row => row.id)).toEqual([20252026, 20242025]);
    expect((await listScheduleSeasons()).map(row => row.id)).toEqual([20262027, 20252026, 20242025]);
    const future = await getGamesByDate(20262027, "2026-10-10");
    expect(future[0].awayTeam.score).toBeNull();
    expect(future[0].homeTeam.score).toBeNull();
  });

  it("preserves historical team names and keeps phases separate", async () => {
    expect(await getTeamIdentityForSeason(59, 20242025)).toMatchObject({ name: "Utah Hockey Club" });
    expect(await getTeamIdentityForSeason(59, 20252026)).toMatchObject({ name: "Utah Mammoth" });
    expect((await getGamesForSeasonByType(20252026, 2)).map(row => row.nhlGameId)).toEqual([2025020001]);
    expect((await getGamesForSeasonByType(20252026, 3)).map(row => row.nhlGameId)).toEqual([2025030111]);
  });

  it("maps box scores while keeping missing advanced observations unavailable", async () => {
    const game = await getGameBoxScore(2025020001);
    expect(game?.awayTeam.skaters[0]).toMatchObject({ name: "Fixture Skater", points: 3 });
    expect(game?.homeTeam.score).toBe(0);
    const advanced = await getMoneyPuckGameAnalytics(2025020001);
    expect(advanced?.teamSituations).toEqual([]);
    const covered = await getMoneyPuckGameAnalytics(2024020001);
    expect(covered?.teamSituations[0]).toMatchObject({
      team: { name: "Utah Hockey Club" }, expectedGoalsFor: 0, expectedGoalsAgainst: null,
    });
  });

  it("retrieves all-time careers and retains unavailable historical fields", async () => {
    expect(await findPlayers("historical skater")).toContainEqual({ id: 8470002, name: "Historical Skater", position: "L" });
    const history = await getHistoricalPlayerSeasons(8470002);
    expect(history.skaters[0]).toMatchObject({ seasonId: 19171918, points: 7 });
    const career = await getPlayerCareer(8470001);
    expect(career.map(row => [row.gameType, row.points]).sort()).toEqual([[2, 3], [3, 1]]);
  });

  it("includes draft picks without NHL identities in team denominators", async () => {
    const draft = await getDraftAnalytics({ draftYear: 2020 });
    expect(draft.outcomes).toHaveLength(2);
    expect(draft.teamPerformance[0]).toMatchObject({ selections: 2, playersWithNhlGames: 1 });
  });
});
