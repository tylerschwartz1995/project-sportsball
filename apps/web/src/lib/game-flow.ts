import type { MoneyPuckShot } from "@/contracts/advanced-game";
import type {
  GameFlow,
  GameFlowChance,
  GameFlowGoal,
  GameFlowPoint,
  GameFlowPeriodSummary,
  GameFlowTeam,
} from "@/contracts/game-flow";
import type { GameTeamSummary } from "@/contracts/game";
import type { PlayByPlayEvent } from "@/contracts/play-by-play";

const REGULATION_PERIOD_SECONDS = 20 * 60;
const PRESSURE_WINDOW_SECONDS = 5 * 60;
const SAMPLE_INTERVAL_SECONDS = 15;

type PressureTrendPoint = Pick<
  GameFlowPoint,
  "gameTimeSeconds" | "period" | "pressureDifferential"
>;

export function smoothPressureTrend(
  points: PressureTrendPoint[],
  windowSeconds = 30,
): number[] {
  return points.map((point, pointIndex) => {
    const periodStartSeconds = (point.period - 1) * REGULATION_PERIOD_SECONDS;
    const windowStartSeconds = Math.max(
      periodStartSeconds,
      point.gameTimeSeconds - windowSeconds,
    );
    const windowDuration = point.gameTimeSeconds - windowStartSeconds;
    if (windowDuration <= 0) return point.pressureDifferential;

    let weightedPressure = 0;
    for (let index = pointIndex - 1; index >= 0; index -= 1) {
      const segment = points[index];
      if (segment.period !== point.period) break;

      const segmentStart = Math.max(
        windowStartSeconds,
        segment.gameTimeSeconds,
      );
      const segmentEnd = Math.min(
        point.gameTimeSeconds,
        points[index + 1].gameTimeSeconds,
      );
      if (segmentEnd > segmentStart) {
        weightedPressure +=
          segment.pressureDifferential * (segmentEnd - segmentStart);
      }
      if (segment.gameTimeSeconds <= windowStartSeconds) break;
    }

    return weightedPressure / windowDuration;
  });
}

type BuildGameFlowInput = {
  shots: MoneyPuckShot[];
  events: PlayByPlayEvent[];
  awayTeam: GameTeamSummary;
  homeTeam: GameTeamSummary;
};

type ModeledShot = MoneyPuckShot & { expectedGoal: number };

