# Repository structure and ownership

Sportsball keeps the web application, Python data work, migrations, and tests in
one repository so changes can be reviewed and validated together. The NHL
application remains the reference implementation. New deployments, sources, a second sport, and prediction targets remain
separate product decisions. The private app is already hosted.

## Web organization

`apps/web/src/app` contains routes and API handlers. Active feature directories
are analytics, charts, games, league, players, standings, and teams.
`components/ui` holds shared controls/tables; `components/shell` owns navigation,
theme, and telemetry. `data` contains server-only queries and caches; `contracts`
contains serializable shapes; `lib` contains pure calculations and URL helpers.

Routes delegate to feature loaders and views. Shared components do not import
features or storage; contracts have no UI dependencies. ESLint enforces these
directions. PostgreSQL access stays in `data`, protected by `server-only`.
The remaining lazy chart loader imports Game Flow only.

`styles/index.css` imports theme tokens, foundations, shared and feature styles,
and the current `reference.css` treatment in a deliberate cascade. Tests cover
shared behavior and deterministic fixtures. Retired full-archive browser suites
have been removed; `e2e/fixture-smoke.spec.ts` and `private-access.spec.ts` are the
maintained desktop/mobile browser checks.

## Python organization

```text
pipeline/src/sportsball/
  cli.py                  Stable command registration
  commands/               NHL, MoneyPuck, analytics, and operations CLI adapters
  clients/                Provider communication and schemas
  ingestion/orchestration/ Fetch/build ordering, transactions, checkpoints
  normalization/          Provider records to canonical observations
  analytics/              Derived calculations over canonical observations
  features/               Point-in-time observation selection
  datasets/               Versioned observation snapshots and manifests
  persistence/
    models/               Base, entities, audit, game/season/official/MoneyPuck mappings
    repositories/         Storage operations, including source artifacts
  reference/              Canonical identities, season ranges, coverage boundaries
  validation/             Completeness and operational data health
  operations/             Recovery operations
```

`persistence.models` re-exports every mapping and registers all metadata for
Alembic. Splitting this package changes neither tables nor migrations. CLI
commands retain their existing flat names. Compatibility imports retain the old
normalization paths for season aggregates and MoneyPuck unit aggregates, while
the implementation and job imports now belong to `analytics/`. Shared season-range
validation and coverage constants live in `reference/`, so audits do not need to
import unrelated ingestion jobs.

## Analytical ownership

| Responsibility | Owner | Examples |
| --- | --- | --- |
| Provider parsing and identity normalization | Python normalization | Source fields, season-aware identities |
| Persisted descriptive calculations | Python analytics | Season totals, line/pairing aggregates, historical windows/era baselines, opponent schedule context |
| Bounded interactive retrieval and aggregation | Web data queries | Filtered rankings, pagination, aggregate ratios over stored era baselines |
| Display transformations and interaction | Web lib/features | Chart windows, sorting, labels, shareable URL state |
| Model inputs and observation-time rules | Python features/datasets | Latest recorded revision available at a cutoff |
| User-facing metric meanings | Metric guide and data-definition docs | Units, denominators, phase, coverage, unavailable values |

`analytics/history.py` owns consecutive peak windows and era baselines;
`analytics/schedule.py` owns pre-game opponent results, independent expected-goal
coverage, prior-season fallbacks, and rest. The definitions are versioned as
`historical-v1` and `schedule-context-v1`. Their derived tables link to audited
builds. Their retired web consumers have been removed. These persisted calculations
and pipeline builds remain pending the separate database dependency review.
The web never invokes Python during a request. Source joins, arbitrary interactive
filters, career sums, ordering, pagination, and ratios over stored denominators
remain SQL responsibilities. Display calculations stay in the web layer.

Run `make analytics-build` after upgrading an existing database or completing
standalone game/schedule/MoneyPuck backfills. Historical summary ingestion rebuilds
all historical windows and rates in the same transaction, including windows
crossing the imported range. The daily coordinator rebuilds schedule context
after source updates. Builds replace only derived output, retain ingestion audit
history, serialize competing builds with transaction-scoped locks, and roll back
fully on failure. They rebuild every stored season so a correction also updates
the next season's fallback. No upstream calls, model training, or predictions are
part of this operation.

