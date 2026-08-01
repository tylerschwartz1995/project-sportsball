# Sportsball agent working agreement

This file applies to the entire repository. It records how coding agents should
work with this codebase and with Tyler. Read it before planning or changing
anything in a new task.

## Working relationship

- Tyler is building the project while learning parts of the stack. Explain new
  concepts in plain language, but do not stop routine implementation to ask for
  confirmation at every step.
- Inspect the repository, current branch, open pull requests, relevant code,
  tests, and documentation before proposing or making a change.
- Prefer reasonable, reversible assumptions when requirements are clear enough
  to proceed. State an assumption when it materially affects product behavior.
- Continue in the current task unless Tyler asks for a new one. Do not suggest
  starting a new chat merely because the next implementation step is ready.
- Give concise progress updates during longer work and explain the outcome in
  user terms. Tyler should not need to interpret raw command output.
- When asked only to explain, review, diagnose, or plan, remain read-only unless
  Tyler also asks for implementation.

## Standing authorization for implementation tasks

When Tyler asks to implement, fix, update, continue, proceed, or do the next
step, that request authorizes the normal end-to-end repository workflow:

- inspect local files and Git/GitHub state;
- create or switch to an appropriately named branch;
- edit files within the requested scope;
- install already-declared project dependencies when needed;
- run relevant local checks and read-only database queries;
- stage the intended files, commit, and push the branch;
- open or update a pull request;
- review the complete diff and address issues found;
- wait for required CI checks;
- merge the PR when the review has no blockers and CI passes;
- delete the remote and local feature branch; and
- update local `main` with a fast-forward pull.

Do not ask Tyler to grant Git permissions again for those routine actions. Do
not leave a completed, green PR waiting for Tyler to merge unless he explicitly
asks to review or merge it himself.

This standing authorization does not include force-pushing, rewriting shared
history, deleting releases or tags, changing repository settings or access,
publishing secrets, deploying the application, activating scheduled production
writes, purchasing services, or deleting material data. Ask before those
actions unless Tyler explicitly requested the exact action.

## Branch and pull-request workflow

1. Start by running `git status --short --branch` and checking whether the
   current branch has an open PR.
2. Preserve unrelated user changes. Never stage, overwrite, or discard them.
3. If an existing agent PR is complete, review it, fix any blockers, wait for
   CI, merge it, delete its branch, and update `main` before starting dependent
   work.
4. Branch from current `main`. Use `agent/<short-description>` for features and
   documentation or `fix/<short-description>` for focused fixes.
5. Keep each PR focused on one logical change. When Tyler explicitly requests
   separate PRs, merge them sequentially so each later branch starts from the
   newly updated `main`.
6. Stage files explicitly and write a concise commit message describing the
   outcome.
7. Open a ready-for-review PR once implementation and local validation are
   complete. Draft PRs are acceptable only while work is genuinely unfinished.
8. Review the entire diff, not only the last file edited. Check correctness,
   edge cases, data semantics, user experience, theme consistency,
   accessibility, tests, and documentation.
9. If CI fails, diagnose and fix it on the same branch. If CI passes and the
   review has no blockers, merge without asking for another routine approval.
10. Prefer a squash merge for a focused PR unless the existing PR series or
    Tyler requires another method. Always delete the feature branch after
    merging and verify that local `main` is clean and current.

Never use destructive Git commands such as `git reset --hard`, discard someone
else's work, or force-push without explicit authorization.

## Definition of done

A requested code change is not complete merely because the files were edited.
Unless Tyler asks for local-only work, completion means:

- the implementation satisfies the requested behavior;
- relevant tests, lint, type checks, and builds pass;
- the diff has been reviewed and obvious product regressions are addressed;
- affected documentation is current;
- the PR is merged into `main`;
- the feature branch is deleted locally and remotely; and
- the result, PR link, validation, and any real limitation are reported.

