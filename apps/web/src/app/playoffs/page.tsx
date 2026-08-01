import Link from "next/link";

import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogo, TeamLogoStack } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
import type { PlayoffRound, PlayoffSeries } from "@/contracts/playoffs";
import type { GoalieSeasonSummary } from "@/contracts/player";
import { parseSeasonId } from "@/contracts/season";
import { getGamesForSeasonByType } from "@/data/games";
import { getPlayoffScoringLeaders } from "@/data/playoffs";
import { listGoalieLeadersBySeason } from "@/data/players";
import { listSeasons } from "@/data/seasons";
import { getStandings } from "@/data/standings";
import { firstQueryValue } from "@/lib/directory";
import {
  buildActualBracket,
  buildProjectedBracket,
} from "@/lib/playoff-bracket";

export const dynamic = "force-dynamic";

type PlayoffView = "bracket" | "skaters" | "goalies";

type PlayoffsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
    view?: string | string[];
  }>;
};

export default async function PlayoffsPage({
  searchParams,
}: PlayoffsPageProps) {
  const params = await searchParams;
  const seasons = await listSeasons();
  const parsedSeason = parseSeasonId(firstQueryValue(params.season));
  const view = parsePlayoffView(firstQueryValue(params.view));
  const selectedSeason =
    seasons.find((season) => season.id === parsedSeason) ?? seasons[0];
  const [standings, games, leaders, goalieLeaders] = selectedSeason
    ? await Promise.all([
        view === "bracket"
          ? getStandings(selectedSeason.id)
          : Promise.resolve([]),
        view === "bracket"
          ? getGamesForSeasonByType(selectedSeason.id, 3)
          : Promise.resolve([]),
        view === "skaters"
          ? getPlayoffScoringLeaders(selectedSeason.id)
          : Promise.resolve([]),
        view === "goalies"
          ? listGoalieLeadersBySeason(selectedSeason.id, 25, 3)
          : Promise.resolve([]),
      ])
    : [[], [], [], []];
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
            view === "bracket"
              ? isProjection
                ? "Projected first-round matchups based on the selected season's current standings."
                : "The stored NHL postseason bracket and series results."
              : "Official stored NHL postseason leaders."
          }
          action={
            <SeasonPicker
              seasons={seasons}
              selectedSeasonId={selectedSeason?.id}
              params={{ view }}
            />
          }
        />

        {selectedSeason ? (
          <ViewTabs
            active={view}
            ariaLabel="Playoff views"
            tabs={[
              {
                id: "bracket",
                label: "Bracket",
                href: `/playoffs?season=${selectedSeason.id}&view=bracket`,
              },
              {
                id: "skaters",
                label: "Skater Leaders",
                href: `/playoffs?season=${selectedSeason.id}&view=skaters`,
              },
              {
                id: "goalies",
                label: "Goalie Leaders",
                href: `/playoffs?season=${selectedSeason.id}&view=goalies`,
              },
            ]}
          />
        ) : null}

        {selectedSeason ? (
          <>
            {view === "bracket" && standings.length > 0 ? (
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
            ) : null}

            {view === "bracket" && standings.length === 0 ? (
              <div className="workspace-empty-state mt-7">
                Standings are not available to build this playoff view.
              </div>
            ) : null}

            {view === "skaters" ? (
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
                            align="center"
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
                            <td
                              className="workspace-logo-cell"
                              data-sort-value={player.teamAbbreviation}
                            >
                              <span>
                                <TeamLogoStack
                                  abbreviations={player.teamAbbreviation}
                                />
                                {player.teamAbbreviation}
                              </span>
                            </td>
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
            ) : null}

            {view === "goalies" ? (
            <PlayoffGoalieLeaders
              goalies={goalieLeaders}
              seasonId={selectedSeason.id}
            />
            ) : null}
          </>
        ) : (
          <div className="workspace-empty-state">
            No playoff season is available.
          </div>
        )}
      </section>
    </main>
  );
}

