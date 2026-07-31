import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type { PlayoffRound, PlayoffSeries } from "@/contracts/playoffs";
import { parseSeasonId } from "@/contracts/season";
import { getGamesForSeasonByType } from "@/data/games";
import { getPlayoffScoringLeaders } from "@/data/playoffs";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";
import {
  buildActualBracket,
  buildProjectedBracket,
} from "@/lib/playoff-bracket";

export const dynamic = "force-dynamic";

type PlayoffsPageProps = {
  searchParams: Promise<{ season?: string | string[] }>;
};

export default async function PlayoffsPage({
  searchParams,
}: PlayoffsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, games, leaders] = selectedSeason
    ? await Promise.all([
        getStandings(selectedSeason.id),
        getGamesForSeasonByType(selectedSeason.id, 3),
        getPlayoffScoringLeaders(selectedSeason.id),
      ])
    : [[], [], []];
  const isProjection = !games.some(
    (game) =>
      game.homeTeam.score !== null &&
      game.awayTeam.score !== null,
  );
  const rounds = isProjection
    ? buildProjectedBracket(standings)
    : buildActualBracket(games);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <SiteHeader active="playoffs" />
      <section className="py-8 sm:py-10">
        <WorkspacePageHeader
          eyebrow="League / Postseason"
          title={`${selectedSeason?.label ?? "No Season"} Playoffs`}
          description={
            isProjection
              ? "Projected first-round matchups based on the selected season's current standings."
              : "The stored NHL postseason bracket, series results, and leading scorers."
          }
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
            />
          }
        />

        {selectedSeason && standings.length > 0 ? (
          <>
            <WorkspacePanel
              className="mt-7"
              title={isProjection ? "Projected Bracket" : "Playoff Bracket"}
              description={
                isProjection
                  ? "The projection uses NHL division-winner and wildcard seeding. Later rounds remain open until series are played."
                  : "Series wins update from the stored playoff game results."
              }
            >
              <PlayoffBracket
                rounds={rounds}
                seasonId={selectedSeason.id}
                isProjection={isProjection}
              />
            </WorkspacePanel>

            <WorkspacePanel
              className="mt-7"
              title="Leading Scorers"
              description="Official playoff scoring totals from stored box scores."
            >
              {leaders.length > 0 ? (
                <SortableTable defaultSortKey="points">
                  <div className="workspace-table-scroll">
                    <table className="workspace-table min-w-[680px]">
                      <thead>
                        <tr>
                          <SortableHeader
                            label="Player"
                            sortKey="name"
                            align="left"
                            defaultDirection="asc"
                          />
                          <SortableHeader
                            label="Team"
                            sortKey="team"
                            align="left"
                            defaultDirection="asc"
                          />
                          <SortableHeader label="GP" sortKey="games" />
                          <SortableHeader label="G" sortKey="goals" />
                          <SortableHeader label="A" sortKey="assists" />
                          <SortableHeader label="PTS" sortKey="points" />
                        </tr>
                      </thead>
                      <tbody>
                        {leaders.map((player) => (
                          <tr key={player.nhlPlayerId}>
                            <td className="workspace-team-cell">
                              <Link
                                href={`/players/${player.nhlPlayerId}?season=${selectedSeason.id}&phase=playoffs`}
                              >
                                {player.name}
                              </Link>
                            </td>
                            <td>{player.teamAbbreviation}</td>
                            <NumberCell value={player.gamesPlayed} />
                            <NumberCell value={player.goals} />
                            <NumberCell value={player.assists} />
                            <td className="workspace-points-cell">
                              {player.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SortableTable>
              ) : (
                <div className="workspace-empty-state compact">
                  Playoff scoring leaders will appear after postseason games
                  begin.
                </div>
              )}
            </WorkspacePanel>
          </>
        ) : (
          <div className="workspace-empty-state">
            Standings are not available to build this playoff view.
          </div>
        )}
      </section>
    </main>
  );
}

function PlayoffBracket({
  rounds,
  seasonId,
  isProjection,
}: {
  rounds: PlayoffRound[];
  seasonId: number;
  isProjection: boolean;
}) {
  return (
    <div className="workspace-bracket-scroll">
      <div className="workspace-bracket">
        {rounds.map((round) => (
          <section key={round.round} className="workspace-bracket-round">
            <h3>{round.name}</h3>
            <div>
              {round.series.map((series) => (
                <Series
                  key={series.id}
                  series={series}
                  seasonId={seasonId}
                  isProjection={isProjection}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Series({
  series,
  seasonId,
  isProjection,
}: {
  series: PlayoffSeries;
  seasonId: number;
  isProjection: boolean;
}) {
  const empty = !series.teamOne && !series.teamTwo;
  return (
    <article
      className={`workspace-bracket-series ${empty ? "is-empty" : ""}`}
    >
      <BracketTeam
        team={series.teamOne}
        wins={series.teamOneWins}
        winner={series.winnerNhlTeamId === series.teamOne?.nhlTeamId}
        seasonId={seasonId}
        showWins={!isProjection}
      />
      <BracketTeam
        team={series.teamTwo}
        wins={series.teamTwoWins}
        winner={series.winnerNhlTeamId === series.teamTwo?.nhlTeamId}
        seasonId={seasonId}
        showWins={!isProjection}
      />
    </article>
  );
}

function BracketTeam({
  team,
  wins,
  winner,
  seasonId,
  showWins,
}: {
  team: PlayoffSeries["teamOne"];
  wins: number;
  winner: boolean;
  seasonId: number;
  showWins: boolean;
}) {
  return (
    <div className={winner ? "is-winner" : ""}>
      {team ? (
        <>
          <small>{team.seedLabel ?? team.abbreviation}</small>
          <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
            {team.name}
          </Link>
          {showWins ? <strong>{wins}</strong> : null}
        </>
      ) : (
        <span>To Be Determined</span>
      )}
    </div>
  );
}

function NumberCell({ value }: { value: number }) {
  return <td className="workspace-number-cell">{value}</td>;
}
