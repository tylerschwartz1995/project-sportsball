import { describe, expect, it } from "vitest";

import type { GameSummary, GameTeamSummary } from "@/contracts/game";
import type { StandingsEntry } from "@/contracts/standings";
import {
  buildActualBracket,
  buildProjectedBracket,
  parsePlayoffGameNumber,
} from "@/lib/playoff-bracket";

describe("parsePlayoffGameNumber", () => {
  it("extracts round, matchup, and game from an NHL playoff game id", () => {
    expect(parsePlayoffGameNumber(2025030416)).toEqual({
      round: 4,
      matchup: 1,
      gameNumber: 6,
    });
  });
});

describe("buildProjectedBracket", () => {
  it("keeps Eastern series first and Western series second for bracket placement", () => {
    const standings = [
      ...conferenceStandings("Western", "W", 100),
      ...conferenceStandings("Eastern", "E", 1),
    ];

    const firstRound = buildProjectedBracket(standings)[0].series;

    expect(
      firstRound
        .slice(0, 4)
        .flatMap(seriesAbbreviations)
        .every((team) => team.startsWith("E")),
    ).toBe(true);
    expect(
      firstRound
        .slice(4)
        .flatMap(seriesAbbreviations)
        .every((team) => team.startsWith("W")),
    ).toBe(true);
    expect(firstRound.every((series) => series.games.length === 0)).toBe(true);
  });
});

describe("buildActualBracket", () => {
  it("keeps each series' games in chronological order with its score", () => {
    const carolina = gameTeam(12, "CAR", "Carolina Hurricanes");
    const newJersey = gameTeam(1, "NJD", "New Jersey Devils");
    const games = [
      playoffGame(2024030112, "2025-04-22", carolina, 3, newJersey, 2),
      playoffGame(2024030111, "2025-04-20", newJersey, 1, carolina, 4),
    ];

    const series = buildActualBracket(games)[0].series[0];

    expect(series.teamOne?.abbreviation).toBe("CAR");
    expect(series.teamOneWins).toBe(2);
    expect(series.teamTwoWins).toBe(0);
    expect(series.games.map((game) => game.nhlGameId)).toEqual([
      2024030111,
      2024030112,
    ]);
  });
});

function conferenceStandings(
  conference: string,
  prefix: string,
  startingId: number,
): StandingsEntry[] {
  return [
    standingsEntry(startingId, prefix, conference, "One", 1, null, 110),
    standingsEntry(startingId + 1, prefix, conference, "One", 2, null, 100),
    standingsEntry(startingId + 2, prefix, conference, "One", 3, null, 95),
    standingsEntry(startingId + 3, prefix, conference, "One", 4, 1, 90),
    standingsEntry(startingId + 4, prefix, conference, "Two", 1, null, 108),
    standingsEntry(startingId + 5, prefix, conference, "Two", 2, null, 99),
    standingsEntry(startingId + 6, prefix, conference, "Two", 3, null, 94),
    standingsEntry(startingId + 7, prefix, conference, "Two", 4, 2, 89),
  ];
}

function standingsEntry(
  nhlTeamId: number,
  prefix: string,
  conferenceName: string,
  divisionName: string,
  divisionRank: number,
  wildcardRank: number | null,
  points: number,
): StandingsEntry {
  const teamAbbreviation = `${prefix}${nhlTeamId}`;
  return {
    snapshotDate: "2026-04-16",
    seasonId: 20252026,
    teamId: nhlTeamId,
    nhlTeamId,
    teamAbbreviation,
    teamName: `${conferenceName} ${nhlTeamId}`,
    conferenceName: `${conferenceName} Conference`,
    divisionName: `${divisionName} Division`,
    gamesPlayed: 82,
    wins: 40,
    losses: 30,
    overtimeLosses: 12,
    points,
    regulationWins: 35,
    regulationPlusOvertimeWins: 38,
    goalsFor: 250,
    goalsAgainst: 220,
    goalDifferential: 30,
    pointPercentage: points / 164,
    leagueRank: nhlTeamId,
    conferenceRank: divisionRank,
    divisionRank,
    wildcardRank,
    clinchIndicator: null,
  };
}

function seriesAbbreviations(
  series: ReturnType<typeof buildProjectedBracket>[number]["series"][number],
): string[] {
  return [series.teamOne?.abbreviation, series.teamTwo?.abbreviation].filter(
    (team): team is string => Boolean(team),
  );
}

function gameTeam(
  nhlTeamId: number,
  abbreviation: string,
  name: string,
): GameTeamSummary {
  return {
    id: nhlTeamId,
    nhlTeamId,
    abbreviation,
    name,
    record: { wins: 0, losses: 0, overtimeLosses: 0 },
    score: null,
    shotsOnGoal: null,
  };
}

function playoffGame(
  nhlGameId: number,
  gameDate: string,
  awayTeam: GameTeamSummary,
  awayScore: number,
  homeTeam: GameTeamSummary,
  homeScore: number,
): GameSummary {
  return {
    id: nhlGameId,
    nhlGameId,
    seasonId: 20242025,
    gameType: 3,
    gameDate,
    startTimeUtc: `${gameDate}T23:00:00Z`,
    state: "FINAL",
    lastPeriodType: "REG",
    awayTeam: { ...awayTeam, score: awayScore },
    homeTeam: { ...homeTeam, score: homeScore },
  };
}
