-- Synthetic, deliberately small data. Never load into the development archive.
-- The caller runs this file in one transaction after applying real migrations.
DO $$ BEGIN
  IF current_database() NOT LIKE '%\_test' ESCAPE '\' THEN
    RAISE EXCEPTION 'Web fixtures require a database ending in _test';
  END IF;
  IF EXISTS (SELECT 1 FROM games) OR EXISTS (SELECT 1 FROM players) THEN
    RAISE EXCEPTION 'Web fixtures require an empty migrated database';
  END IF;
END $$;

INSERT INTO seasons (id, start_year, end_year) VALUES
  (19171918, 1917, 1918), (20242025, 2024, 2025),
  (20252026, 2025, 2026), (20262027, 2026, 2027);
-- Team identities are seeded by migrations; resolve their internal keys.
CREATE TEMP TABLE fixture_team_ids AS SELECT id, nhl_id FROM teams WHERE nhl_id IN (59, 6);
INSERT INTO team_seasons (team_id, season_id, abbreviation, place_name, common_name, full_name) VALUES
  ((SELECT id FROM fixture_team_ids WHERE nhl_id = 59), 20242025, 'UTA', 'Utah', 'Hockey Club', 'Utah Hockey Club'),
  ((SELECT id FROM fixture_team_ids WHERE nhl_id = 59), 20252026, 'UTA', 'Utah', 'Mammoth', 'Utah Mammoth'),
  ((SELECT id FROM fixture_team_ids WHERE nhl_id = 6), 20242025, 'BOS', 'Boston', 'Bruins', 'Boston Bruins'),
  ((SELECT id FROM fixture_team_ids WHERE nhl_id = 6), 20252026, 'BOS', 'Boston', 'Bruins', 'Boston Bruins');
INSERT INTO players (id, nhl_id, display_name, position, birth_country) VALUES
  (1, 8470001, 'Fixture Skater', 'C', 'CAN'),
  (2, 8470002, 'Historical Skater', 'L', NULL);
INSERT INTO games (id, nhl_id, season_id, game_type, game_date, start_time_utc, state, last_period_type, away_team_id, home_team_id) VALUES
  (1, 2024020001, 20242025, 2, '2024-10-10', '2024-10-10T23:00:00Z', 'OFF', 'REG', (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), (SELECT id FROM fixture_team_ids WHERE nhl_id = 6)),
  (2, 2025020001, 20252026, 2, '2025-10-10', '2025-10-10T23:00:00Z', 'OFF', 'REG', (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), (SELECT id FROM fixture_team_ids WHERE nhl_id = 6)),
  (3, 2025030111, 20252026, 3, '2026-04-20', '2026-04-20T23:00:00Z', 'OFF', 'OT', (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), (SELECT id FROM fixture_team_ids WHERE nhl_id = 59)),
  (4, 2026020001, 20262027, 2, '2026-10-10', '2026-10-10T23:00:00Z', 'FUT', NULL, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), (SELECT id FROM fixture_team_ids WHERE nhl_id = 6));
INSERT INTO team_game_stats (game_id, team_id, is_home, score, shots_on_goal) VALUES
  (1, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), false, 2, 20), (1, (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), true, 1, 25),
  (2, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), false, 3, 30), (2, (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), true, 0, 20),
  (3, (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), false, 2, 25), (3, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), true, 1, 30);
INSERT INTO player_game_stats (game_id, player_id, team_id, position, goals, assists, points, plus_minus, penalty_minutes, hits, power_play_goals, shots_on_goal, blocked_shots, giveaways, takeaways, shifts, time_on_ice_seconds) VALUES
  (2, 1, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), 'C', 1, 2, 3, 2, 0, 1, 0, 4, 0, 1, 1, 20, 1200),
  (3, 1, (SELECT id FROM fixture_team_ids WHERE nhl_id = 59), 'C', 0, 1, 1, -1, 0, 1, 0, 2, 0, 1, 1, 20, 1200);
INSERT INTO team_season_stats (season_id, game_type, team_id, games_played, wins, losses, regulation_wins, overtime_wins, shootout_wins, regulation_losses, overtime_losses, shootout_losses, standings_points, goals_for, goals_against, shots_for, shots_against)
SELECT game.season_id, game.game_type, stats.team_id, 1,
  CASE WHEN stats.score > opponent.score THEN 1 ELSE 0 END,
  CASE WHEN stats.score < opponent.score THEN 1 ELSE 0 END,
  CASE WHEN stats.score > opponent.score AND game.last_period_type = 'REG' THEN 1 ELSE 0 END,
  CASE WHEN stats.score > opponent.score AND game.last_period_type = 'OT' THEN 1 ELSE 0 END,
  0,
  CASE WHEN stats.score < opponent.score AND game.last_period_type = 'REG' THEN 1 ELSE 0 END,
  CASE WHEN stats.score < opponent.score AND game.last_period_type = 'OT' THEN 1 ELSE 0 END,
  0,
  CASE WHEN stats.score > opponent.score THEN 2 WHEN game.last_period_type = 'OT' AND game.game_type = 2 THEN 1 ELSE 0 END,
  stats.score, opponent.score, stats.shots_on_goal, opponent.shots_on_goal
FROM games game JOIN team_game_stats stats ON stats.game_id = game.id
JOIN team_game_stats opponent ON opponent.game_id = game.id AND opponent.team_id <> stats.team_id;
INSERT INTO historical_skater_season_stats (season_id, game_type, player_id, team_abbrevs, games_played, goals, assists, points) VALUES
  (19171918, 2, 2, 'TAN', 10, 5, 2, 7),
  (20252026, 2, 1, 'UTA', 1, 1, 2, 3),
  (20252026, 3, 1, 'UTA', 1, 0, 1, 1);
INSERT INTO draft_selections (nhl_record_id, draft_master_id, draft_year, draft_date, round_number, pick_in_round, overall_pick_number, drafting_team_id, drafting_team_nhl_id, drafting_team_abbrev, original_pick_owner_abbrev, pick_owner_history, player_id, nhl_player_id, player_name, last_name, position, supplemental_draft, removed_outright) VALUES
  (1, 1, 2020, '2020-10-06', 1, 1, 1, (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), 6, 'BOS', 'BOS', 'BOS', 1, 8470001, 'Fixture Skater', 'Skater', 'C', false, false),
  (2, 1, 2020, '2020-10-06', 1, 2, 2, (SELECT id FROM fixture_team_ids WHERE nhl_id = 6), 6, 'BOS', 'BOS', 'BOS', NULL, NULL, 'Fixture Prospect', 'Prospect', 'C', false, false);

INSERT INTO moneypuck_team_game_stats
  (game_id, team_id, opponent_team_id, situation, is_home, playoff_game, game_date,
   ice_time_seconds, x_goals_for, x_goals_against)
SELECT 1, uta.id, bos.id, '5on5', false, false, '2024-10-10', 3000, 0, NULL
FROM fixture_team_ids uta CROSS JOIN fixture_team_ids bos
WHERE uta.nhl_id = 59 AND bos.nhl_id = 6;

-- Keep identity sequences valid for development against this disposable dataset.
SELECT setval(pg_get_serial_sequence('games', 'id'), (SELECT MAX(id) FROM games));
SELECT setval(pg_get_serial_sequence('players', 'id'), (SELECT MAX(id) FROM players));
