# Database backup and recovery

The database is reproducible from retained sources and upstream downloads, but
a complete rebuild takes substantial time and network traffic. Backups are
therefore required before production activation.

## Current deployment assessment

The local PostgreSQL 18 database was measured on July 30, 2026:

- total database size: approximately 8.5 GB;
- largest tables: event participants, events, MoneyPuck skater games, retained
  source artifacts, retained source payloads, shots, and line combinations;
- all schema changes are represented by Alembic migrations;
- no non-default PostgreSQL extensions are required.

The first full recovery rehearsal on July 30, 2026 produced a 1.7 GB
checksummed archive and restored it successfully into an isolated scratch
database. The restored database reported:

- Alembic revision `20260730_0023`;
- 21 seasons;
- 27,166 games;
- 62,767 ingestion audit records.

The scratch database was removed automatically after verification.

A hosted plan should start with at least 25 GB of database storage so indexes,
daily growth, maintenance operations, and restore testing are not constrained
by the current 8.5 GB snapshot. It must support PostgreSQL 18 or pass an
explicit compatibility restore test before selection.

The provider must also support:

- encrypted external connections from the website and ingestion runner;
- automated backups and point-in-time recovery;
- a documented restore procedure;
- connection limits suitable for the web pool and one ingestion worker;
- storage and compute scaling without a destructive migration;
- access controls that do not require exposing a laptop database.

## Create a local logical backup

The backup script uses PostgreSQL's compressed custom format, excludes
ownership and privilege statements for portability, validates the archive
catalog, and writes a SHA-256 checksum:

```bash
make db-backup
```

Generated files are placed under `backups/` and ignored by Git:

```text
backups/sportsball-YYYYMMDDTHHMMSSZ.dump
backups/sportsball-YYYYMMDDTHHMMSSZ.dump.sha256
```

An incomplete dump remains under a `.partial` name only while the command is
running and is removed if the command fails.

## Verify a backup by restoring it

Archive creation is not sufficient evidence that recovery works. Restore each
release-candidate backup into a temporary scratch database:

```bash
make db-verify-backup \
  BACKUP_PATH=backups/sportsball-YYYYMMDDTHHMMSSZ.dump
```

The verification script:

1. checks the SHA-256 file when present;
2. creates a uniquely named scratch database;
3. restores with `--exit-on-error`;
4. reads the Alembic revision and core row counts;
5. drops the scratch database on success, failure, or interruption.

It never restores over the development `sportsball` database.

## Reconcile interrupted audit records

An operating-system interruption can stop Python before its exception handler
marks an `ingestion_runs` row failed. Preview records older than two hours:

```bash
uv run --project pipeline --frozen sportsball reconcile-abandoned-runs
```

The command only considers an old `running` record safe to reconcile when a
later successful run has the exact same job name and parameters. Apply those
proven reconciliations with:

```bash
uv run --project pipeline --frozen sportsball \
  reconcile-abandoned-runs --apply
```

Applied records become `failed`, keep their original identity and parameters,
record the superseding successful run ID, and receive a reconciliation
timestamp. Unsuperseded records are reported but never modified.

## Production recovery objectives

Initial targets for the personal site are:

- recovery point objective: no more than 24 hours of database changes;
- recovery time objective: restore public read access within four hours;
- daily provider-managed backups;
- at least seven days of point-in-time recovery;
- a logical backup before migrations or material backfills;
- a documented restore test before enabling scheduled ingestion.

Provider-managed backups protect routine operation. Logical custom-format
archives provide portability between providers. They should not share the same
failure domain or credentials.

## Production restore sequence

1. Stop or disable scheduled ingestion.
2. Put the website into maintenance mode or point it at the last healthy
   database.
3. Restore the selected provider snapshot or logical archive into a new
   database rather than overwriting the damaged instance.
4. Apply committed Alembic migrations.
5. Run `check-data-health`.
6. Run the historical completeness audit for the current and affected seasons.
7. Point the website at the restored database.
8. Perform one bounded manual daily update.
9. Re-enable scheduled ingestion only after health remains green.

Never delete the damaged database until the restored instance has passed
health, completeness, and website smoke checks.
