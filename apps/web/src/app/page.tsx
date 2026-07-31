import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type { GameSummary } from "@/contracts/game";
import { parseSeasonId } from "@/contracts/season";
import type { StandingsEntry } from "@/contracts/standings";
import { getLatestGamesForSeason } from "@/data/games";
import { listPlayersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, players, latestGames] = selectedSeason
    ? await Promise.all([
        getStandings(selectedSeason.id),
        listPlayersBySeason(selectedSeason.id),
        getLatestGamesForSeason(selectedSeason.id),
      ])
    : [[], { seasonId: 0, skaters: [], goalies: [] }, []];

  const latestDate = latestGames[0]?.gameDate;
  const leagueLeader = standings[0];

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
            <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <WorkspacePanel
                title={latestDate ? `Results · ${formatDate(latestDate)}` : "Results"}
                description="Most recent stored game date"
                action={
                  <Link
                    href={
                      latestDate
                        ? `/games?season=${selectedSeason.id}&date=${latestDate}`
                        : `/games?season=${selectedSeason.id}`
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
                      <b>{team.teamName}</b>
                      <small>{formatRecord(team)}</small>
                      <strong>{team.points}</strong>
                    </Link>
                  ))}
                </div>
              </WorkspacePanel>
            </div>

            <WorkspacePanel
              className="mt-5"
              title="Scoring Leaders"
              description="Regular-season points leaders"
              action={
                <Link href={`/players?season=${selectedSeason.id}`}>
                  All Players →
                </Link>
              }
            >
              <div className="workspace-leader-grid">
                {players.skaters.slice(0, 5).map((player, index) => (
                  <Link
                    key={player.nhlPlayerId}
                    href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}`}
                  >
                    <span>#{index + 1}</span>
                    <b>{player.name}</b>
                    <small>
                      {player.position ?? "Skater"} · {player.gamesPlayed} GP
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
          </>
        ) : (
          <EmptyState message="The selected season does not have a complete dashboard yet." />
        )}
      </section>
    </main>
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
          <b>{game.awayTeam.abbreviation}</b>
          <strong>{game.awayTeam.score ?? "—"}</strong>
        </span>
        <span aria-hidden="true">–</span>
        <span>
          <strong>{game.homeTeam.score ?? "—"}</strong>
          <b>{game.homeTeam.abbreviation}</b>
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
