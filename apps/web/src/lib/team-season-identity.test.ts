import { describe, expect, it } from "vitest";

import type { TeamGameLogEntry } from "@/contracts/game-log";
import type {
  TeamIdentity,
  TeamSeasonStats,
  TeamSeasonSummary,
} from "@/contracts/team";
import { buildTeamSeasonIdentity } from "@/lib/team-season-identity";

describe("team season identity", () => {
  it("builds an evidence-backed league comparison", () => {
    const result = buildTeamSeasonIdentity({
      stats: avalancheStats,
      peers: [
        summary(avalanche, avalancheStats),
        summary(team(25, "DAL", "Dallas Stars"),
          stats({
            standingsPoints: 112,
            goalsFor: 270,
            goalsAgainst: 225,
            shotsFor: 2500,
            shotsAgainst: 2300,
          }),
        ),
        summary(team(23, "VAN", "Vancouver Canucks"),
          stats({
            standingsPoints: 96,
            goalsFor: 240,
            goalsAgainst: 250,
            shotsFor: 2350,
            shotsAgainst: 2400,
          }),
        ),
      ],
      games: [],
    });

    expect(result.fingerprint).toEqual([
      expect.objectContaining({
        key: "results",
        label: "Standings points earned",
        rank: 1,
        teamCount: 3,
      }),
      expect.objectContaining({ key: "scoring", rank: 1 }),
      expect.objectContaining({
        key: "goals-allowed",
        rank: 1,
      }),
      expect.objectContaining({
        key: "shot-differential",
        rank: 1,
      }),
    ]);
  });

  it("derives situational records, opponent series, and distinct moments", () => {
    const games = [
      game({
        nhlGameId: 1,
        gameDate: "2026-01-01",
        isHome: true,
        opponent: opponent(1, "NJD", "New Jersey Devils"),
        score: 6,
        opponentScore: 1,
        result: "W",
        shotsOnGoal: 35,
        opponentShotsOnGoal: 20,
      }),
      game({
        nhlGameId: 2,
        gameDate: "2026-01-02",
        isHome: false,
        opponent: opponent(5, "PIT", "Pittsburgh Penguins"),
        score: 4,
        opponentScore: 3,
        result: "W",
        lastPeriodType: "OT",
        shotsOnGoal: 50,
        opponentShotsOnGoal: 20,
      }),
      game({
        nhlGameId: 3,
        gameDate: "2026-01-03",
        isHome: true,
        opponent: opponent(1, "NJD", "New Jersey Devils"),
        score: 5,
        opponentScore: 6,
        result: "OTL",
        lastPeriodType: "OT",
        shotsOnGoal: 40,
        opponentShotsOnGoal: 39,
      }),
      game({
        nhlGameId: 4,
        gameDate: "2026-01-04",
        isHome: false,
        opponent: opponent(5, "PIT", "Pittsburgh Penguins"),
        score: 2,
        opponentScore: 5,
        result: "L",
        shotsOnGoal: 28,
        opponentShotsOnGoal: 31,
      }),
      game({
        nhlGameId: 5,
        gameDate: "2026-01-05",
        isHome: true,
        opponent: opponent(6, "BOS", "Boston Bruins"),
        score: 5,
        opponentScore: 6,
        result: "L",
        shotsOnGoal: 38,
        opponentShotsOnGoal: 37,
      }),
    ];

    const result = buildTeamSeasonIdentity({
      stats: avalancheStats,
      peers: [summary(avalanche, avalancheStats)],
      games,
    });

    expect(result.gamesAnalyzed).toBe(5);
    expect(result.records).toEqual([
      expect.objectContaining({
        key: "home",
        gamesPlayed: 3,
        wins: 1,
        regulationLosses: 1,
        overtimeLosses: 1,
      }),
      expect.objectContaining({
        key: "road",
        gamesPlayed: 2,
        wins: 1,
        regulationLosses: 1,
      }),
      expect.objectContaining({
        key: "one-goal",
        gamesPlayed: 3,
        wins: 1,
        regulationLosses: 1,
        overtimeLosses: 1,
      }),
      expect.objectContaining({
        key: "extra-time",
        gamesPlayed: 2,
        wins: 1,
        overtimeLosses: 1,
      }),
    ]);
    expect(result.opponents).toEqual([
      expect.objectContaining({
        opponent: expect.objectContaining({ abbreviation: "BOS" }),
        outcome: "lost",
      }),
      expect.objectContaining({
        opponent: expect.objectContaining({ abbreviation: "NJD" }),
        gamesPlayed: 2,
        outcome: "won",
        games: [
          expect.objectContaining({ nhlGameId: 1 }),
          expect.objectContaining({ nhlGameId: 3 }),
        ],
      }),
      expect.objectContaining({
        opponent: expect.objectContaining({ abbreviation: "PIT" }),
        outcome: "lost",
      }),
    ]);
    expect(result.moments).toEqual([
      expect.objectContaining({ key: "biggest-win", nhlGameId: 1 }),
      expect.objectContaining({ key: "shot-edge", nhlGameId: 2 }),
      expect.objectContaining({ key: "highest-scoring", nhlGameId: 5 }),
    ]);
  });

  it("keeps missing game-level coverage distinct from zero performance", () => {
    const result = buildTeamSeasonIdentity({
      stats: avalancheStats,
      peers: [summary(avalanche, avalancheStats)],
      games: [],
    });

    expect(result.gamesAnalyzed).toBe(0);
    expect(result.opponents).toEqual([]);
    expect(result.moments).toEqual([]);
    expect(result.records.every((record) => record.gamesPlayed === 0)).toBe(
      true,
    );
  });

  it("counts playoff overtime defeats as losses rather than OTLs", () => {
    const playoffStats = stats({
      gameType: 3,
      gamesPlayed: 1,
      wins: 0,
      losses: 1,
      regulationLosses: 1,
      overtimeLosses: 0,
      shootoutLosses: 0,
    });
    const result = buildTeamSeasonIdentity({
      stats: playoffStats,
      peers: [summary(avalanche, playoffStats)],
      games: [
        game({
          nhlGameId: 6,
          gameDate: "2026-05-01",
          gameType: 3,
          isHome: true,
          opponent: opponent(25, "DAL", "Dallas Stars"),
          score: 2,
          opponentScore: 3,
          result: "OTL",
          lastPeriodType: "OT",
        }),
      ],
    });

    expect(result.records).toContainEqual(
      expect.objectContaining({
        key: "extra-time",
        regulationLosses: 1,
        overtimeLosses: 0,
      }),
    );
    expect(result.opponents[0]).toMatchObject({
      regulationLosses: 1,
      overtimeLosses: 0,
      outcome: "lost",
      games: [expect.objectContaining({ result: "L" })],
    });
  });
});

