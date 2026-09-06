import { NavigationComplete } from "@/components/shell/navigation-metrics";
import { SiteHeader } from "@/components/shell/site-header";
import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { ViewTabs } from "@/components/ui/view-tabs";
import {
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/ui/workspace-primitives";
import { SeasonPicker } from "@/features/league/season-picker";
import { PlayoffBracket } from "@/features/playoffs/playoff-bracket";
import { TeamLogoStack } from "@/features/teams/team-logo";
import type { loadPlayoffsPage } from './loader';
import { NumberCell, PlayoffGoalieLeaders } from './sections';
export function PlayoffsPageView({
  standings,
  leaders,
  goalieLeaders,
  selectedSeason,
  view,
  isProjection,
  seasons,
  rounds,
}: Awaited<ReturnType<typeof loadPlayoffsPage>>) {
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
                : "The NHL postseason bracket and completed series results."
              : "Official NHL postseason leaders."
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
            label="Playoff view"
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
                    : "Each series updates as playoff results become available."
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
                description="Official playoff scoring totals from completed box scores."
              >
                {leaders.length > 0 ? (
                  <SortableTable defaultSortKey="points">
                    <div className="workspace-table-scroll">
                      <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic min-w-[680px]">
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
    <NavigationComplete />
    </main>
  );
}
