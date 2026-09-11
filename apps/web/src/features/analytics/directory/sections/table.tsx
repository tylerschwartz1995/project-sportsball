"use client";
import { TableScroll } from "@/components/ui/table-scroll";

import { useContext } from "react";
import { LeaderboardState } from "../table-state";
import { SortableTable } from "@/components/ui/sortable-table";
import { DataTableShell } from "@/components/ui/ui-primitives";
import type {
  AdvancedGoalieLeaderboardRow,
  AdvancedSkaterLeaderboardRow,
  AdvancedTeamLeaderboardRow,
} from "@/contracts/advanced-leaderboard";
import { LeaderboardRows, LeaderboardType } from '../logic';
import { GoalieLeaderboard, SkaterLeaderboard } from './players';
import { TeamLeaderboard } from './teams';
export function LeaderboardTable({
  type,
  rows,
  seasonId,
  phase,
}: {
  type: LeaderboardType;
  rows: LeaderboardRows;
  seasonId: number;
  phase: "regular" | "playoffs";
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-sm text-[var(--muted)]">
        No records meet the selected situation and ice-time threshold.
      </p>
    );
  }

  if (type === "teams") {
    return (
      <TeamLeaderboard
        rows={rows as AdvancedTeamLeaderboardRow[]}
        seasonId={seasonId}
        phase={phase}
      />
    );
  }
  if (type === "goalies") {
    return (
      <GoalieLeaderboard
        rows={rows as AdvancedGoalieLeaderboardRow[]}
        seasonId={seasonId}
      />
    );
  }
  return (
    <SkaterLeaderboard
      rows={rows as AdvancedSkaterLeaderboardRow[]}
      seasonId={seasonId}
    />
  );
}

export function LeaderboardFrame({
  count,
  description,
  defaultSortKey,
  children,
}: {
  count: number;
  description: string;
  defaultSortKey: string;
  children: React.ReactNode;
}) {
  const controls = useContext(LeaderboardState);
  count = controls?.total ?? count;
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <p>{description}</p>
        <p>{count === 200 ? `Top 200 by ${description === "Goalie results" ? "GSAx" : "Game Score"}; sorting applies to this sample` : `${count} qualifying rows`}</p>
      </div>
      <SortableTable
        defaultSortKey={controls?.sort ?? defaultSortKey}
        defaultDirection={controls?.direction}
        onSortChange={controls?.onSortChange}
      >
        <DataTableShell>
          <TableScroll className="workspace-table-scroll">{children}</TableScroll>
        </DataTableShell>
      </SortableTable>
    </section>
  );
}
