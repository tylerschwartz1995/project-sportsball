import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-primitives";
import { SeasonPicker } from "@/features/league/season-picker";
import { HomePlayerLeaders } from "@/features/players/home-player-leaders";
import { TeamLogo } from "@/features/teams/team-logo";
import type { loadHome } from './loader';
import { formatDate, formatRecord } from './logic';
import { EmptyState, GameResult, UpcomingGame } from './sections';
export function HomeView({
  latestGames,
  upcomingGames,
  standings,
  scoringLeaders,
  advancedSkaters,
  advancedGoalies,
  selectedSeason,
  seasons,
  latestDate,
  latestPhase,
}: Awaited<ReturnType<typeof loadHome>>) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl modern-home px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="home" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow=""
          title={selectedSeason ? "NHL Overview" : "NHL Data Unavailable"}
          description=""
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {selectedSeason ? (
          <>
            <div className="workspace-home-primary mt-7">
              <WorkspacePanel
                title={
                  latestDate ? `Results · ${formatDate(latestDate)}` : "Results"
                }
                action={
                  <Link
                    href={
                      latestDate
                        ? `/games?season=${selectedSeason.id}&phase=${latestPhase}&date=${latestDate}`
                        : `/games?season=${selectedSeason.id}&phase=regular`
                    }
                  >
                    All Games →
                  </Link>
                }
              >
                {latestGames.length > 0 ? (
                  <div className="workspace-result-list">
                    {latestGames.slice(0, 5).map((game) => (
                      <GameResult key={game.id} game={game} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No games are available for this season." />
                )}
              </WorkspacePanel>

              <WorkspacePanel
                title={`Upcoming Games${upcomingGames[0] ? ` · ${Math.floor(upcomingGames[0].seasonId / 10000)}–${String(upcomingGames[0].seasonId % 10000).slice(-2)}` : ""}`}
                action={
                  <Link
                    href={
                      upcomingGames[0]
                        ? `/games?season=${upcomingGames[0].seasonId}&date=${upcomingGames[0].gameDate}`
                        : "/games"
                    }
                  >
                    Full Schedule →
                  </Link>
                }
              >
                {upcomingGames.length > 0 ? (
                  <div className="workspace-upcoming-list">
                    {upcomingGames.map((game) => (
                      <UpcomingGame key={game.nhlGameId} game={game} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No upcoming games are currently available." />
                )}
              </WorkspacePanel>

              <WorkspacePanel
                title="Standings"
                description="Regular season · Top six by points"
                action={
                  <Link href={`/standings?season=${selectedSeason.id}`}>
                    Full Table →
                  </Link>
                }
              >
                <div className="workspace-standing-list">
                  {standings.slice(0, 6).map((team) => (
                    <Link
                      key={team.teamId}
                      href={`/teams/${team.nhlTeamId}?season=${selectedSeason.id}`}
                    >
                      <span>{team.leagueRank}</span>
                      <TeamLogo
                        nhlTeamId={team.nhlTeamId}
                        abbreviation={team.teamAbbreviation}
                        name={team.teamName}
                        size="tiny"
                        decorative
                      />
                      <b>{team.teamName}</b>
                      <small>{formatRecord(team)}</small>
                      <strong>{team.points}</strong>
                    </Link>
                  ))}
                </div>
              </WorkspacePanel>
            </div>

            <HomePlayerLeaders
              seasonId={selectedSeason.id}
              scoring={scoringLeaders}
              skaters={advancedSkaters}
              goalies={advancedGoalies}
            />
          </>
        ) : (
          <>
            <EmptyState message="Season statistics are not available yet." />
            {upcomingGames.length > 0 ? (
              <WorkspacePanel title="Upcoming Games" className="mt-5">
                <div className="workspace-upcoming-list">
                  {upcomingGames.map((game) => (
                    <UpcomingGame key={game.nhlGameId} game={game} />
                  ))}
                </div>
              </WorkspacePanel>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
