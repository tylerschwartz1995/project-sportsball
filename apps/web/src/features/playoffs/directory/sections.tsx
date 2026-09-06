import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePanel
} from "@/components/ui/workspace-primitives";
import type { GoalieSeasonSummary } from "@/contracts/player";
import { TeamLogoStack } from "@/features/teams/team-logo";
import { formatSavePercentage } from './logic';

export function PlayoffGoalieLeaders({
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
      description="Official playoff goalie totals for the selected season."
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

export function NumberCell({ value }: { value: number }) {
  return <td className="workspace-number-cell">{value}</td>;
}
