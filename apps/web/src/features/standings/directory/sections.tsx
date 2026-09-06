import Link from "@/components/ui/exploration-link";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePanel
} from "@/components/ui/workspace-primitives";
import type { StandingsEntry } from "@/contracts/standings";
import { TeamLogo } from "@/features/teams/team-logo";
import { StandingsView, formatDifferential, rankForView, standingsColumns } from './logic';

export function StandingsTable({
  label,
  standings,
  defaultSortKey,
  defaultDirection,
  view,
  seasonId,
}: {
  label: string;
  standings: StandingsEntry[];
  defaultSortKey: string;
  defaultDirection: "asc" | "desc";
  view: StandingsView;
  seasonId: number;
}) {
  return (
    <WorkspacePanel
      title={label}
      width="standard"
    >
      <SortableTable secondaryColumns={[7, 8, 9, 10]}
        defaultSortKey={defaultSortKey}
        defaultDirection={defaultDirection}
      >
        <div className="workspace-table-scroll">
          <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic workspace-standings-table min-w-[900px]">
            <colgroup>
              <col className="workspace-col-rank" />
              <col className="workspace-col-entity" />
              <col className="workspace-col-stat" span={7} />
              <col className="workspace-col-differential" />
              <col className="workspace-col-number" />
            </colgroup>
            <thead>
              <tr>
                {standingsColumns.map((column) => (
                  <SortableHeader
                    key={column.key}
                    label={column.label}
                    sortKey={column.key}
                    align={column.align}
                    defaultDirection={column.defaultDirection}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr key={team.teamId}>
                  <td className="workspace-rank-cell">
                    {rankForView(team, view)}
                  </td>
                  <td className="workspace-team-cell">
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        nhlTeamId={team.nhlTeamId}
                        abbreviation={team.teamAbbreviation}
                        name={team.teamName}
                        size="tiny"
                        decorative
                      />
                      <div>
                        <Link href={`/teams/${team.nhlTeamId}?season=${seasonId}`}>
                          {team.teamName}
                        </Link>
                        <small>
                          <span>
                            {team.teamAbbreviation}
                          </span>
                          {team.clinchIndicator ? (
                            <span className="workspace-clinch-indicator">
                              {team.clinchIndicator}
                            </span>
                          ) : null}
                        </small>
                      </div>
                    </div>
                  </td>
                  <NumericCell value={team.gamesPlayed} />
                  <NumericCell value={team.wins} />
                  <NumericCell value={team.losses} />
                  <NumericCell value={team.overtimeLosses} />
                  <NumericCell value={team.regulationWins} />
                  <NumericCell value={team.goalsFor} />
                  <NumericCell value={team.goalsAgainst} />
                  <NumericCell
                    value={formatDifferential(team.goalDifferential)}
                  />
                  <td className="workspace-points-cell">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </SortableTable>
    </WorkspacePanel>
  );
}

export function NumericCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}
