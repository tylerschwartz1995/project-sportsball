import { TableScroll } from "@/components/ui/table-scroll";
import { ResultNavigation } from "@/components/ui/result-navigation";
import { SortableTable } from "@/components/ui/sortable-table";
import type {
  GoalieGameLogEntry,
  SkaterGameLogEntry,
} from "@/contracts/game-log";
import { type PageSlice } from "@/lib/directory";
import { formatDecimal, formatPercentage, formatSavePercentage, formatSigned, formatSignedDecimal, formatTimeOnIce, GoalieSort, SkaterSort } from '../logic';
import { GameIdentityCells, GameTableSection, LogHeaders, NumericCell } from './table-parts';
export function SkaterGameTable({
  gamePage,
  seasonId,
  playerId,
  phase,
  pageSize,
  sort,
  direction,
}: {
  gamePage: PageSlice<SkaterGameLogEntry>;
  seasonId: number;
  playerId: number;
  phase: string;
  pageSize: number;
  sort: SkaterSort;
  direction: "asc" | "desc";
}) {
  return (
    <GameTableSection
      eyebrow="Skater appearances"
      title="All Games"
      detail={`${gamePage.firstItem}–${gamePage.lastItem} of ${gamePage.totalItems} games`}
      note="Game score, individual xG, and on-ice xG% are MoneyPuck all-situations metrics. Advanced player data covers regular-season games from 2008–09 onward."
    >
      <SortableTable secondaryColumns={[2, 10, 12, 13, 15, 16, 17]} initialExpanded={["type", "plusMinus", "hits", "blockedShots", "gameScore", "individualXGoals", "onIceXGoalsPercentage"].includes(sort)} defaultSortKey={sort} defaultDirection={direction} urlBacked scrollTarget="game-log-results">
        <TableScroll className="workspace-table-scroll-viewport">
          <table className="workspace-table-dense workspace-sticky-table-header w-full min-w-[1380px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                <LogHeaders goalie={false} />
              </tr>
            </thead>
            <tbody>
              {gamePage.items.map((game) => (
                <tr
                  key={game.nhlGameId}
                  className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                >
                  <GameIdentityCells game={game} seasonId={seasonId} />
                  <NumericCell value={game.goals} />
                  <NumericCell value={game.assists} />
                  <NumericCell value={game.points} highlight />
                  <NumericCell
                    value={formatSigned(game.plusMinus)}
                    sortValue={game.plusMinus}
                  />
                  <NumericCell value={game.shotsOnGoal} />
                  <NumericCell value={game.hits} />
                  <NumericCell value={game.blockedShots} />
                  <NumericCell
                    value={formatTimeOnIce(game.timeOnIceSeconds)}
                    sortValue={game.timeOnIceSeconds}
                  />
                  <NumericCell
                    value={formatDecimal(game.gameScore)}
                    sortValue={game.gameScore}
                  />
                  <NumericCell
                    value={formatDecimal(game.individualXGoals)}
                    sortValue={game.individualXGoals}
                  />
                  <NumericCell
                    value={formatPercentage(game.onIceXGoalsPercentage)}
                    sortValue={game.onIceXGoalsPercentage}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </SortableTable>
      <ResultNavigation path={`/players/${playerId}/games`} params={{ season: seasonId, phase, sort, direction }} currentPage={gamePage.currentPage} totalPages={gamePage.totalPages} firstItem={gamePage.firstItem} lastItem={gamePage.lastItem} totalItems={gamePage.totalItems} pageSize={pageSize} scrollTarget="game-log-results" />
    </GameTableSection>
  );
}

export function GoalieGameTable({
  gamePage,
  seasonId,
  playerId,
  phase,
  pageSize,
  sort,
  direction,
}: {
  gamePage: PageSlice<GoalieGameLogEntry>;
  seasonId: number;
  playerId: number;
  phase: string;
  pageSize: number;
  sort: GoalieSort;
  direction: "asc" | "desc";
}) {
  return (
    <GameTableSection
      eyebrow="Goalie appearances"
      title="All Games"
      detail={`${gamePage.firstItem}–${gamePage.lastItem} of ${gamePage.totalItems} games`}
      note="Expected goals against and GSAx are MoneyPuck all-situations metrics. Advanced player data covers regular-season games from 2008–09 onward."
    >
      <SortableTable secondaryColumns={[2, 7, 11, 14, 15]} initialExpanded={["type", "starter", "saves", "expectedGoalsAgainst", "goalsSavedAboveExpected"].includes(sort)} defaultSortKey={sort} defaultDirection={direction} urlBacked scrollTarget="game-log-results">
        <TableScroll className="workspace-table-scroll-viewport">
          <table className="workspace-table-dense workspace-sticky-table-header w-full min-w-[1220px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-subtle)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                <LogHeaders goalie />
              </tr>
            </thead>
            <tbody>
              {gamePage.items.map((game) => (
                <tr
                  key={game.nhlGameId}
                  className="border-b border-[var(--border)] text-[var(--foreground-soft)] last:border-0 hover:bg-[var(--surface-subtle)]"
                >
                  <GameIdentityCells game={game} seasonId={seasonId} />
                  <td className="px-3 py-3 text-center">
                    {game.starter ? "Yes" : "No"}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-[var(--foreground)]">
                    {game.decision ?? "—"}
                  </td>
                  <NumericCell value={game.goalsAgainst} />
                  <NumericCell value={game.shotsAgainst} />
                  <NumericCell value={game.saves} />
                  <NumericCell
                    value={formatSavePercentage(game.savePercentage)}
                    sortValue={game.savePercentage}
                    highlight
                  />
                  <NumericCell
                    value={formatTimeOnIce(game.timeOnIceSeconds)}
                    sortValue={game.timeOnIceSeconds}
                  />
                  <NumericCell
                    value={formatDecimal(game.expectedGoalsAgainst)}
                    sortValue={game.expectedGoalsAgainst}
                  />
                  <NumericCell
                    value={formatSignedDecimal(game.goalsSavedAboveExpected)}
                    sortValue={game.goalsSavedAboveExpected}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </SortableTable>
      <ResultNavigation path={`/players/${playerId}/games`} params={{ season: seasonId, phase, sort, direction }} currentPage={gamePage.currentPage} totalPages={gamePage.totalPages} firstItem={gamePage.firstItem} lastItem={gamePage.lastItem} totalItems={gamePage.totalItems} pageSize={pageSize} scrollTarget="game-log-results" />
    </GameTableSection>
  );
}