The metric guide (`src/lib/metric-definitions.ts`), source/coverage documentation,
and feature contracts must agree on units, denominator, missingness, and phase.
New reusable or predictive metrics require a named definition, version, owner,
source/window requirements, and reference examples before being published. No
published statistic or prediction target is changed by this reorganization.

## Point-in-time dataset foundation

`features.point_in_time.observations_as_of` accepts explicit revision rows with
`entity_id`, `observation_id`, timezone-aware `event_at` and `fetched_at`, and a
SHA-256 `source_checksum`. Adapters must derive `fetched_at` from retained source
provenance. Event time or a claimed historical publication date is not a
substitute for evidence of availability.

For a cutoff, selection requires an event strictly before the cutoff and a
recorded fetch at or before it. It keeps the latest eligible revision per
entity/observation, rejects ambiguous simultaneous revisions, and preserves
unavailable metric values. A historical backfill fetched later is excluded from
an earlier snapshot, even if the game happened years before it.

`datasets.snapshot.build_snapshot` adds an observation window and returns
immutable serialized observations plus a manifest containing dataset and
feature-set names/versions, a caller-defined prediction target, run identity, full
Git revision, cutoff, window start, source checksums, schema, row count, content
hash, and the `recorded-fetch-v1` availability policy. Output refuses to overwrite
an existing directory. Write artifacts under ignored `data/processed/`; a
`manifest.json` is written after the observations and is the completion marker.
An interrupted output directory must not be used as a completed dataset.

Modelling is explicitly deferred. These existing utilities are tested foundations,
not a trained model or an automated
extractor from live tables. A target-specific adapter, feature calculations,
labels, time-based training/evaluation splits, baselines, prediction storage, and
outcome tracking are still required. Existing corrected tables must not be
represented as a complete historical availability archive. Early historical
periods may be usable only for explicitly qualified retrospective experiments.

## Reproducible database checks

`database/fixtures/web.sql` contains synthetic examples of a renamed team,
regular-season and playoff games, future schedule-only games, missing and partial
advanced metrics, an all-time player, and a draft pick without an NHL identity.
It is deliberately independent of the historical archive and external sources.

Create a new disposable database, apply the real migrations, and seed it once:

```bash
docker compose exec -T postgres createdb -U sportsball sportsball_web_test
SPORTSBALL_DATABASE_URL=postgresql+psycopg://sportsball:sportsball@localhost:5432/sportsball_web_test \
  make db-migrate
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball_web_test \
  make web-fixture
SPORTSBALL_DATABASE_URL=postgresql+psycopg://sportsball:sportsball@localhost:5432/sportsball_web_test \
  make analytics-build
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball_web_test \
  make web-test-fixture
```

The seed transaction refuses a database whose name does not end in `_test` and
refuses databases already containing games or players. It never resets or
replaces the development archive. For another seed run, use a fresh disposable
database. The fixture suite reads data without modifying it.

After `make web-check`, run the fixture browser checks with the same database:

```bash
SPORTSBALL_RUN_WEB_FIXTURE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball_web_test \
  npm run test:browser:smoke --prefix apps/web
```

The dedicated smoke configuration starts and stops a production server on port
3100 and runs Chromium at desktop/mobile sizes in both themes. CI uses a fresh
PostgreSQL service, applies migrations, seeds fixtures, builds descriptive analytics with Python, and runs these queries
and browser checks in the required Web application job. The opt-in full-archive
query integration suite remains a separate local check.

## Future consumers

The structured historical explorer should expose validated query contracts over
`data/` and versioned derived data. Ask Sportsball can later translate questions
into these same contracts. It must not generate unrestricted SQL or calculate
official statistics itself. No LLM dependency is needed for this structural work.

Shared UI remains sport-neutral where practical. Introduce sport/league identity
and URL context before ingesting a second sport, using its concrete requirements
rather than widening the NHL schema speculatively. The private website is deployed and daily production ingestion is active.
Monthly backup scheduling remains deferred pending separate approval.
