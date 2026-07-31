import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
} from "@/contracts/advanced-leaderboard";

export const SKATER_METRIC_KEYS = [
  "individualExpectedGoalsPer60",
  "goalsPer60",
  "pointsPer60",
  "gameScorePer60",
  "onIceExpectedGoalsPercentage",
  "onIceCorsiPercentage",
  "onIceFenwickPercentage",
] as const;

export const GOALIE_METRIC_KEYS = [
  "expectedGoalsAgainstPer60",
  "goalsAgainstPer60",
  "goalsSavedAboveExpectedPer60",
  "expectedShotsOnGoalAgainstPer60",
  "shotsOnGoalAgainstPer60",
] as const;

export type SkaterMetricKey = (typeof SKATER_METRIC_KEYS)[number];
export type GoalieMetricKey = (typeof GOALIE_METRIC_KEYS)[number];
export type PlayerMetricKey = SkaterMetricKey | GoalieMetricKey;
export type SkaterComparisonGroup = "forwards" | "defense";
export type GoalieComparisonGroup = "aboveExpected" | "belowExpected";
export type PlayerComparisonGroup =
  | "all"
  | SkaterComparisonGroup
  | GoalieComparisonGroup;

type PlayerComparisonPointBase = {
  nhlPlayerId: number;
  nhlTeamId: number;
  name: string;
  teamAbbreviation: string;
  gamesPlayed: number;
  iceTimeMinutes: number;
};

export type SkaterComparisonPoint = PlayerComparisonPointBase & {
  kind: "skater";
  position: string | null;
  group: SkaterComparisonGroup;
  metrics: Partial<Record<SkaterMetricKey, number>>;
};

export type GoalieComparisonPoint = PlayerComparisonPointBase & {
  kind: "goalie";
  group: GoalieComparisonGroup;
  metrics: Partial<Record<GoalieMetricKey, number>>;
};

export type PlayerComparisonPoint =
  | SkaterComparisonPoint
  | GoalieComparisonPoint;

export type PlotPoint = PlayerComparisonPoint & {
  xValue: number;
  yValue: number;
};

export type DistributionBin = {
  minimum: number;
  maximum: number;
  midpoint: number;
  label: string;
  count: number;
};

export function buildSkaterComparisonPoints(
  rows: AdvancedSkaterLeaderboardRow[],
): SkaterComparisonPoint[] {
  return rows.flatMap((row) => {
    if (row.iceTimeSeconds <= 0) {
      return [];
    }

    const hoursPlayed = row.iceTimeSeconds / 3600;
    const metrics: Partial<Record<SkaterMetricKey, number>> = {};
    setRate(
      metrics,
      "individualExpectedGoalsPer60",
      row.individualExpectedGoals,
      hoursPlayed,
    );
    setRate(metrics, "goalsPer60", row.individualGoals, hoursPlayed);
    setRate(metrics, "pointsPer60", row.individualPoints, hoursPlayed);
    setRate(metrics, "gameScorePer60", row.gameScore, hoursPlayed);
    setPercentage(
      metrics,
      "onIceExpectedGoalsPercentage",
      row.onIceExpectedGoalsPercentage,
    );
    setPercentage(
      metrics,
      "onIceCorsiPercentage",
      row.onIceCorsiPercentage,
    );
    setPercentage(
      metrics,
      "onIceFenwickPercentage",
      row.onIceFenwickPercentage,
    );

    if (Object.keys(metrics).length === 0) {
      return [];
    }

    return [
      {
        kind: "skater" as const,
        nhlPlayerId: row.player.nhlPlayerId,
        nhlTeamId: row.team.nhlTeamId,
        name: row.player.name,
        position: row.player.position,
        teamAbbreviation: row.team.abbreviation,
        gamesPlayed: row.gamesPlayed,
        iceTimeMinutes: row.iceTimeSeconds / 60,
        group: row.player.position === "D" ? "defense" : "forwards",
        metrics,
      },
    ];
  });
}

