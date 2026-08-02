import { describe, expect, it } from "vitest";

import type { MoneyPuckShot } from "@/contracts/advanced-game";
import type { GameTeamSummary } from "@/contracts/game";
import type { PlayByPlayEvent } from "@/contracts/play-by-play";
import { buildGameFlow, smoothPressureTrend } from "@/lib/game-flow";

describe("game flow", () => {
  it("builds period-reset pressure, cumulative chances, goals, and period totals", () => {
    const flow = buildGameFlow({
      shots: [
        shot({ sourceShotId: "1", gameTimeSeconds: 100, expectedGoal: 0.2 }),
        shot({
          sourceShotId: "2",
          gameTimeSeconds: 200,
          expectedGoal: 0.1,
          isHomeTeam: true,
        }),
        shot({
          sourceShotId: "3",
          gameTimeSeconds: 400,
          expectedGoal: 0.3,
          isHomeTeam: true,
        }),
        shot({
          sourceShotId: "4",
          gameTimeSeconds: 1300,
          period: 2,
          expectedGoal: 0.5,
          isGoal: true,
          shooter: { nhlPlayerId: 4, name: "Away Scorer" },
        }),
      ],
      events: [
        event({
          sourceEventId: 4,
          periodNumber: 2,
          timeInPeriodSeconds: 100,
          typeDescription: "goal",
          ownerTeam: {
            nhlTeamId: awayTeam.nhlTeamId,
            abbreviation: awayTeam.abbreviation,
            name: awayTeam.name,
          },
          players: [
            {
              sourcePlayerId: 4,
              nhlPlayerId: 4,
              name: "Away Scorer",
              role: "scorer",
            },
            {
              sourcePlayerId: 5,
              nhlPlayerId: 5,
              name: "First Assist",
              role: "primary_assist",
            },
            {
              sourcePlayerId: 6,
              nhlPlayerId: 6,
              name: "Second Assist",
              role: "secondary_assist",
            },
          ],
        }),
        event({ periodNumber: 3, timeInPeriodSeconds: 1200 }),
      ],
      awayTeam,
      homeTeam,
    });

    expect(flow).not.toBeNull();
    expect(pointAt(flow!, 100)).toMatchObject({
      awayPressureExpectedGoals: 0.2,
      homePressureExpectedGoals: 0,
      pressureDifferential: 0.2,
    });
    expect(pointAt(flow!, 400)).toMatchObject({
      awayPressureExpectedGoals: 0,
      homePressureExpectedGoals: 0.4,
      pressureDifferential: -0.4,
      awayCumulativeExpectedGoals: 0.2,
      homeCumulativeExpectedGoals: 0.4,
    });
    expect(pointAt(flow!, 500)).toMatchObject({
      awayPressureExpectedGoals: 0,
      homePressureExpectedGoals: 0.3,
    });
    expect(pointAt(flow!, 1200)).toMatchObject({
      period: 2,
      awayPressureExpectedGoals: 0,
      homePressureExpectedGoals: 0,
    });
    expect(pointAt(flow!, 1300)).toMatchObject({
      awayScore: 1,
      homeScore: 0,
      biggestChance: {
        shooterName: "Away Scorer",
        expectedGoal: 0.5,
        isGoal: true,
      },
    });
    expect(flow?.periods).toEqual([
      expect.objectContaining({
        period: 1,
        awayExpectedGoals: 0.2,
        homeExpectedGoals: 0.4,
      }),
      expect.objectContaining({
        period: 2,
        awayExpectedGoals: 0.5,
        homeExpectedGoals: 0,
      }),
    ]);
    expect(flow?.goals).toEqual([
      expect.objectContaining({
        sourceShotId: "4",
        shooterName: "Away Scorer",
        assists: ["First Assist", "Second Assist"],
        awayScore: 1,
        homeScore: 0,
      }),
    ]);
    expect(flow?.endedInShootout).toBe(false);
  });

  it("preserves unknown assist coverage when no play-by-play goal matches", () => {
    const flow = buildGameFlow({
      shots: [shot({ sourceShotId: "1", gameTimeSeconds: 100, isGoal: true })],
      events: [event({ periodNumber: 3, timeInPeriodSeconds: 1200 })],
      awayTeam,
      homeTeam,
    });

    expect(flow?.goals[0]).toMatchObject({ assists: null });
  });

  it("returns null when modeled shot quality is unavailable", () => {
    expect(
      buildGameFlow({
        shots: [shot({ sourceShotId: "1", expectedGoal: null })],
        events: [],
        awayTeam,
        homeTeam,
      }),
    ).toBeNull();
  });

  it("lightly smooths pressure over the trailing 30 seconds without crossing periods", () => {
    const points = [
      pressurePoint(0, 1, 0),
      pressurePoint(10, 1, 1),
      pressurePoint(20, 1, 1),
      pressurePoint(40, 1, 1),
      pressurePoint(1200, 2, 0),
    ];

    expect(smoothPressureTrend(points)).toEqual([0, 0, 0.5, 1, 0]);
    expect(points.map((point) => point.pressureDifferential)).toEqual([
      0, 1, 1, 1, 0,
    ]);
  });
});

