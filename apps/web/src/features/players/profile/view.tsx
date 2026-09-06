import { SiteHeader } from "@/components/shell/site-header";
import Link, { ReturnLink } from "@/components/ui/exploration-link";
import { ViewTabs } from "@/components/ui/view-tabs";
import {
  seasonPhaseLabel
} from "@/contracts/season-phase";
import { PlayerAdvancedAnalytics } from "@/features/analytics/advanced-analytics";
import { PlayerRollingPerformanceChart } from "@/features/charts/lazy-charts";
import { SeasonPhaseFilter } from "@/features/league/season-phase-filter";
import { SeasonPicker } from "@/features/league/season-picker";
import { PlayerCareer } from "@/features/players/player-career";
import { TeamLogoStack } from "@/features/teams/team-logo";
import { formatPlayerPositionLong } from "@/lib/player-position";
import type { loadPlayerPage } from './loader';
import { formatBirthDetails, formatDraft, formatHandedness, formatHeight, playerViewTabs } from './logic';
import { GoaliePanel, ProfileStat, SectionTitle, SkaterPanel } from './sections';
export function PlayerPageView({
  seasons,
  advanced,
  selectedSeason,
  phase,
  selectedTeams,
  profile,
  view,
  careerSeasons,
  chartParams,
  regularSkater,
  playoffSkater,
  regularGoalie,
  playoffGoalie,
  career,
  nhlPlayerId,
  skaterPerformanceGames,
  goaliePerformanceGames,
}: Awaited<ReturnType<typeof loadPlayerPage>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="players" />

      <section className="py-10">
        <ReturnLink
          fallback={`/players${selectedSeason ? `?season=${selectedSeason.id}&phase=${phase}` : ""}`}
        >
          ← All players
        </ReturnLink>

        <div className="modern-profile-identity modern-player-identity mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-4 sm:gap-5">
              <TeamLogoStack teams={selectedTeams} size="profile" prominent />
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">
                  {profile.name}
                </h1>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_42%,var(--border))] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  {formatPlayerPositionLong(profile.position)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-base text-[var(--muted)]">
              {selectedSeason
                ? view === "seasons"
                  ? "Career statistics"
                  : `${selectedSeason.label} statistics`
                : "Player profile"}
            </p>
          </div>
          {careerSeasons.length > 0 ? (
            <div className="workspace-page-actions">
              {selectedSeason &&
                seasons.some((season) => season.id === selectedSeason.id) ? (
                <Link
                  href={`/players/compare?season=${selectedSeason.id}&phase=${phase}&type=${profile.position === "G" ? "goalies" : "skaters"}&players=${profile.nhlPlayerId}`}
                  className="workspace-secondary-action"
                >
                  Compare Player
                </Link>
              ) : null}
              {view !== "seasons" ? (
                <SeasonPicker
                  seasons={careerSeasons}
                  selectedSeasonId={selectedSeason?.id}
                  params={{ phase, view, ...chartParams }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedSeason ? (
          <ViewTabs
            active={view}
            ariaLabel={`${profile.name} views`}
            label="Profile view"
            tabs={playerViewTabs({
              nhlPlayerId: profile.nhlPlayerId,
              seasonId: selectedSeason.id,
              phase,
              chartParams,
            }).filter(
              (tab) =>
                (tab.id !== "advanced" ||
                  (phase === "regular" && selectedSeason.id >= 20082009)) &&
                (tab.id !== "trends" ||
                  seasons.some((season) => season.id === selectedSeason.id)),
            )}
          />
        ) : null}

        {selectedSeason ? (
          <SeasonPhaseFilter
            active={phase}
            path={`/players/${profile.nhlPlayerId}`}
            params={{ season: selectedSeason.id, view, ...chartParams }}
          />
        ) : null}

        {view === "overview" ? (
          <>
            {!regularSkater &&
              !playoffSkater &&
              !regularGoalie &&
              !playoffGoalie &&
              career.length > 0 ? (
              <PlayerCareer
                rows={career}
                playerId={nhlPlayerId}
                phase={phase}
                selectedSeason={selectedSeason?.id}
              />
            ) : null}
            {regularSkater || playoffSkater ? (
              <section className="workspace-player-overview-block mt-8">
                <SectionTitle eyebrow="Selected season" title="Skater Totals" />
                <div className="mt-4">
                  <SkaterPanel
                    title={seasonPhaseLabel(phase)}
                    stats={phase === "playoffs" ? playoffSkater : regularSkater}
                  />
                </div>
              </section>
            ) : null}

            {regularGoalie || playoffGoalie ? (
              <section className="workspace-player-overview-block mt-8">
                <SectionTitle eyebrow="Selected season" title="Goalie Totals" />
                <div className="mt-4">
                  <GoaliePanel
                    title={seasonPhaseLabel(phase)}
                    stats={phase === "playoffs" ? playoffGoalie : regularGoalie}
                  />
                </div>
              </section>
            ) : null}

            <dl className="workspace-player-overview-block workspace-player-profile-facts mt-8">
              <ProfileStat
                label="Born"
                value={formatBirthDetails(
                  profile.birthDate,
                  profile.birthPlace,
                )}
              />
              <ProfileStat
                label="Size"
                value={
                  profile.heightInInches && profile.weightInPounds
                    ? `${formatHeight(profile.heightInInches)} · ${profile.weightInPounds} lb`
                    : "Unavailable"
                }
              />
              <ProfileStat
                label={profile.position === "G" ? "Catches" : "Shoots"}
                value={formatHandedness(profile.shootsCatches)}
              />
              <ProfileStat
                label="Draft"
                value={
                  profile.draftYear ? (
                    <Link href={`/drafts?view=board&year=${profile.draftYear}`}>
                      {formatDraft(profile)} →
                    </Link>
                  ) : (
                    formatDraft(profile)
                  )
                }
              />
            </dl>
            {selectedSeason &&
              seasons.some((season) => season.id === selectedSeason.id) ? (
              <Link
                href={`/players/${profile.nhlPlayerId}/games?season=${selectedSeason.id}&phase=${phase}`}
                className="workspace-secondary-action mt-5"
              >
                Detailed Game Log →
              </Link>
            ) : null}
          </>
        ) : null}

        {view === "trends" ? (
          <>
            {skaterPerformanceGames.length > 0 ||
              goaliePerformanceGames.length > 0 ? (
              <section className="workspace-width-standard mt-8">
                <SectionTitle
                  eyebrow="Rolling performance"
                  title="Player Form"
                  detail={`${seasonPhaseLabel(phase)} · rates update after every appearance`}
                />
                <div className="mt-5 grid gap-6">
                  {skaterPerformanceGames.length > 0 ? (
                    <PlayerRollingPerformanceChart
                      kind="skater"
                      games={skaterPerformanceGames}
                      playerName={profile.name}
                    />
                  ) : null}
                  {goaliePerformanceGames.length > 0 ? (
                    <PlayerRollingPerformanceChart
                      kind="goalie"
                      games={goaliePerformanceGames}
                      playerName={profile.name}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
            {skaterPerformanceGames.length === 0 &&
              goaliePerformanceGames.length === 0 ? (
              <div className="workspace-empty-state mt-8">
                No game-by-game performance is available for this selection.
              </div>
            ) : null}
          </>
        ) : null}

        {view === "advanced" ? (
          <>
            {advanced ? (
              <PlayerAdvancedAnalytics
                key={`${profile.nhlPlayerId}-${selectedSeason?.id}`}
                data={advanced}
              />
            ) : null}
            {phase === "playoffs" ? (
              <p className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--accent-secondary)_42%,var(--border))] bg-[var(--accent-secondary-soft)] p-5 text-sm text-[var(--foreground-soft)]">
                Player-level MoneyPuck playoff files are not available, so
                advanced skater and goalie panels remain regular-season only.
              </p>
            ) : null}
            {phase === "regular" && !advanced ? (
              <div className="workspace-empty-state mt-8">
                Advanced player data is not available for this selection.
              </div>
            ) : null}
          </>
        ) : null}

        {view === "seasons" ? (
          <PlayerCareer rows={career} playerId={nhlPlayerId} phase={phase} />
        ) : null}
      </section>
    </main>
  );
}
