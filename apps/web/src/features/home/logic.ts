import type { StandingsEntry } from "@/contracts/standings";

export type HomeProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export function formatRecord(team: StandingsEntry): string {
  return `${team.wins}-${team.losses}-${team.overtimeLosses}`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

export function formatUpcomingTime(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function formatSeason(seasonId: number): string {
  return `${Math.floor(seasonId / 10_000)}–${String(seasonId % 10_000).slice(-2)}`;
}
