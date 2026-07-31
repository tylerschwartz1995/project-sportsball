import "server-only";

import type { PlayoffScoringLeader } from "@/contracts/playoffs";
import { query } from "@/data/database";

type PlayoffScoringRow = {
  nhl_player_id: number;
  player_name: string;
  team_abbreviation: string;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
};

export async function getPlayoffScoringLeaders(
  seasonId: number,
  limit = 25,
): Promise<PlayoffScoringLeader[]> {
  const rows = await query<PlayoffScoringRow>(
    `
      SELECT
        player.nhl_id::integer AS nhl_player_id,
        player.display_name AS player_name,
        STRING_AGG(
          DISTINCT COALESCE(team_season.abbreviation, team.abbreviation),
          '/'
        ) AS team_abbreviation,
        COUNT(DISTINCT game.id)::integer AS games_played,
        SUM(stats.goals)::integer AS goals,
        SUM(stats.assists)::integer AS assists,
        SUM(stats.points)::integer AS points
      FROM player_game_stats AS stats
      JOIN players AS player
        ON player.id = stats.player_id
      JOIN games AS game
        ON game.id = stats.game_id
      JOIN teams AS team
        ON team.id = stats.team_id
      LEFT JOIN team_seasons AS team_season
        ON team_season.team_id = team.id
       AND team_season.season_id = game.season_id
      WHERE game.season_id = $1
        AND game.game_type = 3
      GROUP BY player.nhl_id, player.display_name
      ORDER BY points DESC, goals DESC, player_name
      LIMIT $2
    `,
    [seasonId, limit],
  );

  return rows.map((row) => ({
    nhlPlayerId: row.nhl_player_id,
    name: row.player_name,
    teamAbbreviation: row.team_abbreviation,
    gamesPlayed: row.games_played,
    goals: row.goals,
    assists: row.assists,
    points: row.points,
  }));
}