export function buildGameFlow({
  shots,
  events,
  awayTeam,
  homeTeam,
}: BuildGameFlowInput): GameFlow | null {
  const modeledShots = shots
    .filter((shot): shot is ModeledShot => shot.expectedGoal !== null)
    .toSorted(
      (left, right) =>
        left.gameTimeSeconds - right.gameTimeSeconds ||
        left.sourceEventIndex - right.sourceEventIndex,
    );
  if (modeledShots.length === 0) {
    return null;
  }

  const away = mapTeam(awayTeam);
  const home = mapTeam(homeTeam);
  const gameEndSeconds = deriveGameEndSeconds(modeledShots, events);
  const pointTimes = buildPointTimes(modeledShots, gameEndSeconds);
  const goals = buildGoals(modeledShots, events, away, home);

  return {
    awayTeam: away,
    homeTeam: home,
    points: pointTimes.map((gameTimeSeconds) => {
      const period = periodAt(gameTimeSeconds, gameEndSeconds);
      const periodStartSeconds = (period - 1) * REGULATION_PERIOD_SECONDS;
      const windowStartSeconds = Math.max(
        periodStartSeconds,
        gameTimeSeconds - PRESSURE_WINDOW_SECONDS,
      );
      const shotsToNow = modeledShots.filter(
        (shot) => shot.gameTimeSeconds <= gameTimeSeconds,
      );
      const pressureShots = shotsToNow.filter(
        (shot) =>
          shot.period === period &&
          shot.gameTimeSeconds > windowStartSeconds,
      );
      const awayPressureExpectedGoals = sumExpectedGoals(
        pressureShots.filter((shot) => !shot.isHomeTeam),
      );
      const homePressureExpectedGoals = sumExpectedGoals(
        pressureShots.filter((shot) => shot.isHomeTeam),
      );
      const awayCumulativeExpectedGoals = sumExpectedGoals(
        shotsToNow.filter((shot) => !shot.isHomeTeam),
      );
      const homeCumulativeExpectedGoals = sumExpectedGoals(
        shotsToNow.filter((shot) => shot.isHomeTeam),
      );
      const goalsToNow = goals.filter(
        (goal) => goal.gameTimeSeconds <= gameTimeSeconds,
      );

      return {
        gameTimeSeconds,
        period,
        periodTimeSeconds: Math.max(
          0,
          gameTimeSeconds - periodStartSeconds,
        ),
        awayPressureExpectedGoals,
        homePressureExpectedGoals,
        pressureDifferential:
          awayPressureExpectedGoals - homePressureExpectedGoals,
        awayCumulativeExpectedGoals,
        homeCumulativeExpectedGoals,
        awayShotsInWindow: pressureShots.filter((shot) => !shot.isHomeTeam)
          .length,
        homeShotsInWindow: pressureShots.filter((shot) => shot.isHomeTeam)
          .length,
        awayScore: goalsToNow.filter(
          (goal) => goal.team.nhlTeamId === away.nhlTeamId,
        ).length,
        homeScore: goalsToNow.filter(
          (goal) => goal.team.nhlTeamId === home.nhlTeamId,
        ).length,
        biggestChance: biggestChance(pressureShots, away, home),
      };
    }),
    goals,
    periods: buildPeriodSummaries(modeledShots, events),
    gameEndSeconds,
    pressureWindowSeconds: PRESSURE_WINDOW_SECONDS,
    endedInShootout: events.some((event) => event.periodType === "SO"),
  };
}

function buildPointTimes(
  shots: ModeledShot[],
  gameEndSeconds: number,
): number[] {
  const times = new Set<number>([0, gameEndSeconds]);
  for (
    let time = SAMPLE_INTERVAL_SECONDS;
    time < gameEndSeconds;
    time += SAMPLE_INTERVAL_SECONDS
  ) {
    times.add(time);
  }
  for (const shot of shots) {
    times.add(Math.min(gameEndSeconds, shot.gameTimeSeconds));
    times.add(
      Math.min(
        gameEndSeconds,
        shot.period * REGULATION_PERIOD_SECONDS,
        shot.gameTimeSeconds + PRESSURE_WINDOW_SECONDS,
      ),
    );
  }
  for (
    let boundary = REGULATION_PERIOD_SECONDS;
    boundary < gameEndSeconds;
    boundary += REGULATION_PERIOD_SECONDS
  ) {
    times.add(boundary);
  }
  return Array.from(times).toSorted((left, right) => left - right);
}

function deriveGameEndSeconds(
  shots: ModeledShot[],
  events: PlayByPlayEvent[],
): number {
  const eventTimes = events.flatMap((event) => {
    if (
      event.periodType === "SO" ||
      event.timeInPeriodSeconds === null
    ) {
      return [];
    }
    return [
      (event.periodNumber - 1) * REGULATION_PERIOD_SECONDS +
        event.timeInPeriodSeconds,
    ];
  });
  const lastObservedSecond = Math.max(
    ...shots.map((shot) => shot.gameTimeSeconds),
    ...eventTimes,
  );
  return lastObservedSecond <= 3 * REGULATION_PERIOD_SECONDS
    ? 3 * REGULATION_PERIOD_SECONDS
    : lastObservedSecond;
}

