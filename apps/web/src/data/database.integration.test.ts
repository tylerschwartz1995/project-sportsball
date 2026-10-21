import { findPlayers } from "@/data/player-search";
import { getPlayerCareer } from "@/data/player-career";
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
import { getGamePlayByPlay } from "@/data/play-by-play";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { getTeamSeasonDetail, listTeamsBySeason } from "@/data/teams";

const databaseTestsEnabled =
  process.env.SPORTSBALL_RUN_WEB_DATABASE_TESTS === "1";

describe.skipIf(!databaseTestsEnabled)("web database queries", () => {
  it("finds historical players independently of season and treats wildcard input literally", async () => {
    expect(await findPlayers("wayne gretzky")).toContainEqual({
      id: 8447400,
      name: "Wayne Gretzky",
      position: "C",
    });
    expect(await findPlayers("%_")).toEqual([]);
    expect(await findPlayers("w")).toEqual([]);
  });
  afterAll(async () => {
    await closeDatabasePool();
  });

  it("preserves full historical careers and excludes goalie non-appearances", async () => {
    const career = await getPlayerCareer(8447400);
    const regular = career.filter((row) => row.gameType === 2);
    expect(regular).toHaveLength(20);
    expect(regular.reduce((sum, row) => sum + (row.points ?? 0), 0)).toBe(2857);
    expect(
      career
        .filter((row) => row.gameType === 3)
        .reduce((sum, row) => sum + (row.points ?? 0), 0),
    ).toBe(382);
    expect(
      new Set(
        career.map((row) => `${row.kind}-${row.seasonId}-${row.gameType}`),
      ).size,
    ).toBe(career.length);
    const log = await getPlayerGameLog(8475883, 20252026);
    expect(log?.goalieGames.length).toBeGreaterThan(0);
    expect(
      log?.goalieGames.every(
        (game) =>
          (game.timeOnIceSeconds ?? 0) > 0 ||
          (game.shotsAgainst ?? 0) > 0 ||
          Boolean(game.decision),
      ),
    ).toBe(true);
    expect(
      log?.goalieGames.some((game) => game.gameDate === "2026-04-13"),
    ).toBe(false);
  });

  it("loads the historical season index, standings, and stored results as new seasons arrive", async () => {
    const seasons = await listSeasons();

    const historicalSeasons = seasons.filter((season) => season.id <= 20252026);
    expect(historicalSeasons).toHaveLength(21);
    expect(seasons.map((season) => season.id)).toEqual(
      seasons.map((season) => season.id).sort((a, b) => b - a),
    );
    expect(historicalSeasons[0]).toEqual({
      id: 20252026,
      startYear: 2025,
      endYear: 2026,
      label: "2025–26",
    });

    const standings = await getStandings(historicalSeasons[0].id);
    expect(standings).toHaveLength(32);
    expect(standings[0].leagueRank).toBe(1);
    expect(standings.every((team) => team.seasonId === historicalSeasons[0].id)).toBe(
      true,
    );

    const gameDates = await listGameDates(historicalSeasons[0].id);
    expect(gameDates[0]).toEqual({
      date: "2026-06-14",
      gameCount: 1,
    });

    const games = await getGamesByDate(historicalSeasons[0].id, gameDates[0].date);
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
      expect.arrayContaining([expect.objectContaining({ role: "scorer" })]),
    );

    const teams = await listTeamsBySeason(historicalSeasons[0].id);
    expect(teams).toHaveLength(32);
    expect(teams[0].team.name).toBe("Colorado Avalanche");

    const team = await getTeamSeasonDetail(12, historicalSeasons[0].id);
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

    const players = await listPlayersBySeason(historicalSeasons[0].id);
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

    const teamGameLog = await getTeamGameLog(12, historicalSeasons[0].id);
    expect(teamGameLog?.games.length).toBeGreaterThan(82);
    expect(teamGameLog?.games[0]?.opponent.name).toBeTruthy();
    expect(
      teamGameLog?.games.some(
        (game) => game.fiveOnFiveXGoalsPercentage !== null,
      ),
    ).toBe(true);

    const playerGameLog = await getPlayerGameLog(8478402, historicalSeasons[0].id);
    expect(playerGameLog?.profile.name).toBe("Connor McDavid");
    expect(playerGameLog?.skaterGames.length).toBeGreaterThan(70);
    expect(
      playerGameLog?.skaterGames.some((game) => game.gameScore !== null),
    ).toBe(true);

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
