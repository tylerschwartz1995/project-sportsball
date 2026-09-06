import {
  type GameSummary
} from "@/contracts/game";

export type GamesPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    date?: string | string[];
    phase?: string | string[];
    team?: string | string[];
  }>;
};

export function hasFinalScore(game: GameSummary): boolean {
  return game.awayTeam.score !== null && game.homeTeam.score !== null;
}

export function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
