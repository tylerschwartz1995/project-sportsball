import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { WorkspacePageHeader } from "@/components/ui/workspace-primitives";
import { SeasonPicker } from "@/features/league/season-picker";
import { TeamLogo } from "@/features/teams/team-logo";

import type { loadTeamsPage } from './loader';
export function TeamsPageView({
  selectedSeason,
  seasons,
  sortedTeams,
  teamGroups,
}: Awaited<ReturnType<typeof loadTeamsPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="teams" />

      <section className="py-10">
        <WorkspacePageHeader
          eyebrow="Team directory"
          title={`${selectedSeason?.label ?? "No Season"} Teams`}
          description=""
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
