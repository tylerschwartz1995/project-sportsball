import Link from "next/link";
import { unstable_cache } from "next/cache";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
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
  getUpcomingGames,
} from "@/data/games";
import { listSkaterLeadersBySeason } from "@/data/players";
import { listCachedSeasons } from "@/data/page-cache";
import { getStandings } from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";
import { formatPlayerPosition } from "@/lib/player-position";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

const loadHomeSeasonData = unstable_cache(
  async (seasonId: number) =>
    Promise.all([
      getStandings(seasonId),
      listSkaterLeadersBySeason(seasonId, 5),
      getLatestGamesForSeason(seasonId),
    ]),
  ["home-season-data"],
  { revalidate: 300 },
);

const loadHomeUpcomingGames = unstable_cache(
  () => getUpcomingGames(6),
  ["home-upcoming-games"],
  { revalidate: 300 },
);

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listCachedSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [seasonData, upcomingGames] = selectedSeason
    ? await Promise.all([
        loadHomeSeasonData(selectedSeason.id),
        loadHomeUpcomingGames(),
      ])
    : [[[], [], []], await loadHomeUpcomingGames()];
  const [
    standings,
    scoringLeaders,
    latestGames,
  ] = seasonData;

  const latestDate = latestGames[0]?.gameDate;
  const latestPhase = latestGames[0]?.gameType === 3 ? "playoffs" : "regular";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl modern-home px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="home" />

      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow=""
          title={
            selectedSeason
              ? "NHL Overview"
              : "NHL Data Unavailable"
          }
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
                title="Upcoming Games"
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

            <div className="mt-5">
              <WorkspacePanel
                className="modern-scoring"
                title="Scoring Leaders"
                description="Regular season"
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

            </div>
          </>
        ) : (
          <>
            <EmptyState message="Season statistics are not available yet." />
            {upcomingGames.length > 0 ? (
              <WorkspacePanel title="Upcoming Games" className="mt-5">
                <div className="workspace-upcoming-list">
                  {upcomingGames.map(game => <UpcomingGame key={game.nhlGameId} game={game} />)}
                </div>
              </WorkspacePanel>
            ) : null}
          </>
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
        at
        <TeamLogo {...game.homeTeam} size="tiny" decorative />
        <b>{game.homeTeam.abbreviation}</b>
      </span>
      <small>{game.gameType === 3 ? "Playoffs" : formatSeason(game.seasonId)}</small>
    </Link>
  );
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
