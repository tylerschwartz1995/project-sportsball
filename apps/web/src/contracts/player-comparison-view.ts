export type PlayerComparisonMetric = {
  key: string;
  label: string;
  shortLabel: string;
  unit: "integer" | "decimal" | "percentage" | "savePercentage" | "signed";
};

export type PlayerComparisonEntry = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
  values: Record<string, number | null>;
};

export type PlayerComparisonOption = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
};
