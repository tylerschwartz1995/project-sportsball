import type { TeamIdentity } from "@/contracts/team";

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
  teams: TeamIdentity[];
  values: Record<string, number | null>;
};

export type PlayerComparisonOption = {
  nhlPlayerId: number;
  name: string;
  position: string | null;
};
