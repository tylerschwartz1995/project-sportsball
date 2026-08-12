import Link from "next/link";
import { unstable_cache } from "next/cache";

import {
  HomeLeagueTrends,
  HomeStandingsMovement,
} from "@/app/_components/homepage-insights";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { TeamGameRecord } from "@/app/_components/team-game-record";
import { TeamLogo, TeamLogoStack } from "@/app/_components/team-logo";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type { GameSummary } from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import {
  getLatestGamesForSeason,
  getRecentCompletedGames,
  getUpcomingGames,
} from "@/data/games";
import { listSkaterLeadersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
import {
  getStandings,
  getStandingsPointsHistory,
} from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";
import {
  buildLeagueTrendSummary,
  buildStandingsMovement,
} from "@/lib/homepage-insights";
import { formatPlayerPosition } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

const loadHomeSeasons = unstable_cache(listSeasons, ["home-seasons"], {
  revalidate: 3_600,
});

const loadHomeSeasonData = unstable_cache(
  async (seasonId: number) =>
    Promise.all([
      getStandings(seasonId),
      getStandingsPointsHistory(seasonId),
      listSkaterLeadersBySeason(seasonId, 5),
      getLatestGamesForSeason(seasonId),
      getRecentCompletedGames(seasonId),
      getUpcomingGames(6),
    ]),
  ["home-season-data"],
  { revalidate: 300 },
);

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await loadHomeSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [
    standings,
    standingsHistory,
    scoringLeaders,
    latestGames,
    recentGames,
    upcomingGames,
  ] = selectedSeason
    ? await loadHomeSeasonData(selectedSeason.id)
    : [[], [], [], [], [], []];

  const latestDate = latestGames[0]?.gameDate;
  const latestPhase = latestGames[0]?.gameType === 3 ? "playoffs" : "regular";
  const leagueLeader = standings[0];
  const standingsMovement = buildStandingsMovement(
    standings,
    standingsHistory,
  );
  const leagueTrends = buildLeagueTrendSummary(recentGames);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="home" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Overview"
          title={
            selectedSeason
              ? `${selectedSeason.label} NHL Overview`
              : "NHL Data Unavailable"
          }
          description="Results, standings, scoring leaders, and advanced analysis in one compact league overview."
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {selectedSeason && leagueLeader ? (
          <>
            <div className="workspace-home-primary mt-7">
              <WorkspacePanel
                title={latestDate ? `Results · ${formatDate(latestDate)}` : "Results"}
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
                title="Next Games"
                action={
                  <Link href={upcomingGames[0] ? `/games?season=${upcomingGames[0].seasonId}&date=${upcomingGames[0].gameDate}` : "/games"}>
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
                  <EmptyState message="No future games are currently stored." />
                )}
              </WorkspacePanel>

              <WorkspacePanel
                title="Standings"
                description="Top six in the final NHL snapshot"
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

            <div className="workspace-home-insights mt-5">
              <WorkspacePanel
                title="Standings Movement"
                description="Current top six and the exact points earned in each club's last 10 games, compared with its preceding 10."
                action={
                  <Link href={`/standings?season=${selectedSeason.id}`}>
                    Points history →
                  </Link>
                }
              >
                <HomeStandingsMovement
                  entries={standingsMovement}
                  seasonId={selectedSeason.id}
                />
              </WorkspacePanel>
              <WorkspacePanel
                title="League Trends"
                description="Latest 30 completed regular-season games versus the preceding 30, calculated from stored results."
                action={
                  <Link href={`/games?season=${selectedSeason.id}`}>
                    All results →
                  </Link>
                }
              >
                <HomeLeagueTrends
                  summary={leagueTrends}
                  seasonId={selectedSeason.id}
                />
              </WorkspacePanel>
            </div>

            <WorkspacePanel
              className="mt-5"
              title="Scoring Leaders"
              action={
                <Link href={`/players?season=${selectedSeason.id}`}>
                  All Players →
                </Link>
              }
            >
              <div className="workspace-leader-grid">
                {scoringLeaders.map((player, index) => (
                  <Link
                    key={player.nhlPlayerId}
                    href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                  >
                    <span>#{index + 1}</span>
                    <b className="flex items-center gap-2">
                      <TeamLogoStack teams={player.teams} />
                      {player.name}
                    </b>
                    <small>
                      {formatPlayerPosition(player.position, "Skater")} ·{" "}
                      {player.gamesPlayed} GP
                    </small>
                    <strong>{player.points} PTS</strong>
                  </Link>
                ))}
              </div>
            </WorkspacePanel>

            {selectedSeason.id >= 20082009 ? (
              <Link
                href={`/analytics?season=${selectedSeason.id}`}
                className="workspace-analytics-link"
              >
                <span>
                  <b>Advanced Analytics</b>
                  <small>
                    xG, possession, game score, GSAx, lines, and pairings
                  </small>
                </span>
                Open analytics →
              </Link>
            ) : null}

            <WorkspacePanel
              className="mt-5"
              title="Explore the NHL Archive"
            >
              <nav className="workspace-home-explore" aria-label="Explore Sportsball">
                <HomeDestination href="/history" title="Historical Leaders" detail="Career records and best seasons since 1917–18" />
                <HomeDestination href={`/playoffs?season=${selectedSeason.id}`} title="Playoffs" detail="Bracket, projected matchups, and postseason leaders" />
                <HomeDestination href="/drafts" title="Draft History" detail="Complete boards and team drafting performance" />
                <HomeDestination href={`/players/compare?season=${selectedSeason.id}`} title="Compare Players" detail="Official and advanced metrics side by side" />
              </nav>
            </WorkspacePanel>
          </>
        ) : (
          <EmptyState message="The selected season does not have a complete dashboard yet." />
        )}
      </section>
    </main>
  );
}