function buildGoals(
  shots: ModeledShot[],
  events: PlayByPlayEvent[],
  awayTeam: GameFlowTeam,
  homeTeam: GameFlowTeam,
): GameFlowGoal[] {
  let awayScore = 0;
  let homeScore = 0;

  return shots.flatMap((shot) => {
    if (!shot.isGoal) {
      return [];
    }
    if (shot.isHomeTeam) {
      homeScore += 1;
    } else {
      awayScore += 1;
    }
    const team = shot.isHomeTeam ? homeTeam : awayTeam;
    const periodTimeSeconds =
      shot.gameTimeSeconds -
      (shot.period - 1) * REGULATION_PERIOD_SECONDS;
    const playByPlayGoal = events.find(
      (event) =>
        event.typeDescription.toLowerCase() === "goal" &&
        event.periodNumber === shot.period &&
        event.timeInPeriodSeconds === periodTimeSeconds &&
        event.ownerTeam?.nhlTeamId === team.nhlTeamId,
    );
    const playByPlayScorer = playByPlayGoal?.players.find(
      (player) => player.role === "scorer",
    )?.name;
    const assists = playByPlayGoal
      ? ["primary_assist", "secondary_assist"].flatMap((role) => {
          const name = playByPlayGoal.players.find(
            (player) => player.role === role,
          )?.name;
          return name ? [name] : [];
        })
      : null;
    return [
      {
        sourceShotId: shot.sourceShotId,
        gameTimeSeconds: shot.gameTimeSeconds,
        period: shot.period,
        periodTimeSeconds,
        team,
        shooterName: playByPlayScorer ?? shot.shooter?.name ?? null,
        assists,
        awayScore,
        homeScore,
      },
    ];
  });
}

function buildPeriodSummaries(
  shots: ModeledShot[],
  events: PlayByPlayEvent[],
): GameFlowPeriodSummary[] {
  const periodTypes = new Map<number, string>();
  for (const event of events) {
    periodTypes.set(event.periodNumber, event.periodType);
  }
  const periods = Array.from(new Set(shots.map((shot) => shot.period))).toSorted(
    (left, right) => left - right,
  );
  return periods.map((period) => ({
    period,
    periodType: periodTypes.get(period) ?? (period > 3 ? "OT" : "REG"),
    awayExpectedGoals: sumExpectedGoals(
      shots.filter((shot) => shot.period === period && !shot.isHomeTeam),
    ),
    homeExpectedGoals: sumExpectedGoals(
      shots.filter((shot) => shot.period === period && shot.isHomeTeam),
    ),
  }));
}

function biggestChance(
  shots: ModeledShot[],
  awayTeam: GameFlowTeam,
  homeTeam: GameFlowTeam,
): GameFlowChance | null {
  let biggest: ModeledShot | null = null;
  for (const shot of shots) {
    if (!biggest || shot.expectedGoal > biggest.expectedGoal) {
      biggest = shot;
    }
  }
  return biggest
    ? {
        sourceShotId: biggest.sourceShotId,
        team: biggest.isHomeTeam ? homeTeam : awayTeam,
        shooterName: biggest.shooter?.name ?? null,
        shotType: biggest.shotType,
        expectedGoal: biggest.expectedGoal,
        isGoal: biggest.isGoal,
      }
    : null;
}

function sumExpectedGoals(shots: ModeledShot[]): number {
  return shots.reduce((total, shot) => total + shot.expectedGoal, 0);
}

function periodAt(gameTimeSeconds: number, gameEndSeconds: number): number {
  if (gameTimeSeconds === gameEndSeconds && gameTimeSeconds > 0) {
    return Math.max(1, Math.ceil(gameTimeSeconds / REGULATION_PERIOD_SECONDS));
  }
  return Math.floor(gameTimeSeconds / REGULATION_PERIOD_SECONDS) + 1;
}

function mapTeam(team: GameTeamSummary): GameFlowTeam {
  return {
    nhlTeamId: team.nhlTeamId,
    abbreviation: team.abbreviation,
    name: team.name,
  };
}