function PlayoffGoalieLeaders({
  goalies,
  seasonId,
}: {
  goalies: GoalieSeasonSummary[];
  seasonId: number;
}) {
  return (
    <WorkspacePanel
      className="mt-7"
      title="Goalie Leaders"
      description="Official playoff goalie totals from stored season summaries."
    >
      {goalies.length > 0 ? (
        <SortableTable defaultSortKey="wins">
          <div className="workspace-table-scroll">
            <table className="workspace-table min-w-[820px]">
              <thead>
                <tr>
                  <SortableHeader
                    label="Goalie"
                    sortKey="name"
                    align="left"
                    defaultDirection="asc"
                  />
                  <SortableHeader
                    label="Team"
                    sortKey="team"
                    align="center"
                    defaultDirection="asc"
                  />
                  <SortableHeader label="GP" sortKey="games" />
                  <SortableHeader label="GS" sortKey="gamesStarted" />
                  <SortableHeader label="W" sortKey="wins" />
                  <SortableHeader label="L" sortKey="losses" />
                  <SortableHeader label="OTL" sortKey="overtimeLosses" />
                  <SortableHeader label="GA" sortKey="goalsAgainst" />
                  <SortableHeader label="SV" sortKey="saves" />
                  <SortableHeader label="SV%" sortKey="savePercentage" />
                </tr>
              </thead>
              <tbody>
                {goalies.map((goalie) => (
                  <tr key={goalie.nhlPlayerId}>
                    <td className="workspace-team-cell">
                      <Link
                        href={`/players/${goalie.nhlPlayerId}?season=${seasonId}&phase=playoffs`}
                      >
                        {goalie.name}
                      </Link>
                    </td>
                    <td
                      className="workspace-logo-cell"
                      data-sort-value={goalie.teams
                        .map((team) => team.abbreviation)
                        .join("/")}
                    >
                      <span>
                        <TeamLogoStack teams={goalie.teams} />
                        {goalie.teams
                          .map((team) => team.abbreviation)
                          .join("/")}
                      </span>
                    </td>
                    <NumberCell value={goalie.gamesPlayed} />
                    <NumberCell value={goalie.gamesStarted} />
                    <NumberCell value={goalie.wins} />
                    <NumberCell value={goalie.losses} />
                    <NumberCell value={goalie.overtimeLosses} />
                    <NumberCell value={goalie.goalsAgainst} />
                    <NumberCell value={goalie.saves} />
                    <td
                      className="workspace-points-cell"
                      data-sort-value={goalie.savePercentage ?? ""}
                    >
                      {formatSavePercentage(goalie.savePercentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SortableTable>
      ) : (
        <div className="workspace-empty-state compact">
          Playoff goalie leaders will appear after postseason games begin.
        </div>
      )}
    </WorkspacePanel>
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
  const firstRound = rounds.find((round) => round.round === 1)?.series ?? [];
  const secondRound = rounds.find((round) => round.round === 2)?.series ?? [];
  const conferenceFinals =
    rounds.find((round) => round.round === 3)?.series ?? [];
  const final = rounds.find((round) => round.round === 4)?.series ?? [];
  const stages = [
    {
      id: "western-first",
      name: "West First Round",
      series: firstRound.filter((series) => series.matchup >= 5),
    },
    {
      id: "western-second",
      name: "West Second Round",
      series: secondRound.filter((series) => series.matchup >= 3),
    },
    {
      id: "western-final",
      name: "West Final",
      series: conferenceFinals.filter((series) => series.matchup === 2),
    },
    { id: "stanley-cup-final", name: "Stanley Cup Final", series: final },
    {
      id: "eastern-final",
      name: "East Final",
      series: conferenceFinals.filter((series) => series.matchup === 1),
    },
    {
      id: "eastern-second",
      name: "East Second Round",
      series: secondRound.filter((series) => series.matchup <= 2),
    },
    {
      id: "eastern-first",
      name: "East First Round",
      series: firstRound.filter((series) => series.matchup <= 4),
    },
  ];

  return (
    <div className="workspace-bracket-scroll">
      <div className="workspace-bracket">
        {stages.map((stage) => (
          <section key={stage.id} className="workspace-bracket-round">
            <h3>{stage.name}</h3>
            <div>
              {stage.series.map((series) => (
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
          <small>{team.seedLabel ?? ""}</small>
          <TeamLogo
            nhlTeamId={team.nhlTeamId}
            abbreviation={team.abbreviation}
            name={team.name}
            size="tiny"
            decorative
            prominent
          />
          <Link
            href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
            aria-label={team.name}
            title={team.name}
          >
            {team.abbreviation}
          </Link>
          {showWins ? <strong>{wins}</strong> : null}
        </>
      ) : (
        <span className="workspace-bracket-tbd">To Be Determined</span>
      )}
    </div>
  );
}

function NumberCell({ value }: { value: number }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function parsePlayoffView(value: string | undefined): PlayoffView {
  return value === "skaters" || value === "goalies" ? value : "bracket";
}