If a required check cannot run, explain the exact reason and use the strongest
safe alternative. Do not describe work as fully verified when it was not.

## Repository architecture and conventions

- The web application is Next.js, React, and TypeScript under `apps/web`.
- PostgreSQL is the system of record. Docker Compose provides the local
  database.
- Ingestion, normalization, historical backfills, daily updates, and future
  modelling live in Python under `pipeline`.
- Use `uv` for Python dependency management and command execution.
- Prefer Polars over pandas. Use pandas only at a compatibility boundary where
  another library genuinely requires it.
- Use Python/Polars for feature engineering. Use SQL for schema migrations,
  constraints, indexing, and clear data retrieval rather than large feature
  pipelines.
- No user page may call NHL or MoneyPuck upstream sources while rendering. Web
  reads go through the server-only query layer and local PostgreSQL.
- Ingestion and refresh operations must remain idempotent. Preserve source
  identifiers, coverage boundaries, raw artifacts, and audit history.
- Keep secrets, local databases, caches, downloaded bulk data, backups, and
  trained artifacts out of Git.
- Do not deploy, select paid infrastructure, or enable the scheduled daily
  workflow unless Tyler explicitly returns to the deployment stage.

Read the relevant files in `docs/` before changing ingestion, schemas,
analytics definitions, historical coverage, daily operations, or product
direction. Update the README, roadmap, data documentation, or product backlog
when a change makes them inaccurate.

## Product and interface rules

- Preserve the selected analytical visual system, dark-mode default, light-mode
  support, readable typography, and responsive layouts.
- Use semantic theme tokens instead of hard-coded colors when touching a
  component.
- All user-facing tables containing numeric data must support column sorting
  unless sorting would be misleading. Numeric values should align consistently
  and use tabular numerals.
- Prefer dense, useful tables, lists, and plots over low-information summary
  cards. Do not reintroduce removed dashboard cards without a clear value case.
- Make teams, players, and games clickable when a supporting detail page exists.
- Keep regular-season and playoff data clearly separated and provide phase
  filters wherever both datasets are supported.
- Display source and coverage limitations honestly. Missing data is not zero.
- Keep filters understandable, ordered, and shareable through URL parameters
  where practical.
- Capitalize user-facing page and section titles consistently. Do not expose raw
  NHL identifiers as prominent product copy.
- Design new shared components to remain reasonably sport-neutral, while
  keeping hockey-specific data contracts and terminology explicit. Do not
  prematurely generalize the ingestion model for future sports.
- For visual changes, inspect the running local page at relevant viewport sizes
  when browser tooling is available. Verify behavior as well as appearance.

## Validation guide

Choose checks in proportion to the change. Common commands are:

```bash
make web-check
make pipeline-check
```

Run the web database suite when query behavior changes:

```bash
SPORTSBALL_RUN_WEB_DATABASE_TESTS=1 \
SPORTSBALL_WEB_DATABASE_URL=postgresql://sportsball:sportsball@localhost:5432/sportsball \
npm run test --prefix apps/web
```

For ingestion or migration work, use an isolated test database when tests can
mutate data. Run completeness or health audits after relevant data changes, and
report documented source warnings separately from actual errors.

CI is required before merge. The GitHub checks named `Python pipeline` and
`Web application` must pass unless Tyler explicitly accepts a known exception.

## When to stop and ask

Ask Tyler only when the answer cannot be discovered safely and a reasonable
assumption could materially change the product, cost money, expose data, affect
other people, or cause difficult-to-recover state changes. Examples include:

- choosing a new paid data source or accepting uncertain licensing terms;
- selecting or provisioning hosting infrastructure;
- changing public access, authentication, repository permissions, or secrets;
- deleting or replacing material local data;
- changing the meaning of a published statistic or prediction target; or
- choosing between genuinely different product directions Tyler has not
  already resolved.

Routine Git, GitHub, testing, formatting, local development, and PR completion
are not reasons to stop and ask again.
