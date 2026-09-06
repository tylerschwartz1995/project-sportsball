

export type MetricGuidePageProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export const metricGroups = [
  {
    title: "Shot quality and possession",
    description:
      "Use these together: shot volume describes territorial pressure, while expected goals adds an estimate of chance quality.",
    metrics: [
      {
        abbreviation: "xG",
        name: "Expected goals",
        definition:
          "The estimated probability that an unblocked shot becomes a goal. Adding every shot probability gives a team or player’s total expected goals.",
        reading: "Higher is better for offence; lower is better when allowed.",
      },
      {
        abbreviation: "xG%",
        name: "Expected-goal share",
        definition:
          "Expected goals for divided by total expected goals for and against while the team, player, line, or pairing is on the ice.",
        reading: "Above 50% means the selected side controlled more shot quality.",
      },
      {
        abbreviation: "CF%",
        name: "Corsi share",
        definition:
          "The share of all shot attempts—including goals, saved shots, misses, and blocks—taken by the selected side.",
        reading: "Above 50% indicates more shot-attempt pressure than the opponent.",
      },
      {
        abbreviation: "FF%",
        name: "Fenwick share",
        definition:
          "The share of unblocked shot attempts, so it includes goals, saves, and misses but removes blocked attempts.",
        reading: "Above 50% indicates the selected side produced more unblocked attempts.",
      },
    ],
  },
  {
    title: "Player creation and results",
    description:
      "Individual metrics describe what a skater personally generated; on-ice metrics include everything that happened with that player on the ice.",
    metrics: [
      {
        abbreviation: "ixG",
        name: "Individual expected goals",
        definition:
          "The expected-goal probabilities from only that skater’s own unblocked shots, added together.",
        reading: "A shot-quality estimate of the scoring chances a player personally created.",
      },
      {
        abbreviation: "On-ice xG%",
        name: "On-ice expected-goal share",
        definition:
          "The team’s expected-goal share during the player’s ice time, regardless of which teammate took each shot.",
        reading: "Useful for context, but affected by teammates, opponents, and deployment.",
      },
      {
        abbreviation: "Game score",
        name: "Single-game contribution",
        definition:
          "MoneyPuck’s combined single-game estimate using scoring, shot, penalty, and defensive events. Season and career displays sum the covered games; they are not per-game averages.",
        reading: "Best used as a compact game summary, not a complete player evaluation.",
      },
    ],
  },
  {
    title: "Goaltending",
    description:
      "Expected-goal models estimate shot difficulty so goalie results can be compared with the quality of chances faced.",
    metrics: [
      {
        abbreviation: "xGA",
        name: "Expected goals against",
        definition:
          "The expected-goal probabilities of the unblocked shots a goalie faced, added together.",
        reading: "An estimate of how many goals an average goalie would allow on those chances.",
      },
      {
        abbreviation: "GSAx",
        name: "Goals saved above expected",
        definition:
          "Expected goals against minus actual goals against.",
        reading: "Positive is better: the goalie allowed fewer goals than shot quality predicted.",
      },
      {
        abbreviation: "SV%",
        name: "Save percentage",
        definition:
          "Saves divided by shots on goal. Unlike GSAx, it does not adjust for the quality of shots faced.",
        reading: "Higher is better, but compare it with workload and shot quality.",
      },
    ],
  },
] as const;
