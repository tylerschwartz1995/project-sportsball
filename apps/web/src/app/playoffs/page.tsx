import Link from "next/link";

import { PlayoffBracket } from "@/app/_components/playoff-bracket";
import { SeasonPicker } from "@/app/_components/season-picker";
import { SiteHeader } from "@/app/_components/site-header";
import { SortableHeader } from "@/app/_components/sortable-header";
import { SortableTable } from "@/app/_components/sortable-table";
import { TeamLogoStack } from "@/app/_components/team-logo";
import { ViewTabs } from "@/app/_components/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/app/_components/workspace-primitives";
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
            width={
              view === "skaters" || view === "goalies"
                ? "compact"
                : "wide"
            }
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
              width="compact"
              title="Leading Scorers"
              description="Official playoff scoring totals from stored box scores."
            >
              {leaders.length > 0 ? (
                <SortableTable defaultSortKey="points">
                  <div className="workspace-table-scroll">
                    <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[680px]">
                      <colgroup>
                        <col className="workspace-col-entity" />
                        <col className="workspace-col-team" />
                        <col className="workspace-col-number" span={4} />
                      </colgroup>
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
      width="compact"
      title="Goalie Leaders"
      description="Official playoff goalie totals from stored season summaries."
    >
      {goalies.length > 0 ? (
        <SortableTable defaultSortKey="wins">
          <div className="workspace-table-scroll">
            <table className="workspace-table workspace-table-dense workspace-table-semantic min-w-[820px]">
              <colgroup>
                <col className="workspace-col-entity" />
                <col className="workspace-col-team" />
                <col className="workspace-col-stat" span={7} />
                <col className="workspace-col-percentage" />
              </colgroup>
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

function NumberCell({ value }: { value: number }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function formatSavePercentage(value: number | null): string {
  return value === null ? "—" : value.toFixed(3).replace(/^0/, "");
}

function parsePlayoffView(value: string | undefined): PlayoffView {
  return value === "skaters" || value === "goalies" ? value : "bracket";
}
