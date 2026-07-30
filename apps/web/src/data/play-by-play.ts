import "server-only";

import type {
  GamePlayByPlay,
  PlayByPlayEvent,
  PlayByPlayPlayer,
  PlayByPlayTeam,
} from "@/contracts/play-by-play";
import { query } from "@/data/database";

type EventRow = {
  event_id: number;
  source_event_id: number;
  sort_order: number;
  period_number: number;
  period_type: string;
  time_in_period: string;
  time_in_period_seconds: number | null;
  time_remaining: string;
  situation_code: string | null;
  type_code: number;
  type_desc_key: string;
  owner_nhl_team_id: number | null;
  owner_abbreviation: string | null;
  owner_name: string | null;
  shot_type: string | null;
  reason: string | null;
  secondary_reason: string | null;
  penalty_desc_key: string | null;
  penalty_duration_minutes: number | null;
  away_score: number | null;
  home_score: number | null;
  away_sog: number | null;
  home_sog: number | null;
};

type EventPlayerRow = {
  event_id: number;
  source_player_id: number;
  nhl_player_id: number | null;
  player_name: string | null;
  role: string;
};

export async function getGamePlayByPlay(
  nhlGameId: number,
): Promise<GamePlayByPlay> {
  const [eventRows, playerRows] = await Promise.all([
    query<EventRow>(
      `
        SELECT
          event.id::integer AS event_id,
          event.source_event_id::integer AS source_event_id,
          event.sort_order,
          event.period_number,
          event.period_type,
          event.time_in_period,
          event.time_in_period_seconds,
          event.time_remaining,
          event.situation_code,
          event.type_code,
          event.type_desc_key,
          owner.nhl_id::integer AS owner_nhl_team_id,
          COALESCE(owner_season.abbreviation, owner.abbreviation)
            AS owner_abbreviation,
          COALESCE(owner_season.full_name, owner.name) AS owner_name,
          event.shot_type,
          event.reason,
          event.secondary_reason,
          event.penalty_desc_key,
          event.penalty_duration_minutes,
          event.away_score,
          event.home_score,
          event.away_sog,
          event.home_sog
        FROM game_events AS event
        JOIN games AS game
          ON game.id = event.game_id
        LEFT JOIN teams AS owner
          ON owner.id = event.event_owner_team_id
        LEFT JOIN team_seasons AS owner_season
          ON owner_season.team_id = owner.id
         AND owner_season.season_id = game.season_id
        WHERE game.nhl_id = $1
        ORDER BY event.sort_order
      `,
      [nhlGameId],
    ),
    query<EventPlayerRow>(
      `
        SELECT
          event.id::integer AS event_id,
          participant.source_player_id::integer AS source_player_id,
          player.nhl_id::integer AS nhl_player_id,
          player.display_name AS player_name,
          participant.role
        FROM game_event_players AS participant
        JOIN game_events AS event
          ON event.id = participant.game_event_id
        JOIN games AS game
          ON game.id = event.game_id
        LEFT JOIN players AS player
          ON player.id = participant.player_id
        WHERE game.nhl_id = $1
        ORDER BY event.sort_order, participant.id
      `,
      [nhlGameId],
    ),
  ]);

  const playersByEvent = new Map<number, PlayByPlayPlayer[]>();
  for (const row of playerRows) {
    const players = playersByEvent.get(row.event_id) ?? [];
    players.push({
      sourcePlayerId: row.source_player_id,
      nhlPlayerId: row.nhl_player_id,
      name: row.player_name,
      role: row.role,
    });
    playersByEvent.set(row.event_id, players);
  }

  return {
    nhlGameId,
    events: eventRows.map((row) =>
      mapEvent(row, playersByEvent.get(row.event_id) ?? []),
    ),
  };
}

function mapEvent(
  row: EventRow,
  players: PlayByPlayPlayer[],
): PlayByPlayEvent {
  return {
    sourceEventId: row.source_event_id,
    sortOrder: row.sort_order,
    periodNumber: row.period_number,
    periodType: row.period_type,
    timeInPeriod: row.time_in_period,
    timeInPeriodSeconds: row.time_in_period_seconds,
    timeRemaining: row.time_remaining,
    situationCode: row.situation_code,
    typeCode: row.type_code,
    typeDescription: row.type_desc_key,
    ownerTeam: mapTeam(row),
    shotType: row.shot_type,
    reason: row.reason,
    secondaryReason: row.secondary_reason,
    penaltyDescription: row.penalty_desc_key,
    penaltyDurationMinutes: row.penalty_duration_minutes,
    awayScore: row.away_score,
    homeScore: row.home_score,
    awayShotsOnGoal: row.away_sog,
    homeShotsOnGoal: row.home_sog,
    players,
  };
}

function mapTeam(row: EventRow): PlayByPlayTeam | null {
  return row.owner_nhl_team_id === null ||
    row.owner_abbreviation === null ||
    row.owner_name === null
    ? null
    : {
        nhlTeamId: row.owner_nhl_team_id,
        abbreviation: row.owner_abbreviation,
        name: row.owner_name,
      };
}
