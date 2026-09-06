import "server-only";
import { query } from "@/data/database";

export type CareerSeason = {
  seasonId: number;
  gameType: number;
  kind: "skater" | "goalie";
  teams: string | null;
  games: number;
  goals: number | null;
  assists: number | null;
  points: number | null;
  wins: number | null;
  saves: number | null;
  shotsAgainst: number | null;
};

/** NHL summary totals are already combined across teams; never add detailed splits. */
export async function getPlayerCareer(nhlPlayerId: number): Promise<CareerSeason[]> {
  return query<CareerSeason>(`
    SELECT stats.season_id AS "seasonId", stats.game_type AS "gameType",
      'skater' AS kind, stats.team_abbrevs AS teams, stats.games_played AS games,
      stats.goals, stats.assists, stats.points,
      NULL::integer AS wins, NULL::integer AS saves, NULL::integer AS "shotsAgainst"
    FROM historical_skater_season_stats stats
    JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1
    UNION ALL
    SELECT stats.season_id, stats.game_type, 'goalie', stats.team_abbrevs,
      stats.games_played, NULL, NULL, NULL, stats.wins, stats.saves, stats.shots_against
    FROM historical_goalie_season_stats stats
    JOIN players player ON player.id = stats.player_id
    WHERE player.nhl_id = $1
    ORDER BY "seasonId" DESC, "gameType"
  `, [nhlPlayerId]);
}
