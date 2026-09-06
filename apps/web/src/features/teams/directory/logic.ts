import type { StandingsEntry } from "@/contracts/standings";
import type { TeamSeasonSummary } from "@/contracts/team";


export type TeamsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
  }>;
};

export function groupTeams(
  teams: TeamSeasonSummary[],
  standings: StandingsEntry[],
): Array<{
  name: string;
  divisions: Array<{ name: string; teams: TeamSeasonSummary[] }>;
}> {
  const standingByTeam = new Map(
    standings.map((entry) => [entry.nhlTeamId, entry]),
  );
  const conferences = new Map<string, Map<string, TeamSeasonSummary[]>>();

  for (const team of teams) {
    const standing = standingByTeam.get(team.team.nhlTeamId);
    const conferenceName = standing?.conferenceName ?? "Other Teams";
    const divisionName = standing?.divisionName ?? "Unassigned";
    const divisions = conferences.get(conferenceName) ?? new Map();
    const divisionTeams = divisions.get(divisionName) ?? [];
    divisionTeams.push(team);
    divisions.set(divisionName, divisionTeams);
    conferences.set(conferenceName, divisions);
  }

  return [...conferences.entries()]
    .sort(([left], [right]) => conferenceOrder(left) - conferenceOrder(right))
    .map(([name, divisions]) => ({
      name: name.endsWith("Conference") ? name : `${name} Conference`,
      divisions: [...divisions.entries()]
        .sort(([left], [right]) => divisionOrder(left) - divisionOrder(right))
        .map(([divisionName, divisionTeams]) => ({
          name: divisionName.endsWith("Division")
            ? divisionName
            : `${divisionName} Division`,
          teams: divisionTeams,
        })),
    }));
}

export function conferenceOrder(name: string): number {
  const order = ["Western", "Eastern"];
  const index = order.findIndex((value) => name.startsWith(value));
  return index === -1 ? order.length : index;
}

export function divisionOrder(name: string): number {
  const order = ["Central", "Pacific", "Atlantic", "Metropolitan"];
  const index = order.findIndex((value) => name.startsWith(value));
  return index === -1 ? order.length : index;
}
