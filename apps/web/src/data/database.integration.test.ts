import { afterAll, describe, expect, it } from "vitest";

import { getMoneyPuckGameAnalytics } from "@/data/advanced-game";
import { closeDatabasePool } from "@/data/database";
import { getPlayerGameLog, getTeamGameLog } from "@/data/game-logs";
import {
  getGameBoxScore,
  getGamesByDate,
  listGameDates,
} from "@/data/games";
import { getPlayerDetail, listPlayersBySeason } from "@/data/players";
import {
  getHistoricalEraScores,
  getHistoricalLeaderboard,
  getHistoricalLeaders,
  getHistoricalPeaks,
  getHistoricalPlayerSeasons,
} from "@/data/history";
import { getGamePlayByPlay } from "@/data/play-by-play";
import { getTeamScheduleStrength } from "@/data/schedule-strength";
import { listSeasons } from "@/data/seasons";
import { getMoneyPuckSeasonUnitLeaders } from "@/data/season-units";
import { getStandings } from "@/data/standings";
import { getTeamSeasonDetail, listTeamsBySeason } from "@/data/teams";

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
        record: expect.objectContaining({ wins: expect.any(Number) }),
        score: 3,
      },
      homeTeam: {
        abbreviation: "VGK",
        record: expect.objectContaining({ losses: expect.any(Number) }),
        score: 0,
      },
    });

    const boxScore = await getGameBoxScore(games[0].nhlGameId);
    expect(boxScore).toMatchObject({
      nhlGameId: 2025030416,
      awayTeam: {
        abbreviation: "CAR",
        score: 3,
      },
      homeTeam: {
        abbreviation: "VGK",
        score: 0,
      },
    });
    expect(boxScore?.awayTeam.skaters).toHaveLength(18);
    expect(boxScore?.homeTeam.skaters).toHaveLength(18);
    expect(boxScore?.awayTeam.goalies).toHaveLength(2);
    expect(boxScore?.homeTeam.goalies).toHaveLength(2);
    expect(boxScore?.awayTeam.record).toEqual(games[0].awayTeam.record);
    expect(boxScore?.homeTeam.record).toEqual(games[0].homeTeam.record);

    const playByPlay = await getGamePlayByPlay(games[0].nhlGameId);
    expect(playByPlay.events.length).toBeGreaterThan(300);
    expect(
      playByPlay.events.filter((event) => event.typeDescription === "goal"),
    ).toHaveLength(3);
    expect(
      playByPlay.events.find((event) => event.typeDescription === "goal")
        ?.players,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "scorer" }),
      ]),
    );

    const teams = await listTeamsBySeason(seasons[0].id);
    expect(teams).toHaveLength(32);
    expect(teams[0].team.name).toBe("Colorado Avalanche");

    const team = await getTeamSeasonDetail(12, seasons[0].id);
    expect(team).toMatchObject({
      team: {
        abbreviation: "CAR",
        name: "Carolina Hurricanes",
      },
      regularSeason: {
        gamesPlayed: 82,
        standingsPoints: 113,
      },
    });
    expect(team?.skaters.length).toBeGreaterThan(20);
    expect(team?.goalies.length).toBeGreaterThan(1);

    const scheduleStrength = await getTeamScheduleStrength(12, seasons[0].id);
    expect(scheduleStrength.games).toHaveLength(82);
    expect(scheduleStrength.games.every((game) => game.completed)).toBe(true);
    expect(
      scheduleStrength.games.some(
        (game) => game.opponentPointsPercentage !== null,
      ),
    ).toBe(true);
    expect(
      scheduleStrength.games.some(
        (game) => game.opponentExpectedGoalsPercentage !== null,
      ),
    ).toBe(true);

    const players = await listPlayersBySeason(seasons[0].id);
    expect(players.skaters).toHaveLength(940);
    expect(players.goalies).toHaveLength(98);
    expect(players.skaters[0]).toMatchObject({
      nhlPlayerId: 8478402,
      name: "Connor McDavid",
      points: 138,
      teams: [
        {
          nhlTeamId: 22,
          abbreviation: "EDM",
          name: "Edmonton Oilers",
        },
      ],
    });

    const player = await getPlayerDetail(8478402);
    expect(player?.profile.name).toBe("Connor McDavid");
    expect(player?.skaterSeasons.length).toBeGreaterThan(10);

    const gretzkyHistory = await getHistoricalPlayerSeasons(8447400);
    expect(gretzkyHistory.skaters.find((row) => row.seasonId === 19851986)).toMatchObject({
      points: 215,
      gameType: 2,
    });
    const rateLeaders = await getHistoricalLeaders(
      "skaters",
      "pointsPerGame",
      2,
      {
        startYear: 1980,
        endYear: 2025,
        minimumGames: 500,
        position: "C",
        team: null,
        country: null,
      },
      10,
    );
    expect(rateLeaders.view).toBe("skaters");
    if (rateLeaders.view !== "skaters") {
      throw new Error("expected skater rate leaders");
    }
    expect(rateLeaders.careers[0]?.pointsPerGame).toBeGreaterThan(1);

    const qualifiedSeasons = await getHistoricalLeaderboard(
      "skaters",
      "seasons",
      "pointsPerGame",
      2,
      {
        startYear: 1917,
        endYear: 2025,
        minimumGames: 40,
        position: null,
        team: null,
        country: null,
      },
      1,
      25,
    );
    expect(qualifiedSeasons.view).toBe("skaters");
    expect(qualifiedSeasons.rows[0]).toMatchObject({
      name: "Wayne Gretzky",
      rank: 1,
    });
    expect(qualifiedSeasons.totalRows).toBeGreaterThan(1_000);

    const peaks = await getHistoricalPeaks(
      "skaters",
      "points",
      3,
      2,
      {
        startYear: 1917,
        endYear: 2025,
        minimumGames: 120,
        position: null,
        team: null,
        country: null,
      },
      1,
      10,
    );
    expect(peaks[0]).toMatchObject({ name: "Wayne Gretzky", rank: 1 });
    expect(peaks[0]?.value).toBeGreaterThan(600);

    const eraScores = await getHistoricalEraScores(
      2,
      {
        startYear: 1917,
        endYear: 2025,
        minimumGames: 500,
        position: null,
        team: null,
        country: null,
      },
      1,
      10,
    );
    expect(eraScores).toHaveLength(10);
    expect(eraScores[0]?.eraScore).toBeGreaterThan(200);

    const teamGameLog = await getTeamGameLog(12, seasons[0].id);
    expect(teamGameLog?.games.length).toBeGreaterThan(82);
    expect(teamGameLog?.games[0]?.opponent.name).toBeTruthy();
    expect(
      teamGameLog?.games.some(
        (game) => game.fiveOnFiveXGoalsPercentage !== null,
      ),
    ).toBe(true);

    const playerGameLog = await getPlayerGameLog(8478402, seasons[0].id);
    expect(playerGameLog?.profile.name).toBe("Connor McDavid");
    expect(playerGameLog?.skaterGames.length).toBeGreaterThan(70);
    expect(
      playerGameLog?.skaterGames.some((game) => game.gameScore !== null),
    ).toBe(true);

    const units = await getMoneyPuckSeasonUnitLeaders(20252026, {
      minimumIceTimeSeconds: 6_000,
      limit: 100,
    });
    expect(units.forwardLines).toHaveLength(100);
    expect(units.defensivePairings).toHaveLength(100);
    expect(units.forwardLines[0]).toMatchObject({
      unitType: "line",
      team: { abbreviation: "COL" },
      players: [
        { name: "Brock Nelson" },
        { name: "Valeri Nichushkin" },
        { name: "Artturi Lehkonen" },
      ],
    });
    expect(() => JSON.stringify(units)).not.toThrow();
  });

  it("loads a complete regular-season MoneyPuck game package", async () => {
    const advanced = await getMoneyPuckGameAnalytics(2025021312);

    expect(advanced).toMatchObject({
      game: {
        nhlGameId: 2025021312,
        seasonId: 20252026,
      },
    });
    expect(advanced?.teamSituations).toHaveLength(10);
    expect(advanced?.skaterSituations).toHaveLength(180);
    expect(advanced?.goalieSituations).toHaveLength(10);
    expect(advanced?.shots).toHaveLength(86);
    expect(advanced?.forwardLines).toHaveLength(34);
    expect(advanced?.defensivePairings).toHaveLength(21);
    expect(typeof advanced?.shots[0]?.sourceShotId).toBe("string");
    expect(() => JSON.stringify(advanced)).not.toThrow();
  });

  it("keeps playoff coverage boundaries explicit", async () => {
    const advanced = await getMoneyPuckGameAnalytics(2025030416);

    expect(advanced?.game.gameType).toBe(3);
    expect(advanced?.teamSituations).toHaveLength(10);
    expect(advanced?.shots).toHaveLength(73);
    expect(advanced?.skaterSituations).toHaveLength(0);
    expect(advanced?.goalieSituations).toHaveLength(0);
    expect(advanced?.forwardLines).toHaveLength(0);
    expect(advanced?.defensivePairings).toHaveLength(0);
  });
});