function UpcomingGame({ game }: { game: GameSummary }) {
  return (
    <Link href={`/games/${game.nhlGameId}`}>
      <time dateTime={game.startTimeUtc}>{formatUpcomingTime(game.startTimeUtc)}</time>
      <span className="inline-flex items-center gap-1.5">
        <TeamLogo {...game.awayTeam} size="tiny" decorative />
        <b>{game.awayTeam.abbreviation}</b>
        <TeamGameRecord record={game.awayTeam.record} />
        at
        <TeamLogo {...game.homeTeam} size="tiny" decorative />
        <b>{game.homeTeam.abbreviation}</b>
        <TeamGameRecord record={game.homeTeam.record} />
      </span>
      <small>{game.gameType === 3 ? "Playoffs" : formatSeason(game.seasonId)}</small>
    </Link>
  );
}

function HomeDestination({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href}><span><b>{title}</b><small>{detail}</small></span><strong>Explore →</strong></Link>;
}

function GameResult({ game }: { game: GameSummary }) {
  return (
    <Link href={`/games/${game.nhlGameId}`} className="workspace-result-row">
      <span className="workspace-result-status">
        <small>{game.gameType === 3 ? "Playoffs" : "Regular"}</small>
        <b>{finalLabel(game.lastPeriodType)}</b>
      </span>
      <span className="workspace-result-matchup">
        <span>
          <TeamLogo {...game.awayTeam} size="tiny" decorative />
          <b>{game.awayTeam.abbreviation}</b>
          <strong>{game.awayTeam.score ?? "—"}</strong>
        </span>
        <span aria-hidden="true">–</span>
        <span>
          <strong>{game.homeTeam.score ?? "—"}</strong>
          <b>{game.homeTeam.abbreviation}</b>
          <TeamLogo {...game.homeTeam} size="tiny" decorative />
        </span>
      </span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="workspace-empty-state">{message}</div>;
}

function formatRecord(team: StandingsEntry): string {
  return `${team.wins}-${team.losses}-${team.overtimeLosses}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function finalLabel(lastPeriodType: string | null): string {
  return lastPeriodType && lastPeriodType !== "REG"
    ? `Final · ${lastPeriodType}`
    : "Final";
}

function formatUpcomingTime(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatSeason(seasonId: number): string {
  return `${Math.floor(seasonId / 10_000)}–${String(seasonId % 10_000).slice(-2)}`;
}
