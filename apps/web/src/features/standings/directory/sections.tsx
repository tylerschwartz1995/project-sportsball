import { TableScroll } from "@/components/ui/table-scroll";
import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import {
  WorkspacePanel
} from "@/components/ui/workspace-primitives";
import type { StandingsEntry, StandingsRecord } from "@/contracts/standings";
import { TeamTableLink } from "@/features/teams/team-table-link";
import { StandingsView, rankForView, standingsColumns } from './logic';

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
      title={view === "overall" ? undefined : label}
      className="standings-panel"
      width="standard"
    >
      <SortableTable secondaryColumns={[10, 11]}
        defaultSortKey={defaultSortKey}
        defaultDirection={defaultDirection}
      >
        <TableScroll className="workspace-table-scroll">
          <table className="modern-table-readable workspace-table workspace-table-dense workspace-table-semantic workspace-standings-table min-w-[900px]">
            <colgroup>
              <col className="workspace-col-rank" />
              <col className="workspace-col-entity" />
              <col className="workspace-col-number" />
              <col className="workspace-col-stat" span={6} />
              <col span={2} />
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
                    description={column.key === "home" || column.key === "away" ? "W–L–OTL; sorted by points percentage for this venue." : undefined}
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
                  <td className="workspace-sticky-entity px-4 py-3">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <TeamTableLink
                        team={{
                          id: team.teamId,
                          nhlTeamId: team.nhlTeamId,
                          franchiseId: null,
                          abbreviation: team.teamAbbreviation,
                          name: team.teamName,
                        }}
                        href={`/teams/${team.nhlTeamId}?season=${seasonId}`}
                      />
                      {team.clinchIndicator ? (
                        <span className="workspace-clinch-indicator">
                          {team.clinchIndicator}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <NumericCell value={team.gamesPlayed} />
                  <NumericCell value={team.wins} />
                  <NumericCell value={team.losses} />
                  <NumericCell value={team.overtimeLosses} />
                  <NumericCell value={team.points} />
                  <NumericCell value={team.pointPercentage == null ? "—" : `${(team.pointPercentage * 100).toFixed(1)}%`} />
                  <NumericCell value={team.regulationWins} />
                  <RecordCell record={team.homeRecord} />
                  <RecordCell record={team.awayRecord} />
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

      </SortableTable>
    </WorkspacePanel>
  );
}

export function NumericCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}

function RecordCell({ record }: { record?: StandingsRecord | null }) {
  const games = record ? record.wins + record.losses + record.overtimeLosses : 0;
  return <td className="workspace-number-cell whitespace-nowrap" data-sort-value={record && games ? (record.wins * 2 + record.overtimeLosses) / (games * 2) : ""}>
    {record ? `${record.wins}–${record.losses}–${record.overtimeLosses}` : "—"}
  </td>;
}
