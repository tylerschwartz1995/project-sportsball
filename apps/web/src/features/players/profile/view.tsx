import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { PlayerCareer } from "@/features/players/player-career";
import { TeamLogoStack } from "@/features/teams/team-logo";
import { formatPlayerPosition, formatPlayerPositionLong } from "@/lib/player-position";
import type { loadPlayerPage } from './loader';
import { formatBirthDetails, formatDraft, formatHandedness, formatHeight } from './logic';

export function PlayerPageView({ phase, selectedTeams, profile, career }: Awaited<ReturnType<typeof loadPlayerPage>>) {
  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
    <SiteHeader active="players" />
    <section className="py-8">
        <div className="modern-profile-identity modern-player-identity mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4 sm:gap-5">
              <TeamLogoStack teams={selectedTeams} size="profile" prominent />
              <div className="reference-player-profile-heading">
                <h1 className="text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
                  {profile.name}
                </h1>
                <span className="reference-player-profile-position" title={formatPlayerPositionLong(profile.position)}>
                  {formatPlayerPosition(profile.position)}
                </span>
              </div>
            </div>
            <div className="reference-player-bio" tabIndex={0} role="region" aria-label="Player biography">
              <span><span className="reference-bio-label">Born</span> {formatBirthDetails(profile.birthDate, profile.birthPlace)}</span>
              <span>{profile.heightInInches ? formatHeight(profile.heightInInches) : "Height unavailable"} · {profile.weightInPounds ? `${profile.weightInPounds} lb` : "Weight unavailable"}</span>
              <span><span className="reference-bio-label">{profile.position === "G" ? "Catches" : "Shoots"}</span> {formatHandedness(profile.shootsCatches)}</span>
              <span><span className="reference-bio-label">Draft</span> {formatDraft(profile)}</span>
            </div>
          </div>
        </div>
      <SeasonPhaseFilter active={phase} path={`/players/${profile.nhlPlayerId}`} params={{}} />
      <PlayerCareer rows={career} phase={phase} />
    </section>
    <NavigationComplete />
  </main>;
}
