import { afterAll, describe, expect, it } from "vitest";

import { closeDatabasePool } from "@/data/database";
import { getGamesByDate, listGameDates } from "@/data/games";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";

const databaseTestsEnabled =
  process.env.SPORTSBALL_RUN_WEB_DATABASE_TESTS === "1";

describe.skipIf(!databaseTestsEnabled)("web database queries", () => {
  afterAll(async () => {
    await closeDatabasePool();
  });

  it("loads the complete season index, standings, and latest results", async () => {
    const seasons = await listSeasons();

    expect(seasons).toHaveLength(21);
    expect(seasons[0]).toEqual({
      id: 20252026,
      startYear: 2025,
      endYear: 2026,
      label: "2025–26",
    });

    const standings = await getStandings(seasons[0].id);
    expect(standings).toHaveLength(32);
    expect(standings[0].leagueRank).toBe(1);
    expect(standings.every((team) => team.seasonId === seasons[0].id)).toBe(
      true,
    );

    const gameDates = await listGameDates(seasons[0].id);
    expect(gameDates[0]).toEqual({
      date: "2026-06-14",
      gameCount: 1,
    });

    const games = await getGamesByDate(seasons[0].id, gameDates[0].date);
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      nhlGameId: 2025030416,
      gameType: 3,
      gameDate: "2026-06-14",
      awayTeam: {
        abbreviation: "CAR",
        score: 3,
      },
      homeTeam: {
        abbreviation: "VGK",
        score: 0,
      },
    });
  });
});
