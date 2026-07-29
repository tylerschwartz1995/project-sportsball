CONDA_ENV := sportsball
PYTHON := conda run --name $(CONDA_ENV) python
PYTHON_BIN = $(shell $(PYTHON) -c "import sys; print(sys.executable)")
PYTHON_PATHS := pipeline/src pipeline/tests database/migrations

.PHONY: env pipeline-install pipeline-format pipeline-lint pipeline-typecheck
.PHONY: pipeline-test pipeline-check db-up db-down db-migrate web-install
.PHONY: web-dev web-check

env:
	conda env update --file environment.yml --prune

pipeline-install:
	$(PYTHON) -m pip install -e "pipeline[dev]"

pipeline-format:
	$(PYTHON) -m ruff check --fix $(PYTHON_PATHS)
	$(PYTHON) -m ruff format $(PYTHON_PATHS)

pipeline-lint:
	$(PYTHON) -m ruff check $(PYTHON_PATHS)
	$(PYTHON) -m ruff format --check $(PYTHON_PATHS)

pipeline-typecheck:
	$(PYTHON) -m pyright --pythonpath "$(PYTHON_BIN)" pipeline/src pipeline/tests

pipeline-test:
	$(PYTHON) -m pytest pipeline/tests

pipeline-check: pipeline-lint pipeline-typecheck pipeline-test

db-up:
	docker compose up --detach postgres

db-down:
	docker compose down

db-migrate:
	$(PYTHON) -m alembic --config database/alembic.ini upgrade head

web-install:
	npm install --prefix apps/web

web-dev:
	npm run dev --prefix apps/web

web-check:
	npm run lint --prefix apps/web
	npm run typecheck --prefix apps/web
	npm run build --prefix apps/web
