import type { StandingsEntry } from "@/contracts/standings";
import {
  applySortDirection
} from "@/lib/directory";

export type StandingsView = "overall" | "conference" | "division";

export type StandingsDisplay = "standings" | "progress";

export type StandingsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    view?: string | string[];
    display?: string | string[];
    chartDivision?: string | string[];
  }>;
};

export const standingsColumns: Array<{
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  defaultDirection?: "asc" | "desc";
}> = [
    { key: "rank", label: "Rank", align: "center", defaultDirection: "asc" },
    { key: "team", label: "Team", align: "left", defaultDirection: "asc" },
    { key: "points", label: "PTS" },
    { key: "games", label: "GP" },
    { key: "wins", label: "W" },
    { key: "losses", label: "L" },
    { key: "overtimeLosses", label: "OT" },
    { key: "regulationWins", label: "RW" },
    { key: "goalsFor", label: "GF" },
    { key: "goalsAgainst", label: "GA" },
    { key: "goalDifferential", label: "DIFF" },
  ];

export function parseView(value: string | undefined): StandingsView {
  return value === "conference" || value === "division" ? value : "overall";
}

export function parseStandingsDisplay(value: string | undefined): StandingsDisplay {
  return value === "progress" ? "progress" : "standings";
}

export function buildGroups(
  standings: StandingsEntry[],
  view: StandingsView,
): Array<{ label: string; standings: StandingsEntry[] }> {
  if (view === "overall") {
    return [{ label: "League Standings", standings }];
  }
  const key = view === "conference" ? "conferenceName" : "divisionName";
  const grouped = new Map<string, StandingsEntry[]>();
  for (const team of standings) {
    const label = team[key] ?? `Unknown ${capitalize(view)}`;
    grouped.set(label, [...(grouped.get(label) ?? []), team]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, entries]) => ({
      label: `${label} ${capitalize(view)}`,
      standings: entries,
    }));
}

export function rankForView(team: StandingsEntry, view: StandingsView): number | null {
  if (view === "conference") return team.conferenceRank;
  if (view === "division") return team.divisionRank;
  return team.leagueRank;
}

export function sortStandings(
  standings: StandingsEntry[],
  sort: string,
  direction: "asc" | "desc",
  view: StandingsView,
): StandingsEntry[] {
  return [...standings].sort((left, right) => {
    let comparison: number;
    switch (sort) {
      case "team":
        comparison = right.teamName.localeCompare(left.teamName);
        break;
      case "games":
        comparison = right.gamesPlayed - left.gamesPlayed;
        break;
      case "wins":
        comparison = right.wins - left.wins;
        break;
      case "losses":
        comparison = right.losses - left.losses;
        break;
      case "overtimeLosses":
        comparison = right.overtimeLosses - left.overtimeLosses;
        break;
      case "regulationWins":
        comparison = right.regulationWins - left.regulationWins;
        break;
      case "goalsFor":
        comparison = right.goalsFor - left.goalsFor;
        break;
      case "goalsAgainst":
        comparison = right.goalsAgainst - left.goalsAgainst;
        break;
      case "goalDifferential":
        comparison = right.goalDifferential - left.goalDifferential;
        break;
      case "points":
        comparison = right.points - left.points;
        break;
      default:
        comparison =
          (rankForView(right, view) ?? 999) -
          (rankForView(left, view) ?? 999);
    }
    if (comparison === 0) {
      comparison = right.teamName.localeCompare(left.teamName);
    }
    return applySortDirection(comparison, direction);
  });
}

export function formatSnapshotDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDifferential(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
