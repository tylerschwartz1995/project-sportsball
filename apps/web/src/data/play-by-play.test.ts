import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/data/database", () => ({
  query: queryMock,
}));

import { getGamePlayByPlay } from "@/data/play-by-play";

describe("play-by-play queries", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("maps chronological events with historical teams and player roles", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          event_id: 91,
          source_event_id: 14,
          sort_order: 28,
          period_number: 1,
          period_type: "REG",
          time_in_period: "03:47",
          time_in_period_seconds: 227,
          time_remaining: "16:13",
          situation_code: "1551",
          type_code: 505,
          type_desc_key: "goal",
          owner_nhl_team_id: 12,
          owner_abbreviation: "CAR",
          owner_name: "Carolina Hurricanes",
          shot_type: "wrist",
          reason: null,
          secondary_reason: null,
          penalty_desc_key: null,
          penalty_duration_minutes: null,
          away_score: 1,
          home_score: 0,
          away_sog: 5,
          home_sog: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          event_id: 91,
          source_player_id: 8479602,
          nhl_player_id: 8479602,
          player_name: "Taylor Hall",
          role: "scorer",
        },
        {
          event_id: 91,
          source_player_id: 8476958,
          nhl_player_id: 8476958,
          player_name: "Jaccob Slavin",
          role: "primary_assist",
        },
      ]);

    const result = await getGamePlayByPlay(2025030416);

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("ORDER BY event.sort_order"),
      [2025030416],
    );
    expect(result).toEqual({
      nhlGameId: 2025030416,
      events: [
        expect.objectContaining({
          sourceEventId: 14,
          typeDescription: "goal",
          ownerTeam: {
            nhlTeamId: 12,
            abbreviation: "CAR",
            name: "Carolina Hurricanes",
          },
          awayScore: 1,
          homeScore: 0,
          players: [
            expect.objectContaining({
              name: "Taylor Hall",
              role: "scorer",
            }),
            expect.objectContaining({
              name: "Jaccob Slavin",
              role: "primary_assist",
            }),
          ],
        }),
      ],
    });
  });

  it("keeps unresolved source participants visible", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          event_id: 10,
          source_event_id: 3,
          sort_order: 3,
          period_number: 1,
          period_type: "REG",
          time_in_period: "00:10",
          time_in_period_seconds: 10,
          time_remaining: "19:50",
          situation_code: null,
          type_code: 502,
          type_desc_key: "faceoff",
          owner_nhl_team_id: null,
          owner_abbreviation: null,
          owner_name: null,
          shot_type: null,
          reason: null,
          secondary_reason: null,
          penalty_desc_key: null,
          penalty_duration_minutes: null,
          away_score: null,
          home_score: null,
          away_sog: null,
          home_sog: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          event_id: 10,
          source_player_id: 9999999,
          nhl_player_id: null,
          player_name: null,
          role: "faceoff_winner",
        },
      ]);

    const result = await getGamePlayByPlay(2005020001);

    expect(result.events[0]).toMatchObject({
      ownerTeam: null,
      players: [
        {
          sourcePlayerId: 9999999,
          nhlPlayerId: null,
          name: null,
          role: "faceoff_winner",
        },
      ],
    });
  });
});
