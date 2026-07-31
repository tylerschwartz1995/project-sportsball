import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
} from "@/contracts/advanced-leaderboard";

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
  xValue: number;
  yValue: number;
  differenceValue: number;
};

export type SkaterComparisonPoint = PlayerComparisonPointBase & {
  kind: "skater";
  position: string | null;
  group: SkaterComparisonGroup;
  individualExpectedGoals: number;
  individualGoals: number;
};

export type GoalieComparisonPoint = PlayerComparisonPointBase & {
  kind: "goalie";
  group: GoalieComparisonGroup;
  expectedGoalsAgainst: number;
  goalsAgainst: number;
  goalsSavedAboveExpected: number;
};

export type PlayerComparisonPoint =
  | SkaterComparisonPoint
  | GoalieComparisonPoint;

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
    if (
      row.iceTimeSeconds <= 0 ||
      row.individualExpectedGoals === null ||
      row.individualGoals === null
    ) {
      return [];
    }

    const hoursPlayed = row.iceTimeSeconds / 3600;
    const xValue = row.individualExpectedGoals / hoursPlayed;
    const yValue = row.individualGoals / hoursPlayed;

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
        xValue,
        yValue,
        differenceValue: yValue - xValue,
        group: row.player.position === "D" ? "defense" : "forwards",
        individualExpectedGoals: row.individualExpectedGoals,
        individualGoals: row.individualGoals,
      },
    ];
  });
}

export function buildGoalieComparisonPoints(
  rows: AdvancedGoalieLeaderboardRow[],
): GoalieComparisonPoint[] {
  return rows.flatMap((row) => {
    if (
      row.iceTimeSeconds <= 0 ||
      row.expectedGoalsAgainst === null ||
      row.goalsAgainst === null ||
      row.goalsSavedAboveExpected === null
    ) {
      return [];
    }

    const hoursPlayed = row.iceTimeSeconds / 3600;
    const xValue = row.expectedGoalsAgainst / hoursPlayed;
    const yValue = row.goalsSavedAboveExpected / hoursPlayed;

    return [
      {
        kind: "goalie" as const,
        nhlPlayerId: row.player.nhlPlayerId,
        nhlTeamId: row.team.nhlTeamId,
        name: row.player.name,
        teamAbbreviation: row.team.abbreviation,
        gamesPlayed: row.gamesPlayed,
        iceTimeMinutes: row.iceTimeSeconds / 60,
        xValue,
        yValue,
        differenceValue: yValue,
        group: yValue >= 0 ? "aboveExpected" : "belowExpected",
        expectedGoalsAgainst: row.expectedGoalsAgainst,
        goalsAgainst: row.goalsAgainst,
        goalsSavedAboveExpected: row.goalsSavedAboveExpected,
      },
    ];
  });
}

export function filterPlayerComparisonPoints<
  Point extends PlayerComparisonPoint,
>(points: Point[], group: PlayerComparisonGroup): Point[] {
  return group === "all"
    ? points
    : points.filter((point) => point.group === group);
}

export function numericDomain(
  values: number[],
  options: {
    includeZero?: boolean;
    matchingMinimum?: number;
  } = {},
): [number, number] {
  if (values.length === 0) {
    return options.includeZero ? [-1, 1] : [0, 1];
  }

  const minimum = Math.min(
    options.includeZero ? 0 : Number.POSITIVE_INFINITY,
    options.matchingMinimum ?? Number.POSITIVE_INFINITY,
    ...values,
  );
  const maximum = Math.max(
    options.includeZero ? 0 : Number.NEGATIVE_INFINITY,
    ...values,
  );
  const range = Math.max(maximum - minimum, 0.1);
  const padding = range * 0.1;

  return [
    Number(Math.max(0, minimum - padding).toFixed(2)),
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

export function buildCenteredDistribution(
  values: number[],
  binCount = 9,
  domainBound?: number,
): DistributionBin[] {
  if (values.length === 0 || binCount < 1) {
    return [];
  }

  const safeBinCount = binCount % 2 === 0 ? binCount + 1 : binCount;
  const bound = Math.max(
    0.05,
    domainBound ?? 0,
    ...values.map((value) => Math.abs(value)),
  );
  const width = (bound * 2) / safeBinCount;
  const bins = Array.from({ length: safeBinCount }, (_, index) => {
    const minimum = -bound + index * width;
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
    const rawIndex = Math.floor((value + bound) / width);
    const index = Math.min(safeBinCount - 1, Math.max(0, rawIndex));
    bins[index].count += 1;
  }

  return bins;
}