const avalanche = team(21, "COL", "Colorado Avalanche");
const avalancheStats = stats({
  standingsPoints: 121,
  wins: 55,
  regulationLosses: 16,
  overtimeLosses: 7,
  shootoutLosses: 4,
  goalsFor: 302,
  goalsAgainst: 203,
  shotsFor: 2766,
  shotsAgainst: 2143,
});

function team(
  nhlTeamId: number,
  abbreviation: string,
  name: string,
): TeamIdentity {
  return {
    id: nhlTeamId,
    nhlTeamId,
    franchiseId: nhlTeamId,
    abbreviation,
    name,
  };
}

function summary(
  identity: TeamIdentity,
  teamStats: TeamSeasonStats,
): TeamSeasonSummary {
  return { team: identity, stats: teamStats };
}

function stats(overrides: Partial<TeamSeasonStats>): TeamSeasonStats {
  return {
    seasonId: 20252026,
    gameType: 2,
    gamesPlayed: 82,
    wins: 40,
    losses: 42,
    regulationWins: 35,
    overtimeWins: 3,
    shootoutWins: 2,
    regulationLosses: 30,
    overtimeLosses: 7,
    shootoutLosses: 5,
    standingsPoints: 92,
    goalsFor: 240,
    goalsAgainst: 240,
    shotsFor: 2400,
    shotsAgainst: 2400,
    ...overrides,
  };
}

function opponent(
  nhlTeamId: number,
  abbreviation: string,
  name: string,
) {
  return { nhlTeamId, abbreviation, name };
}

function game(
  overrides: Partial<TeamGameLogEntry> &
    Pick<
      TeamGameLogEntry,
      | "nhlGameId"
      | "gameDate"
      | "isHome"
      | "opponent"
      | "score"
      | "opponentScore"
      | "result"
    >,
): TeamGameLogEntry {
  return {
    gameType: 2,
    lastPeriodType: "REG",
    shotsOnGoal: 30,
    opponentShotsOnGoal: 30,
    fiveOnFiveXGoalsPercentage: null,
    fiveOnFiveXGoalsFor: null,
    fiveOnFiveXGoalsAgainst: null,
    ...overrides,
  };
}