export function buildGoalieComparisonPoints(
  rows: AdvancedGoalieLeaderboardRow[],
): GoalieComparisonPoint[] {
  return rows.flatMap((row) => {
    if (row.iceTimeSeconds <= 0) {
      return [];
    }

    const hoursPlayed = row.iceTimeSeconds / 3600;
    const metrics: Partial<Record<GoalieMetricKey, number>> = {};
    setRate(
      metrics,
      "expectedGoalsAgainstPer60",
      row.expectedGoalsAgainst,
      hoursPlayed,
    );
    setRate(
      metrics,
      "goalsAgainstPer60",
      row.goalsAgainst,
      hoursPlayed,
    );
    setRate(
      metrics,
      "goalsSavedAboveExpectedPer60",
      row.goalsSavedAboveExpected,
      hoursPlayed,
    );
    setRate(
      metrics,
      "expectedShotsOnGoalAgainstPer60",
      row.expectedShotsOnGoalAgainst,
      hoursPlayed,
    );
    setRate(
      metrics,
      "shotsOnGoalAgainstPer60",
      row.shotsOnGoalAgainst,
      hoursPlayed,
    );

    if (Object.keys(metrics).length === 0) {
      return [];
    }

    const goalsSavedRate =
      metrics.goalsSavedAboveExpectedPer60 ?? Number.NEGATIVE_INFINITY;

    return [
      {
        kind: "goalie" as const,
        nhlPlayerId: row.player.nhlPlayerId,
        nhlTeamId: row.team.nhlTeamId,
        name: row.player.name,
        teamAbbreviation: row.team.abbreviation,
        gamesPlayed: row.gamesPlayed,
        iceTimeMinutes: row.iceTimeSeconds / 60,
        group: goalsSavedRate >= 0 ? "aboveExpected" : "belowExpected",
        metrics,
      },
    ];
  });
}

export function buildPlotPoints(
  points: PlayerComparisonPoint[],
  xMetric: PlayerMetricKey,
  yMetric: PlayerMetricKey,
): PlotPoint[] {
  return points.flatMap((point) => {
    const metrics = point.metrics as Partial<
      Record<PlayerMetricKey, number>
    >;
    const xValue = metrics[xMetric];
    const yValue = metrics[yMetric];
    return xValue === undefined || yValue === undefined
      ? []
      : [{ ...point, xValue, yValue }];
  });
}

export function filterPlayerComparisonPoints<
  Point extends PlayerComparisonPoint,
>(points: Point[], group: PlayerComparisonGroup): Point[] {
  return group === "all"
    ? points
    : points.filter((point) => point.group === group);
}

export function playerPointKey(point: PlayerComparisonPoint): string {
  return `${point.nhlPlayerId}:${point.nhlTeamId}`;
}

export function metricValue(
  point: PlayerComparisonPoint,
  metric: PlayerMetricKey,
): number | undefined {
  return (point.metrics as Partial<Record<PlayerMetricKey, number>>)[metric];
}

export function numericDomain(
  values: number[],
  options: {
    includeValues?: number[];
    allowNegative?: boolean;
  } = {},
): [number, number] {
  const allValues = [...values, ...(options.includeValues ?? [])];
  if (allValues.length === 0) {
    return options.allowNegative ? [-1, 1] : [0, 1];
  }

  const minimum = Math.min(...allValues);
  const maximum = Math.max(...allValues);
  const range = Math.max(maximum - minimum, Math.abs(maximum) * 0.1, 0.1);
  const padding = range * 0.1;
  const paddedMinimum = minimum - padding;

  return [
    Number(
      (options.allowNegative
        ? paddedMinimum
        : Math.max(0, paddedMinimum)
      ).toFixed(2),
    ),
    Number((maximum + padding).toFixed(2)),
  ];
}

export function signedDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [-1, 1];
  }

  const bound = Math.max(0.1, ...values.map((value) => Math.abs(value)));
  const paddedBound = Number((bound * 1.12).toFixed(2));
  return [-paddedBound, paddedBound];
}

export function buildDistribution(
  values: number[],
  domain: [number, number],
  binCount = 9,
): DistributionBin[] {
  if (values.length === 0 || binCount < 1) {
    return [];
  }

  const [minimumDomain, maximumDomain] = domain;
  const width = (maximumDomain - minimumDomain) / binCount;
  if (width <= 0) {
    return [];
  }

  const bins = Array.from({ length: binCount }, (_, index) => {
    const minimum = minimumDomain + index * width;
    const maximum = minimum + width;
    return {
      minimum,
      maximum,
      midpoint: minimum + width / 2,
      label: `${minimum.toFixed(2)} to ${maximum.toFixed(2)}`,
      count: 0,
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - minimumDomain) / width);
    const index = Math.min(binCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  return bins;
}

function setRate<Key extends string>(
  metrics: Partial<Record<Key, number>>,
  key: Key,
  value: number | null,
  hoursPlayed: number,
) {
  if (value !== null) {
    metrics[key] = value / hoursPlayed;
  }
}

function setPercentage<Key extends string>(
  metrics: Partial<Record<Key, number>>,
  key: Key,
  value: number | null,
) {
  if (value !== null) {
    metrics[key] = value * 100;
  }
}
