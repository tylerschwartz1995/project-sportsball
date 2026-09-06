# Repository structure and ownership

Sportsball keeps the web application, Python data work, migrations, and tests in
one repository so changes can be reviewed and validated together. The NHL
application remains the reference implementation. Production deployment, new
sources, a second sport, and prediction targets remain separate product decisions.

## Web organization

```text
apps/web/
  src/
    app/                  Routes, layouts, API handlers
    components/
      ui/                 Shared controls, tables, panels, and URL interaction
      shell/              Navigation, theme, and telemetry
      charts/             Shared chart controls
    features/
      drafts/             Board, outcomes, team/class views, filters, pure logic
      players/            Player presentation and charts
      teams/              Team presentation and schedule context
      games/              Scores, timelines, Game Flow, and shot maps
      history/            Historical record presentation
      playoffs/           Brackets and series presentation
      standings/          Standings plots
      league/             Season/phase controls and league presentation
      analytics/          Advanced workspaces
      lines/              Combination tables
      charts/             Lazy loaders that compose specific feature charts
    data/                 Server-only PostgreSQL queries and caching
    contracts/            Serializable data shapes and identifier validation
    lib/                  Pure reusable calculations and URL parsing
    styles/               Theme tokens, global foundations, stylesheet entry
  eslint/                 Dependency-direction rule and its regression tests
  e2e/                    Fixture smoke checks and full-archive browser checks
```

Routes assemble features and load data. Shared components receive data through
props and do not import features or storage. Contracts have no UI dependencies;
queries never import routes or components. Direct PostgreSQL access belongs in
`data/`. ESLint checks static imports, re-exports, literal dynamic imports, and
`require` calls, resolving both `@/` and relative paths. The `server-only`
imports also protect query modules from client bundles.

The data-bearing routes now delegate to feature-local loaders and views. Player
and team directories, profiles and game logs; games; standings; playoffs; lines;
history; analytics; comparisons; and the home page follow this boundary. Larger
tables and history sections have their own modules. The playoff bracket separates
its dialog, games, player tables, overview, and formatting. Pure draft sorting,
view parsing, and descriptive insight formatting are in `features/drafts/logic.ts`.
The feature-specific lazy chart loader lives in `features/charts/`, because it
knows which hockey charts to load; neutral chart controls live in `components/`.

`styles/tokens.css` is the authoritative dark/light token definition. The root
layout imports `styles/index.css`; it imports shared and feature styles in a
stable order. `styles/presentation.css` holds cross-cutting typography and sizing
rules, not a second theme palette. Some existing selectors intentionally appear
in multiple files for responsive or presentation rules. Preserve this cascade
order when changing them. Color tests inspect the actual active tokens and all
component locations; browser tests check the rendered result in both themes.

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
builds. The web reads them through `data/history/` and `data/schedule-strength.ts`;
it never invokes Python during a request. Source joins, arbitrary interactive
filters, career sums, ordering, pagination, and ratios over stored denominators
remain SQL responsibilities. Browser-specific travel/display calculations stay
in the web layer.

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
integration suite and browser suite remain separate local checks.

## Future consumers

The structured historical explorer should expose validated query contracts over
`data/` and versioned derived data. Ask Sportsball can later translate questions
into these same contracts. It must not generate unrestricted SQL or calculate
official statistics itself. No LLM dependency is needed for this structural work.

Shared UI remains sport-neutral where practical. Introduce sport/league identity
and URL context before ingesting a second sport, using its concrete requirements
rather than widening the NHL schema speculatively. Deployment configuration and
scheduled production writes remain deferred.