function pressurePoint(
  gameTimeSeconds: number,
  period: number,
  pressureDifferential: number,
) {
  return { gameTimeSeconds, period, pressureDifferential };
}

function pointAt(flow: NonNullable<ReturnType<typeof buildGameFlow>>, time: number) {
  return flow.points.find((point) => point.gameTimeSeconds === time);
}

function shot(overrides: Partial<MoneyPuckShot>): MoneyPuckShot {
  return {
    sourceShotId: "shot",
    sourceEventIndex: 1,
    shootingTeam: awayTeam,
    defendingTeam: homeTeam,
    shooter: null,
    goalie: null,
    eventType: "shot",
    period: 1,
    gameTimeSeconds: 30,
    isHomeTeam: false,
    isPlayoffGame: false,
    isGoal: false,
    wasOnGoal: true,
    shotType: "wrist",
    location: null,
    xCoordinate: null,
    yCoordinate: null,
    adjustedXCoordinate: null,
    adjustedYCoordinate: null,
    shotDistance: null,
    shotAngle: null,
    expectedGoal: 0.05,
    expectedRebound: null,
    generatedRebound: false,
    wasRebound: false,
    wasRush: false,
    wasOffWing: false,
    wasEmptyNet: false,
    homeSkatersOnIce: 5,
    awaySkatersOnIce: 5,
    homeTeamGoals: 0,
    awayTeamGoals: 0,
    timeSinceLastEvent: null,
    distanceFromLastEvent: null,
    ...overrides,
  };
}

function event(overrides: Partial<PlayByPlayEvent>): PlayByPlayEvent {
  return {
    sourceEventId: 1,
    sortOrder: 1,
    periodNumber: 1,
    periodType: "REG",
    timeInPeriod: "01:00",
    timeInPeriodSeconds: 60,
    timeRemaining: "19:00",
    situationCode: "1551",
    typeCode: 502,
    typeDescription: "faceoff",
    ownerTeam: null,
    shotType: null,
    reason: null,
    secondaryReason: null,
    penaltyDescription: null,
    penaltyDurationMinutes: null,
    awayScore: null,
    homeScore: null,
    awayShotsOnGoal: null,
    homeShotsOnGoal: null,
    players: [],
    ...overrides,
  };
}

const awayTeam: GameTeamSummary = {
  id: 1,
  nhlTeamId: 10,
  abbreviation: "AWY",
  name: "Away Team",
  record: { wins: 1, losses: 0, overtimeLosses: 0 },
  score: 1,
  shotsOnGoal: 20,
};

const homeTeam: GameTeamSummary = {
  id: 2,
  nhlTeamId: 20,
  abbreviation: "HOM",
  name: "Home Team",
  record: { wins: 0, losses: 1, overtimeLosses: 0 },
  score: 0,
  shotsOnGoal: 18,
};
