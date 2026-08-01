import { describe, expect, it } from "vitest";

import type { StandingsEntry } from "@/contracts/standings";
import {
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
