import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { TeamLogo } from "@/app/_components/team-logo";
import { WorkspacePageHeader } from "@/app/_components/workspace-primitives";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import type { TeamSeasonSummary } from "@/contracts/team";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { listTeamsBySeason } from "@/data/teams";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

type TeamsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
  }>;
};

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [teams, standings] = selectedSeason
    ? await Promise.all([
        listTeamsBySeason(selectedSeason.id, 2),
        getStandings(selectedSeason.id),
      ])
    : [[], []];
  const sortedTeams = [...teams].sort((left, right) =>
    left.team.name.localeCompare(right.team.name),
  );
  const teamGroups = groupTeams(sortedTeams, standings);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Team directory"
          title={`${selectedSeason?.label ?? "No Season"} Teams`}
          description="Select any club to open its season profile, roster, games, and analytics."
          descriptionClassName="workspace-description-single-line"
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {selectedSeason && sortedTeams.length > 0 ? (
          <div className="workspace-team-conferences">
            {teamGroups.map((conference) => (
              <section key={conference.name}>
                <h2>{conference.name}</h2>
                {conference.divisions.map((division) => (
                  <div
                    key={`${conference.name}-${division.name}`}
                    className="workspace-team-division"
                  >
                    <div>
                      <h3>{division.name}</h3>
                      <span>{division.teams.length} teams</span>
                    </div>
                    <div className="workspace-team-directory">
                      {division.teams.map(({ team }) => (
                        <Link
                          key={team.id}
                          href={`/teams/${team.nhlTeamId}?season=${selectedSeason.id}`}
                          className="workspace-team-directory-card"
                        >
                          <TeamLogo
                            {...team}
                            size="compact"
                            decorative
                            prominent
                          />
                          <span>
                            <strong>{team.name}</strong>
                            <small>{team.abbreviation}</small>
                          </span>
                          <span aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="workspace-empty-state mt-10">
            No teams are available for this season.
          </div>
        )}
      </section>
    </main>
  );
}

function groupTeams(
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

function conferenceOrder(name: string): number {
  const order = ["Western", "Eastern"];
  const index = order.findIndex((value) => name.startsWith(value));
  return index === -1 ? order.length : index;
}

function divisionOrder(name: string): number {
  const order = ["Central", "Pacific", "Atlantic", "Metropolitan"];
  const index = order.findIndex((value) => name.startsWith(value));
  return index === -1 ? order.length : index;
}
