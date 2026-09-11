"use client";
import { TableScroll } from "@/components/ui/table-scroll";

import { SortableHeader } from "@/components/ui/sortable-header";
import { SortableTable } from "@/components/ui/sortable-table";
import type {
  PlayoffSeriesAdvancedGoalieStats,
  PlayoffSeriesAdvancedSkaterStats,
  PlayoffSeriesGoalieStats,
  PlayoffSeriesSkaterStats
} from "@/contracts/playoffs";
import { formatPlayerPosition } from "@/lib/player-position";
import { SeriesEmptyState, SeriesNumberCell, SeriesPlayerCell } from './cells';
import { formatDistance, formatPercentage, formatSavePercentage, formatSignedDecimal, formatTimeOnIce } from './logic';
export function SeriesSkaterTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesSkaterStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No skater totals are available.</SeriesEmptyState>;
  return (
    <SortableTable
      defaultSortKey="points"
      className="workspace-series-table-region"
    >
      <TableScroll className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[920px]">
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="player" align="left" />
              <SortableHeader label="Pos" sortKey="position" description="Position" />
              <SortableHeader label="GP" sortKey="games" description="Games played" />
              <SortableHeader label="G" sortKey="goals" description="Goals" />
              <SortableHeader label="A" sortKey="assists" description="Assists" />
              <SortableHeader label="PTS" sortKey="points" description="Points" />
              <SortableHeader label="+/-" sortKey="plusMinus" description="Plus/minus" />
              <SortableHeader label="PIM" sortKey="penaltyMinutes" description="Penalty minutes" />
              <SortableHeader label="SOG" sortKey="shots" description="Shots on goal" />
              <SortableHeader label="HIT" sortKey="hits" description="Hits" />
              <SortableHeader label="BLK" sortKey="blocks" description="Blocked shots" />
              <SortableHeader label="TOI" sortKey="timeOnIce" description="Total time on ice" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.position}>
                  {formatPlayerPosition(player.position)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.gamesPlayed} />
                <SeriesNumberCell value={player.goals} />
                <SeriesNumberCell value={player.assists} />
                <SeriesNumberCell value={player.points} highlight />
                <SeriesNumberCell value={player.plusMinus} signed />
                <SeriesNumberCell value={player.penaltyMinutes} />
                <SeriesNumberCell value={player.shotsOnGoal} />
                <SeriesNumberCell value={player.hits} />
                <SeriesNumberCell value={player.blockedShots} />
                <SeriesNumberCell value={player.timeOnIceSeconds}>
                  {formatTimeOnIce(player.timeOnIceSeconds)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </SortableTable>
  );
}

export function SeriesGoalieTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesGoalieStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No goalie totals are available.</SeriesEmptyState>;
  return (
    <SortableTable
      defaultSortKey="wins"
      className="workspace-series-table-region"
    >
      <TableScroll className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[760px]">
          <thead>
            <tr>
              <SortableHeader label="Goalie" sortKey="player" align="left" />
              <SortableHeader label="GP" sortKey="games" description="Games played" />
              <SortableHeader label="GS" sortKey="starts" description="Games started" />
              <SortableHeader label="W" sortKey="wins" description="Wins" />
              <SortableHeader label="L" sortKey="losses" description="Losses" />
              <SortableHeader label="GA" sortKey="goalsAgainst" description="Goals against" />
              <SortableHeader label="SA" sortKey="shotsAgainst" description="Shots against" />
              <SortableHeader label="SV" sortKey="saves" description="Saves" />
              <SortableHeader label="SV%" sortKey="savePercentage" description="Save percentage" />
              <SortableHeader label="TOI" sortKey="timeOnIce" description="Total time on ice" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.gamesPlayed} />
                <SeriesNumberCell value={player.gamesStarted} />
                <SeriesNumberCell value={player.wins} highlight />
                <SeriesNumberCell value={player.losses} />
                <SeriesNumberCell value={player.goalsAgainst} />
                <SeriesNumberCell value={player.shotsAgainst} />
                <SeriesNumberCell value={player.saves} />
                <SeriesNumberCell value={player.savePercentage}>
                  {formatSavePercentage(player.savePercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.timeOnIceSeconds}>
                  {formatTimeOnIce(player.timeOnIceSeconds)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </SortableTable>
  );
}

export function SeriesAdvancedSkaterTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesAdvancedSkaterStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No modeled skater shots are available.</SeriesEmptyState>;
  return (
    <SortableTable
      defaultSortKey="expectedGoals"
      className="workspace-series-table-region"
    >
      <TableScroll className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[850px]">
          <thead>
            <tr>
              <SortableHeader label="Player" sortKey="player" align="left" />
              <SortableHeader label="xG" sortKey="expectedGoals" description="Individual expected goals" />
              <SortableHeader label="G" sortKey="goals" />
              <SortableHeader label="G-xG" sortKey="goalsAboveExpected" description="Goals scored above expected" />
              <SortableHeader label="SOG" sortKey="shotsOnGoal" description="Shots on goal" />
              <SortableHeader label="ATT" sortKey="attempts" description="Shot attempts" />
              <SortableHeader label="SH%" sortKey="shootingPercentage" description="Shooting percentage" />
              <SortableHeader label="Rush" sortKey="rushAttempts" description="Rush shot attempts" />
              <SortableHeader label="REB" sortKey="reboundAttempts" description="Rebound attempts" />
              <SortableHeader label="Avg Dist" sortKey="averageDistance" description="Average shot distance" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.expectedGoals} highlight>
                  {player.expectedGoals.toFixed(2)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.goals} />
                <SeriesNumberCell value={player.goalsAboveExpected} signed>
                  {formatSignedDecimal(player.goalsAboveExpected)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.shotsOnGoal} />
                <SeriesNumberCell value={player.shotAttempts} />
                <SeriesNumberCell value={player.shootingPercentage}>
                  {formatPercentage(player.shootingPercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.rushAttempts} />
                <SeriesNumberCell value={player.reboundAttempts} />
                <SeriesNumberCell value={player.averageShotDistance}>
                  {formatDistance(player.averageShotDistance)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </SortableTable>
  );
}

export function SeriesAdvancedGoalieTable({
  players,
  seasonId,
}: {
  players: PlayoffSeriesAdvancedGoalieStats[];
  seasonId: number;
}) {
  if (players.length === 0) return <SeriesEmptyState>No modeled goalie shots are available.</SeriesEmptyState>;
  return (
    <SortableTable
      defaultSortKey="goalsSavedAboveExpected"
      className="workspace-series-table-region"
    >
      <TableScroll className="workspace-series-table-scroll">
        <table className="workspace-series-table min-w-[720px]">
          <thead>
            <tr>
              <SortableHeader label="Goalie" sortKey="player" align="left" />
              <SortableHeader label="SA" sortKey="shotsAgainst" description="Shots against" />
              <SortableHeader label="GA" sortKey="goalsAgainst" description="Goals against" />
              <SortableHeader label="xGA" sortKey="expectedGoalsAgainst" description="Expected goals against" />
              <SortableHeader label="GSAx" sortKey="goalsSavedAboveExpected" description="Goals saved above expected" />
              <SortableHeader label="SV" sortKey="saves" description="Saves" />
              <SortableHeader label="SV%" sortKey="savePercentage" description="Save percentage" />
              <SortableHeader label="xSV%" sortKey="expectedSavePercentage" description="Expected save percentage" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.nhlPlayerId}>
                <SeriesPlayerCell player={player} seasonId={seasonId} />
                <SeriesNumberCell value={player.shotsAgainst} />
                <SeriesNumberCell value={player.goalsAgainst} />
                <SeriesNumberCell value={player.expectedGoalsAgainst}>
                  {player.expectedGoalsAgainst.toFixed(2)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.goalsSavedAboveExpected} highlight signed>
                  {formatSignedDecimal(player.goalsSavedAboveExpected)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.saves} />
                <SeriesNumberCell value={player.savePercentage}>
                  {formatSavePercentage(player.savePercentage)}
                </SeriesNumberCell>
                <SeriesNumberCell value={player.expectedSavePercentage}>
                  {formatSavePercentage(player.expectedSavePercentage)}
                </SeriesNumberCell>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </SortableTable>
  );
}
