# Player profile ingestion

Player profiles enrich the canonical player dimension beyond the display name and
position found in box scores.

Stored fields include:

- first and last name;
- birth date, city, state or province, and country;
- height and weight;
- shoots or catches side;
- active status, current team, sweater number, and player slug;
- draft year, team abbreviation, round, round pick, and overall pick.

Provider-owned fields are nullable because retired, undrafted, and older players may not
have every value.

## Commands

Ingest one known NHL player:

```bash
uv run --project pipeline sportsball ingest-player 8483493
```

Resume all missing profiles:

```bash
uv run --project pipeline sportsball backfill-players
```

Use `--max-players` for a bounded batch and `--retry-failed` to revisit parked failures.
The backfill reports progress every 100 players and is safe to resume.

Every landing response is retained in `source_payloads` before canonical fields are
updated. The source also contains NHL-published season totals; those will be normalized
separately for richer traditional statistics and reconciliation rather than mixed into
the player identity row.
