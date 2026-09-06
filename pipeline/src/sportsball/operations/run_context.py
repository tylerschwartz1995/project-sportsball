"""Link child ingestion audits to their coordinating run."""

import uuid
from contextvars import ContextVar

parent_run_id: ContextVar[uuid.UUID | None] = ContextVar("parent_run_id", default=None)
