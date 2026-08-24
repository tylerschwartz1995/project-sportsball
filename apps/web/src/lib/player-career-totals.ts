import type {
  GoalieSeasonSummary,
  SkaterSeasonSummary,
} from "@/contracts/player";

type SkaterCareerTotalRow = Pick<
  SkaterSeasonSummary,
  | "gamesPlayed"
  | "goals"
  | "assists"
  | "points"
  | "plusMinus"
  | "penaltyMinutes"
>;

type GoalieCareerTotalRow = Pick<
  GoalieSeasonSummary,
  | "gamesPlayed"
  | "gamesStarted"
  | "wins"
  | "losses"
  | "overtimeLosses"
  | "saves"
  | "shotsAgainst"
>;

export function skaterCareerTotals(rows: SkaterCareerTotalRow[]) {
  return rows.reduce(
    (totals, row) => ({
      gamesPlayed: totals.gamesPlayed + row.gamesPlayed,
      goals: totals.goals + row.goals,
      assists: totals.assists + row.assists,
      points: totals.points + row.points,
      plusMinus: totals.plusMinus + row.plusMinus,
      penaltyMinutes: totals.penaltyMinutes + row.penaltyMinutes,
    }),
    {
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      points: 0,
      plusMinus: 0,
      penaltyMinutes: 0,
    },
  );
}

export function goalieCareerTotals(rows: GoalieCareerTotalRow[]) {
  const totals = rows.reduce(
    (sum, row) => ({
      gamesPlayed: sum.gamesPlayed + row.gamesPlayed,
      gamesStarted: sum.gamesStarted + row.gamesStarted,
      wins: sum.wins + row.wins,
      losses: sum.losses + row.losses,
      overtimeLosses: sum.overtimeLosses + row.overtimeLosses,
      saves: sum.saves + row.saves,
      shotsAgainst: sum.shotsAgainst + row.shotsAgainst,
    }),
    {
      gamesPlayed: 0,
      gamesStarted: 0,
      wins: 0,
      losses: 0,
      overtimeLosses: 0,
      saves: 0,
      shotsAgainst: 0,
    },
  );

  return {
    ...totals,
    savePercentage:
      totals.shotsAgainst > 0 ? totals.saves / totals.shotsAgainst : null,
  };
}
