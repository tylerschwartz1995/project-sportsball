"""Normalize NHL play-by-play responses into typed Polars frames."""

import re
from dataclasses import dataclass

import polars as pl

from sportsball.clients.nhl.schemas import PlayByPlayDetails, PlayByPlayResponse

ROSTER_SCHEMA = {
    "source_team_id": pl.Int64,
    "source_player_id": pl.Int64,
    "display_name": pl.String,
    "sweater_number": pl.Int64,
    "position": pl.String,
}
EVENT_SCHEMA = {
    "source_game_id": pl.Int64,
    "source_event_id": pl.Int64,
    "sort_order": pl.Int64,
    "period_number": pl.Int64,
    "period_type": pl.String,
    "time_in_period": pl.String,
    "time_remaining": pl.String,
    "time_in_period_seconds": pl.Int64,
    "time_remaining_seconds": pl.Int64,
    "situation_code": pl.String,
    "home_team_defending_side": pl.String,
    "type_code": pl.Int64,
    "type_desc_key": pl.String,
    "source_event_owner_team_id": pl.Int64,
    "x_coord": pl.Int64,
    "y_coord": pl.Int64,
    "zone_code": pl.String,
    "shot_type": pl.String,
    "reason": pl.String,
    "secondary_reason": pl.String,
    "penalty_type_code": pl.String,
    "penalty_desc_key": pl.String,
    "penalty_duration_minutes": pl.Int64,
    "goal_in_game": pl.Int64,
    "away_score": pl.Int64,
    "home_score": pl.Int64,
    "away_sog": pl.Int64,
    "home_sog": pl.Int64,
}
PARTICIPANT_SCHEMA = {
    "source_event_id": pl.Int64,
    "source_player_id": pl.Int64,
    "role": pl.String,
}
PARTICIPANT_FIELDS = (
    ("scoring_player_id", "scorer"),
    ("assist1_player_id", "primary_assist"),
    ("assist2_player_id", "secondary_assist"),
    ("shooting_player_id", "shooter"),
    ("goalie_in_net_id", "goalie_in_net"),
    ("blocking_player_id", "blocker"),
    ("committed_by_player_id", "penalty_committed_by"),
    ("drawn_by_player_id", "penalty_drawn_by"),
    ("served_by_player_id", "penalty_served_by"),
    ("hitting_player_id", "hitter"),
    ("hittee_player_id", "hittee"),
    ("winning_player_id", "faceoff_winner"),
    ("losing_player_id", "faceoff_loser"),
    ("player_id", "event_player"),
)


@dataclass(frozen=True)
class NormalizedPlayByPlay:
    """Relational frames produced from one play-by-play response."""

    source_game_id: int
    roster: pl.DataFrame
    events: pl.DataFrame
    participants: pl.DataFrame


def play_by_play_frames(response: PlayByPlayResponse) -> NormalizedPlayByPlay:
    """Flatten roster identities, event facts, and player roles."""
    roster_rows = [
        {
            "source_team_id": spot.team_id,
            "source_player_id": spot.player_id,
            "display_name": f"{spot.first_name.default} {spot.last_name.default}".strip(),
            "sweater_number": spot.sweater_number,
            "position": spot.position_code,
        }
        for spot in response.roster_spots
    ]
    event_rows: list[dict[str, object]] = []
    participant_rows: list[dict[str, object]] = []
    for event in response.plays:
        details = event.details
        event_rows.append(
            {
                "source_game_id": response.id,
                "source_event_id": event.event_id,
                "sort_order": event.sort_order,
                "period_number": event.period_descriptor.number,
                "period_type": event.period_descriptor.period_type,
                "time_in_period": event.time_in_period,
                "time_remaining": event.time_remaining,
                "time_in_period_seconds": _clock_seconds(event.time_in_period),
                "time_remaining_seconds": _clock_seconds(event.time_remaining),
                "situation_code": event.situation_code,
                "home_team_defending_side": event.home_team_defending_side,
                "type_code": event.type_code,
                "type_desc_key": event.type_desc_key,
                "source_event_owner_team_id": details.event_owner_team_id,
                "x_coord": details.x_coord,
                "y_coord": details.y_coord,
                "zone_code": details.zone_code,
                "shot_type": details.shot_type,
                "reason": details.reason,
                "secondary_reason": details.secondary_reason,
                "penalty_type_code": details.type_code,
                "penalty_desc_key": details.desc_key,
                "penalty_duration_minutes": details.duration,
                "goal_in_game": details.goal_in_game,
                "away_score": details.away_score,
                "home_score": details.home_score,
                "away_sog": details.away_sog,
                "home_sog": details.home_sog,
            }
        )
        participant_rows.extend(_participant_rows(event.event_id, details))

    return NormalizedPlayByPlay(
        source_game_id=response.id,
        roster=pl.DataFrame(roster_rows, schema=ROSTER_SCHEMA),
        events=pl.DataFrame(event_rows, schema=EVENT_SCHEMA).sort("sort_order"),
        participants=pl.DataFrame(
            participant_rows,
            schema=PARTICIPANT_SCHEMA,
        ).sort("source_event_id", "role"),
    )


def _participant_rows(
    event_id: int,
    details: PlayByPlayDetails,
) -> list[dict[str, object]]:
    return [
        {
            "source_event_id": event_id,
            "source_player_id": player_id,
            "role": role,
        }
        for field, role in PARTICIPANT_FIELDS
        if (player_id := getattr(details, field)) is not None
    ]


def _clock_seconds(value: str) -> int | None:
    if re.fullmatch(r"\d+:\d{2}", value) is None:
        return None
    minutes, seconds = value.split(":", maxsplit=1)
    if not 0 <= int(seconds) < 60:
        return None
    return int(minutes) * 60 + int(seconds)
