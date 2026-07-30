UV := uv
PYTHON_PATHS := pipeline/src pipeline/tests database/migrations

.PHONY: env pipeline-sync pipeline-lock pipeline-format pipeline-lint pipeline-typecheck
.PHONY: pipeline-test pipeline-check db-up db-down db-migrate web-install
.PHONY: web-dev web-check

env: pipeline-sync

pipeline-sync:
	$(UV) sync --project pipeline --locked

pipeline-lock:
	$(UV) lock --project pipeline

pipeline-format:
	$(UV) run --project pipeline --frozen ruff check --fix $(PYTHON_PATHS)
	$(UV) run --project pipeline --frozen ruff format $(PYTHON_PATHS)

pipeline-lint:
	$(UV) run --project pipeline --frozen ruff check $(PYTHON_PATHS)
	$(UV) run --project pipeline --frozen ruff format --check $(PYTHON_PATHS)

pipeline-typecheck:
	$(UV) run --project pipeline --frozen pyright pipeline/src pipeline/tests

pipeline-test:
	$(UV) run --project pipeline --frozen pytest pipeline/tests

pipeline-check: pipeline-lint pipeline-typecheck pipeline-test

db-up:
	docker compose up --detach postgres

db-down:
	docker compose down

db-migrate:
	$(UV) run --project pipeline --frozen alembic --config database/alembic.ini upgrade head

web-install:
	npm install --prefix apps/web

web-dev:
	npm run dev --prefix apps/web

web-check:
	npm run lint --prefix apps/web
	npm run typecheck --prefix apps/web
	npm run test --prefix apps/web
	npm run build --prefix apps/web
